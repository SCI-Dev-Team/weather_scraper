/**
 * Windy API Scraping Service
 * Fetches weather data from Windy's Point Forecast API
 *
 * Available Windy APIs integrated:
 *   1. Point Forecast API  – detailed hourly forecasts per coordinate
 *   2. Air Quality (CAMS)  – SO₂, dust, CO forecasts
 *
 * Note: Map Forecast API is a frontend tile service (not data-scraping).
 *       Windy Plugins API is a client-side SDK for embedding Windy maps.
 *       Both are documented in WINDY_API.md for frontend usage.
 */
import { supabase } from '../config/database.js';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import { formatDate } from '../utils/dateHelpers.js';
import {
  WINDY_MODELS,
  DEFAULT_MODEL,
  DEFAULT_PARAMETERS,
  WAVE_PARAMETERS,
  AIR_QUALITY_PARAMETERS,
  DEFAULT_LEVELS,
  PROVINCE_COORDINATES,
  COASTAL_PROVINCE_IDS,
  PRECIP_TYPE_MAP,
  windFromComponents,
} from '../constants/windyConfig.js';

const logger = createLogger('WindyScraperService');

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Sleep for the given milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Duplicate Checking ────────────────────────────────────────────────────

/**
 * Check if Windy forecast data already exists for given area, model, and today's date.
 * Prevents unnecessary API calls if data has already been scraped today.
 * @param {number} areaId - Province area ID
 * @param {string} model - Windy model name (e.g. 'gfs')
 * @returns {Promise<boolean>} true if data already exists for today
 */
export async function checkWindyForecastDuplicate(areaId, model = DEFAULT_MODEL) {
  const todayDate = formatDate(new Date());

  try {
    const { data, error } = await supabase
      .from('windy_forecast')
      .select('id')
      .eq('area_id', areaId)
      .eq('model', model)
      .eq('forecast_date', todayDate)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    logger.error(`Error checking Windy forecast duplicates for area ${areaId}:`, error.message);
    return false; // On error, allow scraping to proceed
  }
}

/**
 * Check if air quality data already exists for given area and today's date.
 * @param {number} areaId - Province area ID
 * @returns {Promise<boolean>} true if data already exists for today
 */
export async function checkWindyAQDuplicate(areaId) {
  const todayDate = formatDate(new Date());

  try {
    const { data, error } = await supabase
      .from('windy_air_quality')
      .select('id')
      .eq('area_id', areaId)
      .eq('forecast_date', todayDate)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    logger.error(`Error checking Windy AQ duplicates for area ${areaId}:`, error.message);
    return false;
  }
}

/**
 * Build the request body for Windy Point Forecast API
 */
function buildPointForecastBody(lat, lon, parameters, model, levels) {
  return {
    lat,
    lon,
    model: model || DEFAULT_MODEL,
    parameters: parameters || DEFAULT_PARAMETERS,
    levels: levels || DEFAULT_LEVELS,
    key: config.windy.apiKey,
  };
}

// ─── Point Forecast API ────────────────────────────────────────────────────

/**
 * Fetch point forecast from Windy API for a single coordinate
 * @param {number} lat
 * @param {number} lon
 * @param {string[]} parameters - Windy parameter names
 * @param {string} model - Forecast model (default: gfs)
 * @param {string[]} levels - Altitude levels (default: ['surface'])
 * @returns {Promise<Object>} Raw Windy API response
 */
export async function fetchPointForecast(lat, lon, parameters, model, levels) {
  const body = buildPointForecastBody(lat, lon, parameters, model, levels);

  const response = await fetch(WINDY_ENDPOINTS.pointForecast, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.scraper.requestTimeout),
  });

  if (response.status === 204) {
    logger.warn(`No data for model ${model} with requested parameters at ${lat},${lon}`);
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Windy API ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Transform raw Windy point forecast response into structured records
 * @param {Object} raw - Raw Windy API response
 * @param {number} areaId - Province area ID
 * @param {string} model - Model used
 * @returns {Array<Object>} Array of windy_forecast records
 */
function transformPointForecast(raw, areaId, model) {
  if (!raw || !raw.ts || raw.ts.length === 0) return [];

  const records = [];
  const timestamps = raw.ts;

  for (let i = 0; i < timestamps.length; i++) {
    const forecastTime = new Date(timestamps[i]);
    const forecastDate = formatDate(forecastTime);
    const forecastHour = forecastTime.getUTCHours();

    // Extract wind components → speed & direction
    const windU = raw['wind_u-surface']?.[i] ?? null;
    const windV = raw['wind_v-surface']?.[i] ?? null;
    let windSpeed = null;
    let windDirection = null;
    let windCardinal = null;

    if (windU !== null && windV !== null) {
      const wind = windFromComponents(windU, windV);
      windSpeed = wind.speed;
      windDirection = wind.direction;
      windCardinal = wind.cardinal;
    }

    // Precipitation type label
    const ptypeRaw = raw['ptype-surface']?.[i] ?? null;
    const ptypeLabel = ptypeRaw !== null ? (PRECIP_TYPE_MAP[ptypeRaw]?.en || `Unknown (${ptypeRaw})`) : null;

    // Wave data (coastal only)
    const waveHeight = raw['waves_height-surface']?.[i] ?? null;
    const wavePeriod = raw['waves_period-surface']?.[i] ?? null;
    const waveDirection = raw['waves_direction-surface']?.[i] ?? null;

    const record = {
      area_id: areaId,
      model,
      forecast_date: forecastDate,
      forecast_hour: forecastHour,
      forecast_timestamp: forecastTime.toISOString(),

      // Temperature & humidity
      temperature: raw['temp-surface']?.[i] ?? null,
      dewpoint: raw['dewpoint-surface']?.[i] ?? null,
      relative_humidity: raw['rh-surface']?.[i] ?? null,
      pressure: raw['pressure-surface']?.[i] ?? null,

      // Wind
      wind_u: windU,
      wind_v: windV,
      wind_speed: windSpeed,
      wind_direction: windDirection,
      wind_cardinal: windCardinal,
      wind_gust: raw['gust-surface']?.[i] ?? null,

      // Precipitation
      precipitation_3h: raw['past3hprecip-surface']?.[i] ?? null,
      precipitation_type: ptypeRaw,
      precipitation_type_label: ptypeLabel,

      // Clouds
      clouds_low: raw['lclouds-surface']?.[i] ?? null,
      clouds_medium: raw['mclouds-surface']?.[i] ?? null,
      clouds_high: raw['hclouds-surface']?.[i] ?? null,

      // Atmospheric
      cape: raw['cape-surface']?.[i] ?? null,

      // Waves (null for inland provinces)
      wave_height: waveHeight,
      wave_period: wavePeriod,
      wave_direction: waveDirection,
    };

    records.push(record);
  }

  return records;
}

/**
 * Scrape Windy point forecast for a single province
 * For coastal provinces, also fetches wave data from the gfsWave model separately.
 * @param {number} areaId - Province area ID
 * @param {Object} options - Optional overrides { model, parameters, levels }
 * @returns {Promise<Object>} Result summary
 */
export async function scrapeWindyProvince(areaId, options = {}) {
  const coords = PROVINCE_COORDINATES[areaId];
  if (!coords) {
    return { success: false, error: `Unknown area ID: ${areaId}`, areaId };
  }

  const model = options.model || DEFAULT_MODEL;
  const isCoastal = COASTAL_PROVINCE_IDS.includes(areaId);
  // Always use DEFAULT_PARAMETERS for the gfs model (waves are NOT supported on gfs)
  const parameters = options.parameters || DEFAULT_PARAMETERS;
  const levels = options.levels || DEFAULT_LEVELS;
  const force = options.force || false;

  try {
    // Check for duplicate data (skip if already scraped today)
    if (!force) {
      const exists = await checkWindyForecastDuplicate(areaId, model);
      if (exists) {
        logger.info(`[Windy] ${coords.name} (ID: ${areaId}) already scraped today — skipping`);
        return {
          success: true,
          skipped: true,
          areaId,
          provinceName: coords.name,
          model,
          records: 0,
          message: 'Already scraped today',
        };
      }
    }

    logger.info(`[Windy] Scraping ${coords.name} (ID: ${areaId}, model: ${model})...`);

    // Delete existing Windy data for this area
    const { error: deleteError } = await supabase
      .from('windy_forecast')
      .delete()
      .eq('area_id', areaId)
      .eq('model', model);

    if (deleteError) {
      logger.warn(`Failed to delete old Windy data for ${coords.name}:`, deleteError.message);
    }

    // Fetch weather forecast from Windy API (gfs model)
    const raw = await fetchPointForecast(coords.lat, coords.lon, parameters, model, levels);

    if (!raw) {
      return { success: false, error: 'No data returned', areaId, provinceName: coords.name };
    }

    // Transform to records
    const records = transformPointForecast(raw, areaId, model);

    // For coastal provinces, fetch wave data separately using the gfsWave model
    if (isCoastal && records.length > 0) {
      try {
        logger.info(`[Windy] Fetching wave data for coastal ${coords.name} (gfsWave)...`);
        const waveRaw = await fetchPointForecast(
          coords.lat, coords.lon, WAVE_PARAMETERS, WINDY_MODELS.GFS_WAVE, levels
        );

        if (waveRaw && waveRaw.ts) {
          // Build a lookup map: timestamp → wave data
          const waveLookup = {};
          waveRaw.ts.forEach((ts, i) => {
            waveLookup[ts] = {
              wave_height: waveRaw['waves_height-surface']?.[i] ?? null,
              wave_period: waveRaw['waves_period-surface']?.[i] ?? null,
              wave_direction: waveRaw['waves_direction-surface']?.[i] ?? null,
            };
          });

          // Merge wave data into forecast records by matching timestamps
          records.forEach(record => {
            const tsMs = new Date(record.forecast_timestamp).getTime();
            if (waveLookup[tsMs]) {
              record.wave_height = waveLookup[tsMs].wave_height;
              record.wave_period = waveLookup[tsMs].wave_period;
              record.wave_direction = waveLookup[tsMs].wave_direction;
            }
          });

          logger.success(`[Windy] Wave data merged for ${coords.name}`);
        }
      } catch (waveErr) {
        // Wave data is supplementary — don't fail the whole province
        logger.warn(`[Windy] Wave data unavailable for ${coords.name}: ${waveErr.message}`);
      }
    }

    if (records.length > 0) {
      const { error: insertError } = await supabase
        .from('windy_forecast')
        .insert(records);

      if (insertError) throw insertError;
    }

    logger.success(`[Windy] ${coords.name}: ${records.length} forecast records saved`);
    return {
      success: true,
      areaId,
      provinceName: coords.name,
      model,
      records: records.length,
    };
  } catch (error) {
    logger.error(`[Windy] Failed to scrape ${coords.name}:`, error.message);
    return { success: false, error: error.message, areaId, provinceName: coords.name };
  }
}

/**
 * Scrape Windy point forecast for ALL Cambodian provinces
 * @param {Object} options - Optional overrides { model, parameters, levels }
 * @returns {Promise<Object>} Aggregated results
 */
export async function scrapeWindyAllProvinces(options = {}) {
  logger.info('[Windy] Starting point forecast scraping for all provinces...');

  const areaIds = Object.keys(PROVINCE_COORDINATES).map(Number);
  const results = {
    total: areaIds.length,
    successful: 0,
    skipped: 0,
    failed: 0,
    details: [],
    timestamp: new Date().toISOString(),
  };

  for (const areaId of areaIds) {
    const result = await scrapeWindyProvince(areaId, options);
    results.details.push(result);

    if (result.success) {
      results.successful++;
      if (result.skipped) results.skipped++;
    } else {
      results.failed++;
    }

    // Rate limiting – Windy free tier allows ~1000 requests/day
    // Skip delay for skipped provinces (no API call was made)
    if (!result.skipped) await sleep(1000);
  }

  logger.success(
    `[Windy] Scraping completed: ${results.successful} successful (${results.skipped} skipped), ${results.failed} failed`
  );

  return results;
}

// ─── Air Quality (CAMS Model) ──────────────────────────────────────────────

/**
 * Scrape air quality data using CAMS model for a single province
 * @param {number} areaId
 * @returns {Promise<Object>}
 */
export async function scrapeWindyAirQuality(areaId, options = {}) {
  const coords = PROVINCE_COORDINATES[areaId];
  if (!coords) {
    return { success: false, error: `Unknown area ID: ${areaId}`, areaId };
  }

  const force = options.force || false;

  try {
    // Check for duplicate data (skip if already scraped today)
    if (!force) {
      const exists = await checkWindyAQDuplicate(areaId);
      if (exists) {
        logger.info(`[Windy AQ] ${coords.name} (ID: ${areaId}) already scraped today — skipping`);
        return {
          success: true,
          skipped: true,
          areaId,
          provinceName: coords.name,
          records: 0,
          message: 'Already scraped today',
        };
      }
    }

    logger.info(`[Windy AQ] Scraping air quality for ${coords.name}...`);

    // Delete existing air quality data for this area
    const { error: deleteError } = await supabase
      .from('windy_air_quality')
      .delete()
      .eq('area_id', areaId);

    if (deleteError) {
      logger.warn(`Failed to delete old AQ data for ${coords.name}:`, deleteError.message);
    }

    const raw = await fetchPointForecast(
      coords.lat,
      coords.lon,
      AIR_QUALITY_PARAMETERS,
      'cams',
      DEFAULT_LEVELS
    );

    if (!raw || !raw.ts) {
      return { success: false, error: 'No CAMS data returned', areaId, provinceName: coords.name };
    }

    const records = raw.ts.map((ts, i) => {
      const forecastTime = new Date(ts);
      return {
        area_id: areaId,
        forecast_date: formatDate(forecastTime),
        forecast_hour: forecastTime.getUTCHours(),
        forecast_timestamp: forecastTime.toISOString(),
        so2: raw['chem_so2sm-surface']?.[i] ?? null,
        dust: raw['chem_dustsm-surface']?.[i] ?? null,
        co: raw['chem_cosc-surface']?.[i] ?? null,
      };
    });

    if (records.length > 0) {
      const { error: insertError } = await supabase
        .from('windy_air_quality')
        .insert(records);

      if (insertError) throw insertError;
    }

    logger.success(`[Windy AQ] ${coords.name}: ${records.length} records saved`);
    return { success: true, areaId, provinceName: coords.name, records: records.length };
  } catch (error) {
    logger.error(`[Windy AQ] Failed for ${coords.name}:`, error.message);
    return { success: false, error: error.message, areaId, provinceName: coords.name };
  }
}

/**
 * Scrape air quality for all provinces
 */
export async function scrapeWindyAirQualityAll(options = {}) {
  logger.info('[Windy AQ] Starting air quality scraping for all provinces...');

  const areaIds = Object.keys(PROVINCE_COORDINATES).map(Number);
  const results = {
    total: areaIds.length,
    successful: 0,
    skipped: 0,
    failed: 0,
    details: [],
    timestamp: new Date().toISOString(),
  };

  for (const areaId of areaIds) {
    const result = await scrapeWindyAirQuality(areaId, options);
    results.details.push(result);
    if (result.success) {
      results.successful++;
      if (result.skipped) results.skipped++;
    } else {
      results.failed++;
    }
    // Skip delay for skipped provinces (no API call was made)
    if (!result.skipped) await sleep(1000);
  }

  logger.success(
    `[Windy AQ] Completed: ${results.successful} successful (${results.skipped} skipped), ${results.failed} failed`
  );

  return results;
}

// ─── Data Retrieval ────────────────────────────────────────────────────────

/**
 * Get Windy forecast data from database
 * @param {Object} options - { areaId, date, model, limit }
 * @returns {Promise<Object>}
 */
export async function getWindyForecastData(options = {}) {
  try {
    const { areaId, date, model, limit } = options;

    let query = supabase
      .from('windy_forecast')
      .select('*')
      .order('forecast_timestamp', { ascending: true });

    if (areaId) query = query.eq('area_id', areaId);
    if (date) query = query.eq('forecast_date', date);
    if (model) query = query.eq('model', model);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    logger.error('Failed to get Windy forecast data:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get Windy air quality data from database
 * @param {Object} options - { areaId, date, limit }
 * @returns {Promise<Object>}
 */
export async function getWindyAirQualityData(options = {}) {
  try {
    const { areaId, date, limit } = options;

    let query = supabase
      .from('windy_air_quality')
      .select('*')
      .order('forecast_timestamp', { ascending: true });

    if (areaId) query = query.eq('area_id', areaId);
    if (date) query = query.eq('forecast_date', date);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    logger.error('Failed to get air quality data:', error.message);
    return { success: false, error: error.message };
  }
}
