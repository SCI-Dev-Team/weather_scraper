/**
 * API Routes Handler
 */
import { scrapeAllAreas, getWeatherData } from '../services/weatherScraper.js';
import {
  scrapeWindyAllProvinces,
  scrapeWindyProvince,
  scrapeWindyAirQualityAll,
  scrapeWindyAirQuality,
  scrapeAllCambodiaWebcams,
  scrapeWebcamsForProvince,
  getWindyForecastData,
  getWindyAirQualityData,
  getWebcamData,
} from '../services/windyScraper.js';
import { createLogger } from '../utils/logger.js';
import { sendJson } from '../utils/response.js';

const logger = createLogger('APIRoutes');

// Track scraping status
let isScrapingInProgress = false;
let lastScrapeResult = null;

/**
 * Handle GET /api/weather
 * Fetch weather data from database
 */
export async function handleGetWeather(url, res) {
  try {
    const areaId = url.searchParams.get('areaId');
    const date = url.searchParams.get('date');
    const limit = url.searchParams.get('limit');

    const options = {};
    if (areaId) options.areaId = parseInt(areaId);
    if (date) options.date = date;
    if (limit) options.limit = parseInt(limit);

    const result = await getWeatherData(options);

    sendJson(res, result.success ? 200 : 500, result);
  } catch (error) {
    logger.error('Error in GET /api/weather:', error.message);
    sendJson(res, 500, { success: false, error: error.message });
  }
}

/**
 * Handle POST /api/scrape
 * Trigger manual weather scraping
 */
export async function handlePostScrape(res) {
  if (isScrapingInProgress) {
    sendJson(res, 429, {
      success: false,
      message: 'Scraping is already in progress. Please wait.',
    });
    return;
  }

  // Start scraping in background (non-blocking)
  isScrapingInProgress = true;
  sendJson(res, 202, {
    success: true,
    message: 'Scraping started in background. Check /api/scrape/status for progress.',
  });

  // Run scraping asynchronously
  scrapeAllAreas()
    .then(result => {
      lastScrapeResult = result;
      isScrapingInProgress = false;
      logger.success('Scraping completed successfully');
    })
    .catch(err => {
      lastScrapeResult = {
        status: 'failed',
        error: err.message,
        timestamp: new Date().toISOString(),
      };
      isScrapingInProgress = false;
      logger.error('Scraping failed:', err);
    });
}

/**
 * Handle GET /api/scrape/status
 * Check scraping progress
 */
export function handleGetScrapeStatus(res) {
  sendJson(res, 200, {
    isScrapingInProgress,
    lastScrapeResult,
  });
}

/**
 * Handle GET /api/provinces
 * Get list of all provinces
 */
export async function handleGetProvinces(res) {
  try {
    const { supabase } = await import('../config/database.js');
    const { data, error } = await supabase.from('areas').select('*').order('area_id');

    if (error) throw error;

    sendJson(res, 200, { success: true, data });
  } catch (error) {
    logger.error('Error in GET /api/provinces:', error.message);
    sendJson(res, 500, { success: false, error: error.message });
  }
}

// ─── Windy API Route Handlers ──────────────────────────────────────────────

// Track Windy scraping status
let isWindyScrapingInProgress = false;
let lastWindyScrapeResult = null;

/**
 * Handle GET /api/windy/forecast
 * Get Windy forecast data from database
 */
export async function handleGetWindyForecast(url, res) {
  try {
    const areaId = url.searchParams.get('areaId');
    const date = url.searchParams.get('date');
    const model = url.searchParams.get('model');
    const limit = url.searchParams.get('limit');

    const options = {};
    if (areaId) options.areaId = parseInt(areaId);
    if (date) options.date = date;
    if (model) options.model = model;
    if (limit) options.limit = parseInt(limit);

    const result = await getWindyForecastData(options);
    sendJson(res, result.success ? 200 : 500, result);
  } catch (error) {
    logger.error('Error in GET /api/windy/forecast:', error.message);
    sendJson(res, 500, { success: false, error: error.message });
  }
}

/**
 * Handle POST /api/windy/scrape
 * Trigger Windy forecast scraping for all provinces
 */
export async function handlePostWindyScrape(url, res) {
  if (isWindyScrapingInProgress) {
    sendJson(res, 429, {
      success: false,
      message: 'Windy scraping is already in progress.',
    });
    return;
  }

  // Parse optional query params
  const areaId = url.searchParams.get('areaId');
  const force = url.searchParams.get('force') === 'true';

  isWindyScrapingInProgress = true;
  sendJson(res, 202, {
    success: true,
    message: areaId
      ? `Windy scraping started for area ${areaId}. Check /api/windy/scrape/status`
      : 'Windy scraping started for all provinces. Check /api/windy/scrape/status',
  });

  const options = { force };
  const scrapePromise = areaId
    ? scrapeWindyProvince(parseInt(areaId), options)
    : scrapeWindyAllProvinces(options);

  scrapePromise
    .then(result => {
      lastWindyScrapeResult = result;
      isWindyScrapingInProgress = false;
      logger.success('[Windy] Scraping completed');
    })
    .catch(err => {
      lastWindyScrapeResult = {
        status: 'failed',
        error: err.message,
        timestamp: new Date().toISOString(),
      };
      isWindyScrapingInProgress = false;
      logger.error('[Windy] Scraping failed:', err);
    });
}

/**
 * Handle GET /api/windy/scrape/status
 */
export function handleGetWindyScrapeStatus(res) {
  sendJson(res, 200, {
    isWindyScrapingInProgress,
    lastWindyScrapeResult,
  });
}

/**
 * Handle GET /api/windy/air-quality
 * Get air quality data from database
 */
export async function handleGetWindyAirQuality(url, res) {
  try {
    const areaId = url.searchParams.get('areaId');
    const date = url.searchParams.get('date');
    const limit = url.searchParams.get('limit');

    const options = {};
    if (areaId) options.areaId = parseInt(areaId);
    if (date) options.date = date;
    if (limit) options.limit = parseInt(limit);

    const result = await getWindyAirQualityData(options);
    sendJson(res, result.success ? 200 : 500, result);
  } catch (error) {
    logger.error('Error in GET /api/windy/air-quality:', error.message);
    sendJson(res, 500, { success: false, error: error.message });
  }
}

/**
 * Handle POST /api/windy/air-quality/scrape
 * Trigger air quality scraping
 */
export async function handlePostWindyAirQualityScrape(url, res) {
  const areaId = url.searchParams.get('areaId');
  const force = url.searchParams.get('force') === 'true';

  sendJson(res, 202, {
    success: true,
    message: 'Air quality scraping started.',
  });

  const options = { force };
  const scrapePromise = areaId
    ? scrapeWindyAirQuality(parseInt(areaId), options)
    : scrapeWindyAirQualityAll(options);

  scrapePromise
    .then(result => logger.success('[Windy AQ] Scraping completed'))
    .catch(err => logger.error('[Windy AQ] Scraping failed:', err));
}

/**
 * Handle GET /api/windy/webcams
 * Get webcam data from database
 */
export async function handleGetWindyWebcams(url, res) {
  try {
    const areaId = url.searchParams.get('areaId');
    const limit = url.searchParams.get('limit');

    const options = {};
    if (areaId) options.areaId = parseInt(areaId);
    if (limit) options.limit = parseInt(limit);

    const result = await getWebcamData(options);
    sendJson(res, result.success ? 200 : 500, result);
  } catch (error) {
    logger.error('Error in GET /api/windy/webcams:', error.message);
    sendJson(res, 500, { success: false, error: error.message });
  }
}

/**
 * Handle POST /api/windy/webcams/scrape
 * Trigger webcam scraping
 */
export async function handlePostWindyWebcamsScrape(url, res) {
  const areaId = url.searchParams.get('areaId');

  sendJson(res, 202, {
    success: true,
    message: areaId
      ? `Webcam scraping started for area ${areaId}.`
      : 'Webcam scraping started for all Cambodia.',
  });

  const scrapePromise = areaId
    ? scrapeWebcamsForProvince(parseInt(areaId))
    : scrapeAllCambodiaWebcams();

  scrapePromise
    .then(result => logger.success('[Webcams] Scraping completed'))
    .catch(err => logger.error('[Webcams] Scraping failed:', err));
}
