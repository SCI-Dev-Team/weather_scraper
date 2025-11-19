/**
 * API Routes Handler
 */
import { scrapeAllAreas, getWeatherData } from '../services/weatherScraper.js';
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
