/**
 * Weather scraping service
 * Handles fetching and parsing weather data from cambodiameteo.com
 */
import * as cheerio from 'cheerio';
import { supabase } from '../config/database.js';
import { PROVINCE_IDS, PROVINCE_NAMES_EN } from '../constants/provinces.js';
import { formatDate, getDateForDay, getISODaysAgo } from '../utils/dateHelpers.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';

const logger = createLogger('WeatherScraperService');

// Khmer translations for period and wind direction values.
const PERIOD_MAP = {
  morning: 'ព្រឹក',
  afternoon: 'ថ្ងៃ',
  night: 'យប់',
  'ព្រឹក': 'ព្រឹក',
  'ថ្ងៃ': 'ថ្ងៃ',
  'យប់': 'យប់'
};

const WIND_DIR_MAP = {
  west: 'លិច',
  east: 'កើត',
  north: 'ជើង',
  south: 'ត្បូង',
  'north east': 'ភាគឦសាន',
  northeast: 'ភាគឦសាន',
  'south east': 'ភាគអាគ្នេយ៍',
  southeast: 'ភាគអាគ្នេយ៍',
  'north west': 'ភាគពាយ័ព្យ',
  northwest: 'ភាគពាយ័ព្យ',
  'south west': 'ភាគនិរតី',
  southwest: 'ភាគនិរតី',
  'ភាគឦសាន': 'ភាគឦសាន',
  'ភាគអាគ្នេយ៍': 'ភាគអាគ្នេយ៍',
  'ភាគពាយ័ព្យ': 'ភាគពាយ័ព្យ',
  'ភាគនិរតី': 'ភាគនិរតី'
};

function translatePeriod(raw) {
  if (!raw && raw !== '') return raw;
  const key = String(raw).trim().toLowerCase();
  return PERIOD_MAP[key] || raw;
}

function translateWindDirection(raw) {
  if (!raw && raw !== '') return raw;
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  return WIND_DIR_MAP[key] || raw;
}

/**
 * Clean up old weather data from database
 * Removes data older than configured retention days
 */
export async function cleanupOldData() {
  const cutoffDate = getISODaysAgo(config.scraper.dataRetentionDays);

  try {
    const { error: hourlyError } = await supabase
      .from('hourly_forecast')
      .delete()
      .lt('created_at', cutoffDate);

    if (hourlyError) throw hourlyError;

    const { error: dailyError } = await supabase
      .from('daily_forecast')
      .delete()
      .lt('created_at', cutoffDate);

    if (dailyError) throw dailyError;

    logger.success('Cleaned up old data');
    return { success: true };
  } catch (error) {
    logger.error('Failed to cleanup old data:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check if data already exists for given area and date
 * @param {number} areaId - Province area ID
 * @returns {Promise<boolean>}
 */
export async function checkDuplicateData(areaId) {
  const todayDate = formatDate(new Date());

  try {
    const { data, error} = await supabase
      .from('hourly_forecast')
      .select('id')
      .eq('area_id', areaId)
      .eq('forecast_date', todayDate)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    logger.error('Error checking for duplicates:', error.message);
    return false;
  }
}

/**
 * Save or update area information
 * @param {number} areaId - Province area ID
 * @param {string} areaName - Province name
 */
export async function saveAreaInfo(areaId, areaName) {
  try {
    const { data: existing } = await supabase
      .from('areas')
      .select('id')
      .eq('area_id', areaId)
      .single();

    if (existing) {
      await supabase.from('areas').update({ name: areaName }).eq('area_id', areaId);
    } else {
      await supabase.from('areas').insert([{ area_id: areaId, name: areaName }]);
    }
  } catch (error) {
    logger.error(`Failed to save area info for ${areaId}:`, error.message);
  }
}

/**
 * Parse hourly forecast data from HTML table
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {number} areaId - Province area ID
 * @returns {Array} Array of hourly forecast records
 */
function parseHourlyForecast($, areaId) {
  const hourlyData = [];

  // Primary parser (legacy selectors)
  $('.table-hover tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 8) return;

    const dayText = $(cells[0]).text().trim();
    const rawPeriod = $(cells[1]).text().trim();
    const period = translatePeriod(rawPeriod);
    const forecastDate = getDateForDay(dayText);

    const rawWindDir = $(cells[5]).text().trim();
    const windDirValue = translateWindDirection(rawWindDir);

    const record = {
      area_id: areaId,
      forecast_date: forecastDate,
      period: period,
      humidity: $(cells[2]).text().trim(),
      temperature: $(cells[3]).text().trim(),
      wind_speed: $(cells[4]).text().trim(),
      wind_direction_value: windDirValue,
      wind_direction_image: $(cells[5]).find('img').attr('src') || null,
      weather_value: $(cells[6]).text().trim(),
      weather_image: $(cells[7]).find('img').attr('src') || null,
    };

    hourlyData.push(record);
  });

  if (hourlyData.length > 0) return hourlyData;

  // Fallback parser for table.WM structure (site updated)
  logger.info(`Using WM parser for area ${areaId}`);

  const periods = ['Morning', 'Afternoon', 'Night'];
  
  // Find the HOURLY forecast WM table specifically (not daily or other WM tables)
  let hourlyWMTable = null;
  $('table.WM').each((i, table) => {
    const $table = $(table);
    const title = $table.find('h1.titreTableau').text().trim().toLowerCase();
    // Match hourly forecast title (English or Khmer)
    if (title.includes('hourly') || title.includes('ការព្យាករណ៍ប្រចាំម៉ោង')) {
      hourlyWMTable = $table;
      return false; // break
    }
  });

  // If no titled table found, find the WM table that contains the nested hourly table
  if (!hourlyWMTable || !hourlyWMTable.length) {
    $('table.WM').each((i, table) => {
      const $table = $(table);
      // Check if this table contains a nested WM table with hourly data
      const nestedWM = $table.find('table.WM').first();
      if (nestedWM.length && nestedWM.find('td.cellValeur').length >= 9) {
        hourlyWMTable = nestedWM;
        return false; // break
      }
    });
  }

  if (!hourlyWMTable || !hourlyWMTable.length) {
    logger.warn(`Could not find hourly WM table for area ${areaId}`);
    return hourlyData;
  }

  const rows = hourlyWMTable.find('tr');

  let humidityRow = null,
    temperatureRow = null,
    weatherRow = null,
    windDirectionRow = null,
    windSpeedRow = null;

  rows.each((i, row) => {
    const $row = $(row);
    const firstCell = $row.find('td.cellIntitule1').first().text().trim().toLowerCase();

    if (firstCell.includes('humidity') || firstCell.includes('សំណើម')) humidityRow = $row;
    else if (firstCell.includes('temperature') || firstCell.includes('សីតុណ្ហភាព')) temperatureRow = $row;
    else if (firstCell.includes('weather') || firstCell.includes('អាកាស')) weatherRow = $row;
    else if (firstCell.includes('wind direction') || firstCell.includes('ទិសដៅ')) windDirectionRow = $row;
    else if (firstCell.includes('wind speed') || firstCell.includes('ល្បឿន')) windSpeedRow = $row;
  });

  // Helper to normalize values (treat "-", empty, nbsp as null)
  const normalizeValue = val => {
    if (!val || val === '-' || val === '—' || val.replace(/\s+/g, '') === '') return null;
    return val;
  };

  const extractValues = row => {
    if (!row) return [];
    return row
      .find('td.cellValeur')
      .map((i, cell) => {
        const $cell = $(cell);
        const img = $cell.find('img');
        if (img.length) {
          const title = img.attr('title') || '';
          const src = img.attr('src') || '';
          // If no title, derive from filename
          const value = title || src.split('/').pop().replace(/\.(png|jpg|jpeg|gif)$/i, '').replace(/[-_]/g, ' ');
          return { value: normalizeValue(value), image: src };
        }
        return normalizeValue($cell.text().trim());
      })
      .get();
  };

  const humidityValues = extractValues(humidityRow);
  const temperatureValues = extractValues(temperatureRow);
  const weatherValues = extractValues(weatherRow);
  const windDirectionValues = extractValues(windDirectionRow);
  const windSpeedValues = extractValues(windSpeedRow);

  // Use today's date as base; columns represent today, tomorrow, day after tomorrow
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  // Log extracted counts for debugging
  logger.info(`WM parser extracted arrays for area ${areaId}:`, {
    humidity: humidityValues.length,
    temperature: temperatureValues.length,
    weather: weatherValues.length,
    windDir: windDirectionValues.length,
    windSpeed: windSpeedValues.length,
  });

  // Build records: 3 days × 3 periods = 9 total
  for (let dayIndex = 0; dayIndex < 3; dayIndex++) {
    for (let periodIndex = 0; periodIndex < 3; periodIndex++) {
      const index = dayIndex * 3 + periodIndex;
      if (index >= humidityValues.length && index >= temperatureValues.length) {
        logger.warn(`Skipping day ${dayIndex} period ${periodIndex} for area ${areaId} - insufficient data`);
        continue;
      }

      const weather = weatherValues[index];
      const windDir = windDirectionValues[index];
      const forecastDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + dayIndex);

      hourlyData.push({
        area_id: areaId,
        forecast_date: formatDate(forecastDate),
        period: translatePeriod(periods[periodIndex]),
        humidity: typeof humidityValues[index] === 'string' ? humidityValues[index] : null,
        temperature: typeof temperatureValues[index] === 'string' ? temperatureValues[index] : null,
        wind_speed: typeof windSpeedValues[index] === 'string' ? windSpeedValues[index] : null,
        wind_direction_value:
          typeof windDir === 'object'
            ? translateWindDirection(windDir.value)
            : typeof windDir === 'string'
            ? translateWindDirection(windDir)
            : null,
        wind_direction_image: typeof windDir === 'object' ? windDir.image : null,
        weather_value: typeof weather === 'object' ? weather.value : null,
        weather_image: typeof weather === 'object' ? weather.image : null,
      });
    }
  }

  return hourlyData;
}

/**
 * Parse daily forecast data from HTML table
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {number} areaId - Province area ID
 * @returns {Array} Array of daily forecast records
 */
function parseDailyForecast($, areaId) {
  const dailyData = [];

  // Primary parser (legacy selectors)
  $('.table-bordered.table-info tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 5) return;

    const dayText = $(cells[0]).text().trim();
    const forecastDate = getDateForDay(dayText);

    const record = {
      area_id: areaId,
      forecast_date: forecastDate,
      max_humidity: $(cells[1]).text().trim(),
      max_temperature: $(cells[2]).text().trim(),
      min_humidity: $(cells[3]).text().trim(),
      min_temperature: $(cells[4]).text().trim(),
    };

    dailyData.push(record);
  });

  if (dailyData.length > 0) return dailyData;

  // Fallback parser for table.WM daily forecast (columns = today, tomorrow, day after)
  logger.info(`Using WM daily parser for area ${areaId}`);

  const days = ['Today', 'Tomorrow', 'DayAfter'];

  const dailyTable = $('table.WM')
    .filter((i, table) => {
      const title = $(table).find('h1.titreTableau').text().trim().toLowerCase();
      return title.includes('daily') || title.includes('ព្យាករណ៍ជារៀងរាល់ថ្ងៃ');
    })
    .first();

  if (dailyTable && dailyTable.length) {
    const dailyRows = dailyTable.find('tr');
    let maxHumidityRow = null,
      maxTempRow = null,
      minHumidityRow = null,
      minTempRow = null;

    dailyRows.each((i, row) => {
      const $row = $(row);
      const firstCell = $row.find('td.cellIntitule1').first().text().trim().toLowerCase();

      if (firstCell.includes('អតិបរមា') && firstCell.includes('សំណើម')) maxHumidityRow = $row;
      else if (firstCell.includes('អតិបរមា') && firstCell.includes('សីតុណ្ហភាព')) maxTempRow = $row;
      else if (firstCell.includes('អប្បបរមា') && firstCell.includes('សំណើម')) minHumidityRow = $row;
      else if (firstCell.includes('អប្បបរមា') && firstCell.includes('សីតុណ្ហភាព')) minTempRow = $row;
      else if (firstCell.includes('max humidity')) maxHumidityRow = $row;
      else if (firstCell.includes('max temperature')) maxTempRow = $row;
      else if (firstCell.includes('min humidity')) minHumidityRow = $row;
      else if (firstCell.includes('min temperature')) minTempRow = $row;
    });

    const readValues = row => (row ? row.find('td.cellValeur').map((i, cell) => $(cell).text().trim()).get() : []);

    const maxHumidityValues = readValues(maxHumidityRow);
    const maxTempValues = readValues(maxTempRow);
    const minHumidityValues = readValues(minHumidityRow);
    const minTempValues = readValues(minTempRow);

    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    days.forEach((day, idx) => {
      const forecastDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + idx);
      dailyData.push({
        area_id: areaId,
        forecast_date: formatDate(forecastDate),
        max_humidity: maxHumidityValues[idx] || null,
        max_temperature: maxTempValues[idx] || null,
        min_humidity: minHumidityValues[idx] || null,
        min_temperature: minTempValues[idx] || null,
      });
    });
  }

  return dailyData;
}

/**
 * Scrape weather data for a specific area
 * @param {number} areaId - Province area ID
 * @returns {Promise<Object>} Scraping result
 */
export async function scrapeAreaWeather(areaId) {
  const provinceName = PROVINCE_NAMES_EN[areaId] || `Area ${areaId}`;

  try {
    logger.info(`Scraping ${provinceName} (ID: ${areaId})...`);

    // Delete existing data for this area to avoid duplicates (fresh scrape each time)
    try {
      await supabase.from('hourly_forecast').delete().eq('area_id', areaId);
      await supabase.from('daily_forecast').delete().eq('area_id', areaId);
    } catch (err) {
      logger.warn(`Failed to delete old data for ${provinceName}:`, err.message);
    }

    // Fetch weather data
    const response = await fetch(config.scraper.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `menu=116&lang=km&areaid=${areaId}`,
      signal: AbortSignal.timeout(config.scraper.requestTimeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Get area name from page
    const areaName = $('#select_city option:selected').text().trim();
    if (!areaName) {
      logger.warn(`No data available for ${provinceName}`);
      return { success: false, error: 'No data available', areaId, provinceName };
    }

    // Save area info
    await saveAreaInfo(areaId, areaName);

    // Parse forecast data
    const hourlyData = parseHourlyForecast($, areaId);
    const dailyData = parseDailyForecast($, areaId);

    // Debug: log supabase config presence and record counts before inserting
    logger.info('Supabase debug', {
      supabaseUrl: config?.supabase?.url || process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hourlyRecordsToInsert: hourlyData.length,
      dailyRecordsToInsert: dailyData.length,
    });

    // Save to database (log insert responses for diagnostics)
    if (hourlyData.length > 0) {
      const { data: hourlyInserted, error: hourlyError } = await supabase
        .from('hourly_forecast')
        .insert(hourlyData);

      logger.info('hourly_forecast insert result', {
        insertedCount: hourlyInserted?.length ?? 0,
        error: hourlyError || null,
      });

      if (hourlyError) throw hourlyError;
    }

    if (dailyData.length > 0) {
      const { data: dailyInserted, error: dailyError } = await supabase
        .from('daily_forecast')
        .insert(dailyData);

      logger.info('daily_forecast insert result', {
        insertedCount: dailyInserted?.length ?? 0,
        error: dailyError || null,
      });

      if (dailyError) throw dailyError;
    }

    logger.success(`Successfully scraped ${provinceName}`);
    return {
      success: true,
      areaId,
      provinceName,
      hourlyRecords: hourlyData.length,
      dailyRecords: dailyData.length,
    };
  } catch (error) {
    logger.error(`Failed to scrape ${provinceName}:`, error.message);
    return { success: false, error: error.message, areaId, provinceName };
  }
}

/**
 * Scrape weather data for all provinces
 * @returns {Promise<Object>} Overall scraping result
 */
export async function scrapeAllAreas() {
  logger.info('Starting weather scraping for all areas...');

  // Cleanup old data first
  await cleanupOldData();

  const results = {
    total: PROVINCE_IDS.length,
    successful: 0,
    skipped: 0,
    failed: 0,
    details: [],
    timestamp: new Date().toISOString(),
  };

  // Scrape each province
  for (const areaId of PROVINCE_IDS) {
    const result = await scrapeAreaWeather(areaId);
    results.details.push(result);

    if (result.success) {
      if (result.skipped) {
        results.skipped++;
      } else {
        results.successful++;
      }
    } else {
      results.failed++;
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  logger.success(
    `Scraping completed: ${results.successful} successful, ${results.skipped} skipped, ${results.failed} failed`
  );

  return results;
}

/**
 * Get weather data from database
 * @param {Object} options - Query options
 * @param {number} options.areaId - Filter by area ID
 * @param {string} options.date - Filter by date (YYYY-MM-DD)
 * @param {number} options.limit - Limit number of results
 * @returns {Promise<Object>} Query result with data
 */
export async function getWeatherData(options = {}) {
  try {
    const { areaId, date, limit } = options;

    // Build query for hourly forecast
    let hourlyQuery = supabase
      .from('hourly_forecast')
      .select('*')
      .order('forecast_date', { ascending: false })
      .order('period', { ascending: true });

    if (areaId) hourlyQuery = hourlyQuery.eq('area_id', areaId);
    if (date) hourlyQuery = hourlyQuery.eq('forecast_date', date);
    if (limit) hourlyQuery = hourlyQuery.limit(limit);

    // Build query for daily forecast
    let dailyQuery = supabase
      .from('daily_forecast')
      .select('*')
      .order('forecast_date', { ascending: false });

    if (areaId) dailyQuery = dailyQuery.eq('area_id', areaId);
    if (date) dailyQuery = dailyQuery.eq('forecast_date', date);
    if (limit) dailyQuery = dailyQuery.limit(limit);

    // Execute queries
    const [hourlyResult, dailyResult] = await Promise.all([hourlyQuery, dailyQuery]);

    if (hourlyResult.error) throw hourlyResult.error;
    if (dailyResult.error) throw dailyResult.error;

    return {
      success: true,
      data: {
        hourly: hourlyResult.data,
        daily: dailyResult.data,
      },
    };
  } catch (error) {
    logger.error('Failed to get weather data:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
