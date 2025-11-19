import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Province area IDs mapping
const PROVINCE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 32];

const PROVINCE_NAMES_KH = {
  1: "តាកែវ",           // Takeo
  2: "ស្វាយរៀង",        // Svay Rieng
  3: "ស្ទឹងត្រែង",      // Stung Treng
  4: "សៀមរាប",          // Siem Reap
  5: "រតនគីរី",         // Ratanakiri
  6: "ព្រៃវែង",         // Prey Veng
  7: "ព្រះវិហារ",        // Preah Vihear
  8: "ពោធិ៍សាត់",       // Pursat
  9: "ភ្នំពេញ",          // Phnom Penh
  10: "ឧត្ដរមានជ័យ",    // Oddar Meanchey
  11: "មណ្ឌលគីរី",      // Mondulkiri
  12: "ព្រះសីហនុ",       // Preah Sihanouk
  13: "ប៉ៃលិន",         // Pailin
  14: "ក្រចេះ",          // Kratie
  15: "កណ្ដាល",         // Kandal
  16: "កំពត",           // Kampot
  17: "កំពង់ធំ",        // Kampong Thom
  18: "កំពង់ស្ពឺ",      // Kampong Speu
  19: "កំពង់ឆ្នាំង",    // Kampong Chhnang
  20: "កំពង់ចាម",       // Kampong Cham
  21: "កែប",            // Kep
  22: "កោះកុង",         // Koh Kong
  23: "បន្ទាយមានជ័យ",   // Banteay Meanchey
  24: "បាត់ដំបង",       // Battambang
  32: "ត្បូងឃ្មុំ"       // Tboung Khmum
};

const PROVINCE_NAMES_EN = {
  1: "Takeo",
  2: "Svay Rieng",
  3: "Stung Treng",
  4: "Siem Reap",
  5: "Ratanakiri",
  6: "Prey Veng",
  7: "Preah Vihear",
  8: "Pursat",
  9: "Phnom Penh",
  10: "Oddar Meanchey",
  11: "Mondulkiri",
  12: "Preah Sihanouk",
  13: "Pailin",
  14: "Kratie",
  15: "Kandal",
  16: "Kampot",
  17: "Kampong Thom",
  18: "Kampong Speu",
  19: "Kampong Chhnang",
  20: "Kampong Cham",
  21: "Kep",
  22: "Koh Kong",
  23: "Banteay Meanchey",
  24: "Battambang",
  32: "Tboung Khmum"
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to clean up old data (older than 2 weeks)
async function cleanupOldData() {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const cutoffDate = twoWeeksAgo.toISOString();
  
  try {
    // Delete old hourly forecast data
    const { error: hourlyError } = await supabase
      .from('hourly_forecast')
      .delete()
      .lt('created_at', cutoffDate);
    
    if (hourlyError) {
      console.error('Error cleaning up old hourly forecast data:', hourlyError);
    } else {
      console.log('✓ Cleaned up old hourly forecast data');
    }
    
    // Delete old daily forecast data
    const { error: dailyError } = await supabase
      .from('daily_forecast')
      .delete()
      .lt('created_at', cutoffDate);
    
    if (dailyError) {
      console.error('Error cleaning up old daily forecast data:', dailyError);
    } else {
      console.log('✓ Cleaned up old daily forecast data');
    }
  } catch (err) {
    console.error('Cleanup failed:', err);
  }
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to get date for yesterday, today, tomorrow
function getDateForDay(dayString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (dayString === 'Yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday);
  } else if (dayString === 'Today') {
    return formatDate(today);
  } else if (dayString === 'Tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  }
  return formatDate(today);
}

// Function to check if data already exists for today and area
async function checkDuplicateData(areaId) {
  const todayDate = formatDate(new Date());
  
  // Check if we have any forecast data for this area with today's date
  const { data, error } = await supabase
    .from('hourly_forecast')
    .select('id')
    .eq('area_id', areaId)
    .eq('forecast_date', todayDate)
    .limit(1);
  
  if (error) {
    console.error('Error checking for duplicates:', error);
    return false;
  }
  
  return data && data.length > 0;
}

// Function to save or update area info
async function saveAreaInfo(areaId, areaName) {
  // Check if area already exists
  const { data: existing } = await supabase
    .from('areas')
    .select('id')
    .eq('area_id', areaId)
    .single();
  
  if (existing) {
    // Update existing area
    const { error } = await supabase
      .from('areas')
      .update({ name: areaName })
      .eq('area_id', areaId);
    
    if (error) {
      console.error(`Error updating area ${areaId}:`, error);
    }
  } else {
    // Insert new area
    const { error } = await supabase
      .from('areas')
      .insert([{ area_id: areaId, name: areaName }]);
    
    if (error) {
      console.error(`Error inserting area ${areaId}:`, error);
    }
  }
}

// Function to save weather data to Supabase
async function saveWeatherData(areaId, areaName, hourlyForecast, dailyForecast) {
  // Check for duplicates first
  const isDuplicate = await checkDuplicateData(areaId);
  
  if (isDuplicate) {
    console.log(`⚠️  Data for area ${areaId} (${areaName}) already exists today. Skipping.`);
    return { success: false, message: 'Duplicate data' };
  }
  
  try {
    // Save or update area info
    await saveAreaInfo(areaId, areaName);
    
    const currentTime = new Date().toISOString();
    
    // Insert hourly forecast data
    const hourlyRecords = hourlyForecast.map(item => ({
      area_id: areaId,
      forecast_date: getDateForDay(item.day),
      period: item.period,
      humidity: typeof item.humidity === 'string' ? item.humidity : null,
      temperature: typeof item.temperature === 'string' ? item.temperature : null,
      wind_speed: typeof item.windSpeed === 'string' ? item.windSpeed : null,
      wind_direction_value: item.windDirection?.value || null,
      wind_direction_image: item.windDirection?.image || null,
      weather_value: item.weather?.value || null,
      weather_image: item.weather?.image || null,
      created_at: currentTime
    }));
    
    const { error: hourlyError } = await supabase
      .from('hourly_forecast')
      .insert(hourlyRecords);
    
    if (hourlyError) {
      console.error(`Error saving hourly forecast for area ${areaId}:`, hourlyError);
      return { success: false, error: hourlyError };
    }
    
    // Insert daily forecast data
    const dailyRecords = dailyForecast.map(item => ({
      area_id: areaId,
      forecast_date: getDateForDay(item.day),
      max_humidity: item.maxHumidity || null,
      max_temperature: item.maxTemperature || null,
      min_humidity: item.minHumidity || null,
      min_temperature: item.minTemperature || null,
      created_at: currentTime
    }));
    
    const { error: dailyError } = await supabase
      .from('daily_forecast')
      .insert(dailyRecords);
    
    if (dailyError) {
      console.error(`Error saving daily forecast for area ${areaId}:`, dailyError);
      return { success: false, error: dailyError };
    }
    
    console.log(`✓ Successfully saved data for area ${areaId} (${areaName})`);
    return { success: true };
  } catch (err) {
    console.error(`Failed to save weather data for area ${areaId}:`, err);
    return { success: false, error: err };
  }
}

// Function to scrape weather data for a specific area ID
async function scrapeAreaWeather(areaId) {
  return new Promise((resolve, reject) => {
    fetch("http://cambodiameteo.com/forecast", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `menu=116&lang=km&areaid=${areaId}`
    })
    .then(res => res.text())
    .then(async (html) => {
      try {
        const $ = cheerio.load(html);
        
        // Extract area name
        const areaName = $('#select_city option:selected').text().trim();
        
        if (!areaName) {
          console.log(`⚠️  No data found for area ID ${areaId}`);
          resolve({ success: false, areaId });
          return;
        }
        
        // Extract hourly forecast data
        const hourlyForecast = [];
        const days = ['Yesterday', 'Today', 'Tomorrow'];
        const periods = ['Morning', 'Afternoon', 'Night'];
        
        // Get all data rows
        const rows = $('table.WM tr');
        let humidityRow = null;
        let temperatureRow = null;
        let weatherRow = null;
        let windDirectionRow = null;
        let windSpeedRow = null;
        
        rows.each((i, row) => {
          const $row = $(row);
          const firstCell = $row.find('td.cellIntitule1').first().text().trim();
          
          if (firstCell.includes('Humidity')) humidityRow = $row;
          else if (firstCell.includes('Temperature')) temperatureRow = $row;
          else if (firstCell.includes('Weather')) weatherRow = $row;
          else if (firstCell.includes('Wind direction')) windDirectionRow = $row;
          else if (firstCell.includes('Wind speed')) windSpeedRow = $row;
        });
        
        // Extract values from each row
        const extractValues = (row) => {
          if (!row) return [];
          return row.find('td.cellValeur').map((i, cell) => {
            const $cell = $(cell);
            const img = $cell.find('img');
            if (img.length) {
              return {
                value: img.attr('title') || img.attr('src'),
                image: img.attr('src')
              };
            }
            return $cell.text().trim();
          }).get();
        };
        
        const humidityValues = extractValues(humidityRow);
        const temperatureValues = extractValues(temperatureRow);
        const weatherValues = extractValues(weatherRow);
        const windDirectionValues = extractValues(windDirectionRow);
        const windSpeedValues = extractValues(windSpeedRow);
        
        // Structure hourly forecast (9 values: 3 days × 3 periods)
        days.forEach((day, dayIndex) => {
          periods.forEach((period, periodIndex) => {
            const index = dayIndex * 3 + periodIndex;
            hourlyForecast.push({
              day: day,
              period: period,
              humidity: humidityValues[index] || null,
              temperature: temperatureValues[index] || null,
              weather: weatherValues[index] || null,
              windDirection: windDirectionValues[index] || null,
              windSpeed: windSpeedValues[index] || null
            });
          });
        });
        
        // Extract daily forecast data
        const dailyForecast = [];
        // Find the second table with class WM (Daily Forecast table)
        const dailyTable = $('table.WM').filter((i, table) => {
          return $(table).find('h1.titreTableau').text().trim().includes('Daily Forecast');
        }).first();
        
        const dailyRows = dailyTable.find('tr');
        
        let maxHumidityRow = null;
        let maxTempRow = null;
        let minHumidityRow = null;
        let minTempRow = null;
        
        dailyRows.each((i, row) => {
          const $row = $(row);
          const firstCell = $row.find('td.cellIntitule1').first().text().trim();
          
          if (firstCell.toLowerCase().includes('max humidity')) maxHumidityRow = $row;
          else if (firstCell.toLowerCase().includes('max temperature')) maxTempRow = $row;
          else if (firstCell.toLowerCase().includes('min humidity')) minHumidityRow = $row;
          else if (firstCell.toLowerCase().includes('min temperature')) minTempRow = $row;
        });
        
        const maxHumidityValues = maxHumidityRow ? maxHumidityRow.find('td.cellValeur').map((i, cell) => $(cell).text().trim()).get() : [];
        const maxTempValues = maxTempRow ? maxTempRow.find('td.cellValeur').map((i, cell) => $(cell).text().trim()).get() : [];
        const minHumidityValues = minHumidityRow ? minHumidityRow.find('td.cellValeur').map((i, cell) => $(cell).text().trim()).get() : [];
        const minTempValues = minTempRow ? minTempRow.find('td.cellValeur').map((i, cell) => $(cell).text().trim()).get() : [];
        
        days.forEach((day, index) => {
          dailyForecast.push({
            day: day,
            maxHumidity: maxHumidityValues[index] || null,
            maxTemperature: maxTempValues[index] || null,
            minHumidity: minHumidityValues[index] || null,
            minTemperature: minTempValues[index] || null
          });
        });
        
        // Save to Supabase
        const result = await saveWeatherData(areaId, areaName, hourlyForecast, dailyForecast);
        resolve({ success: result.success, areaId, areaName });
      } catch (err) {
        console.error(`Error processing area ${areaId}:`, err);
        reject(err);
      }
    })
    .catch(err => {
      console.error(`Error fetching area ${areaId}:`, err);
      reject(err);
    });
  });
}

// Main function to scrape all areas
async function scrapeAllAreas() {
  console.log(`🌤️  Starting weather scraper for all ${PROVINCE_IDS.length} provinces...\n`);
  
  // Run cleanup on startup
  await cleanupOldData();
  console.log('');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  // Loop through all province area IDs (1-24, 32)
  for (const areaId of PROVINCE_IDS) {
    try {
      const provinceName = PROVINCE_NAMES_EN[areaId] || `Area ${areaId}`;
      console.log(`📍 Scraping area ID ${areaId} (${provinceName})...`);
      const result = await scrapeAreaWeather(areaId);
      
      if (result.success) {
        successCount++;
      } else {
        skipCount++;
      }
      
      // Add a small delay between requests to avoid overloading the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`❌ Failed to scrape area ${areaId}:`, err.message);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Scraping Summary:');
  console.log(`   Total provinces: ${PROVINCE_IDS.length}`);
  console.log(`   ✓ Successful: ${successCount}`);
  console.log(`   ⚠️  Skipped (duplicates): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('='.repeat(50));
}

// Run the scraper
scrapeAllAreas()
  .then(() => {
    console.log('\n✅ Weather scraping completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Weather scraping failed:', err);
    process.exit(1);
  });
