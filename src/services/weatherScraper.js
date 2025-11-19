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
    const { data, error } = await supabase
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

  $('.table-hover tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 8) return;

    const dayText = $(cells[0]).text().trim();
    const period = $(cells[1]).text().trim();
    const forecastDate = getDateForDay(dayText);

    const record = {
      area_id: areaId,
      forecast_date: forecastDate,
      period: period,
      humidity: $(cells[2]).text().trim(),
      temperature: $(cells[3]).text().trim(),
      wind_speed: $(cells[4]).text().trim(),
      wind_direction_value: $(cells[5]).text().trim(),
      wind_direction_image: $(cells[5]).find('img').attr('src') || null,
      weather_value: $(cells[6]).text().trim(),
      weather_image: $(cells[7]).find('img').attr('src') || null,
    };

    hourlyData.push(record);
  });

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

    // Check for duplicates first
    const hasDuplicate = await checkDuplicateData(areaId);
    if (hasDuplicate) {
      logger.info(`Data already exists for ${provinceName}, skipping`);
      return { success: true, skipped: true, areaId, provinceName };
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

    // Save to database
    if (hourlyData.length > 0) {
      const { error: hourlyError } = await supabase.from('hourly_forecast').insert(hourlyData);

      if (hourlyError) throw hourlyError;
    }

    if (dailyData.length > 0) {
      const { error: dailyError } = await supabase.from('daily_forecast').insert(dailyData);

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
