// Supabase Edge Function for Weather Scraping
// This runs on Deno (not Node.js), so we use Deno-compatible imports

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';

// Province area IDs mapping
const PROVINCE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 32];

const PROVINCE_NAMES_EN: Record<number, string> = {
  1: "Takeo", 2: "Svay Rieng", 3: "Stung Treng", 4: "Siem Reap",
  5: "Ratanakiri", 6: "Prey Veng", 7: "Preah Vihear", 8: "Pursat",
  9: "Phnom Penh", 10: "Oddar Meanchey", 11: "Mondulkiri", 12: "Preah Sihanouk",
  13: "Pailin", 14: "Kratie", 15: "Kandal", 16: "Kampot",
  17: "Kampong Thom", 18: "Kampong Speu", 19: "Kampong Chhnang", 20: "Kampong Cham",
  21: "Kep", 22: "Koh Kong", 23: "Banteay Meanchey", 24: "Battambang",
  32: "Tboung Khmum"
};

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to get date for Today, Tomorrow, or DayAfter (columns are today, tomorrow, day after)
function getDateForDay(dayString: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dayString === 'Today') {
    return formatDate(today);
  } else if (dayString === 'Tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  } else if (dayString === 'DayAfter') {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return formatDate(dayAfter);
  }
  return formatDate(today);
}

serve(async (req) => {
  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🌤️  Starting weather scraper...');

    // Cleanup old data (older than 2 weeks)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    await supabase.from('hourly_forecast').delete().lt('created_at', twoWeeksAgo.toISOString());
    await supabase.from('daily_forecast').delete().lt('created_at', twoWeeksAgo.toISOString());

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Scrape all provinces
    for (const areaId of PROVINCE_IDS) {
      try {
        const provinceName = PROVINCE_NAMES_EN[areaId] || `Area ${areaId}`;
        console.log(`📍 Scraping ${provinceName} (ID: ${areaId})...`);

        // Fetch weather data
        const response = await fetch("http://cambodiameteo.com/forecast", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `menu=116&lang=km&areaid=${areaId}`
        });

        const html = await response.text();
        const $ = cheerio.load(html);
        
        const areaName = $('#select_city option:selected').text().trim();
        if (!areaName) {
          console.log(`⚠️  No data for area ${areaId}`);
          skipCount++;
          continue;
        }

        // Check for duplicates
        const todayDate = formatDate(new Date());
        const { data: existing } = await supabase
          .from('hourly_forecast')
          .select('id')
          .eq('area_id', areaId)
          .eq('forecast_date', todayDate)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`⚠️  Data exists for ${provinceName}`);
          skipCount++;
          continue;
        }

        // Extract data (columns correspond to today, tomorrow, day after)
        const days = ['Today', 'Tomorrow', 'DayAfter'];
        const periods = ['Morning', 'Afternoon', 'Night'];
        const rows = $('table.WM tr');
        
        let humidityRow: any = null, temperatureRow: any = null, weatherRow: any = null;
        let windDirectionRow: any = null, windSpeedRow: any = null;
        
        rows.each((i: number, row: any) => {
          const $row = $(row);
          const firstCell = $row.find('td.cellIntitule1').first().text().trim();
          
          if (firstCell.includes('Humidity')) humidityRow = $row;
          else if (firstCell.includes('Temperature')) temperatureRow = $row;
          else if (firstCell.includes('Weather')) weatherRow = $row;
          else if (firstCell.includes('Wind direction')) windDirectionRow = $row;
          else if (firstCell.includes('Wind speed')) windSpeedRow = $row;
        });

        const extractValues = (row: any) => {
          if (!row) return [];
          return row.find('td.cellValeur').map((i: number, cell: any) => {
            const $cell = $(cell);
            const img = $cell.find('img');
            if (img.length) {
              return { value: img.attr('title') || img.attr('src'), image: img.attr('src') };
            }
            return $cell.text().trim();
          }).get();
        };

        const humidityValues = extractValues(humidityRow);
        const temperatureValues = extractValues(temperatureRow);
        const weatherValues = extractValues(weatherRow);
        const windDirectionValues = extractValues(windDirectionRow);
        const windSpeedValues = extractValues(windSpeedRow);

        // Build hourly forecast records
        const hourlyRecords = [];
        days.forEach((day, dayIndex) => {
          periods.forEach((period, periodIndex) => {
            const index = dayIndex * 3 + periodIndex;
            const weather = weatherValues[index];
            const windDir = windDirectionValues[index];
            
            hourlyRecords.push({
              area_id: areaId,
              forecast_date: getDateForDay(day),
              period: period,
              humidity: typeof humidityValues[index] === 'string' ? humidityValues[index] : null,
              temperature: typeof temperatureValues[index] === 'string' ? temperatureValues[index] : null,
              wind_speed: typeof windSpeedValues[index] === 'string' ? windSpeedValues[index] : null,
              wind_direction_value: typeof windDir === 'object' ? windDir.value : null,
              wind_direction_image: typeof windDir === 'object' ? windDir.image : null,
              weather_value: typeof weather === 'object' ? weather.value : null,
              weather_image: typeof weather === 'object' ? weather.image : null,
            });
          });
        });

        // Extract daily forecast
        const dailyTable = $('table.WM').filter((i: number, table: any) => {
          return $(table).find('h1.titreTableau').text().trim().includes('Daily Forecast');
        }).first();
        
        const dailyRows = dailyTable.find('tr');
        let maxHumidityRow: any = null, maxTempRow: any = null;
        let minHumidityRow: any = null, minTempRow: any = null;
        
        dailyRows.each((i: number, row: any) => {
          const $row = $(row);
          const firstCell = $row.find('td.cellIntitule1').first().text().trim();
          
          if (firstCell.toLowerCase().includes('max humidity')) maxHumidityRow = $row;
          else if (firstCell.toLowerCase().includes('max temperature')) maxTempRow = $row;
          else if (firstCell.toLowerCase().includes('min humidity')) minHumidityRow = $row;
          else if (firstCell.toLowerCase().includes('min temperature')) minTempRow = $row;
        });

        const maxHumidityValues = maxHumidityRow ? maxHumidityRow.find('td.cellValeur').map((i: number, cell: any) => $(cell).text().trim()).get() : [];
        const maxTempValues = maxTempRow ? maxTempRow.find('td.cellValeur').map((i: number, cell: any) => $(cell).text().trim()).get() : [];
        const minHumidityValues = minHumidityRow ? minHumidityRow.find('td.cellValeur').map((i: number, cell: any) => $(cell).text().trim()).get() : [];
        const minTempValues = minTempRow ? minTempRow.find('td.cellValeur').map((i: number, cell: any) => $(cell).text().trim()).get() : [];

        const dailyRecords = days.map((day, index) => ({
          area_id: areaId,
          forecast_date: getDateForDay(day),
          max_humidity: maxHumidityValues[index] || null,
          max_temperature: maxTempValues[index] || null,
          min_humidity: minHumidityValues[index] || null,
          min_temperature: minTempValues[index] || null,
        }));

        // Save area info
        const { data: existingArea } = await supabase
          .from('areas')
          .select('id')
          .eq('area_id', areaId)
          .single();

        if (!existingArea) {
          await supabase.from('areas').insert([{ area_id: areaId, name: areaName }]);
        }

        // Insert data
        await supabase.from('hourly_forecast').insert(hourlyRecords);
        await supabase.from('daily_forecast').insert(dailyRecords);

        console.log(`✓ Saved ${provinceName}`);
        successCount++;

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`❌ Error scraping area ${areaId}:`, err);
        errorCount++;
      }
    }

    const summary = {
      status: 'completed',
      total: PROVINCE_IDS.length,
      successful: successCount,
      skipped: skipCount,
      errors: errorCount,
      timestamp: new Date().toISOString()
    };

    console.log('📊 Summary:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

