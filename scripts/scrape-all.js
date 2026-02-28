#!/usr/bin/env node
/**
 * Combined scraper — runs MOWRAM + Windy (forecast + air quality) in sequence.
 * Designed for cron jobs / scheduled execution.
 *
 * Usage:
 *   node scripts/scrape-all.js            # Run all scrapers
 *   node scripts/scrape-all.js --force     # Force re-scrape (skip duplicate check)
 */
import { scrapeAllAreas } from '../src/services/weatherScraper.js';
import {
  scrapeWindyAllProvinces,
  scrapeWindyAirQualityAll,
} from '../src/services/windyScraper.js';
import { validateConfig, config } from '../src/config/index.js';
import { validateDatabaseConnection } from '../src/config/database.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger('ScrapeAll');

async function main() {
  const force = process.argv.includes('--force') || process.argv.includes('-f');
  const startTime = Date.now();

  try {
    logger.info('═══════════════════════════════════════════');
    logger.info('  Combined Weather Scraper (MOWRAM + Windy)');
    logger.info('═══════════════════════════════════════════\n');

    // Validate
    validateConfig();
    logger.success('Configuration validated');

    const dbCheck = await validateDatabaseConnection();
    if (!dbCheck.success) throw new Error(dbCheck.message);
    logger.success('Database connection validated\n');

    const results = {};

    // ── 1. MOWRAM Scraping ──────────────────────────────────────────
    logger.info('┌─── MOWRAM Weather Scraping ───────────────');
    try {
      const mowramResult = await scrapeAllAreas();
      results.mowram = {
        success: true,
        total: mowramResult.total,
        successful: mowramResult.successful,
        skipped: mowramResult.skipped,
        failed: mowramResult.failed,
      };
      logger.success(`│ MOWRAM: ${mowramResult.successful} OK, ${mowramResult.skipped} skipped, ${mowramResult.failed} failed`);
    } catch (err) {
      results.mowram = { success: false, error: err.message };
      logger.error(`│ MOWRAM failed: ${err.message}`);
    }
    logger.info('└────────────────────────────────────────────\n');

    // ── 2. Windy Forecast Scraping ──────────────────────────────────
    if (config.windy?.apiKey) {
      const scrapeOpts = { force };

      logger.info('┌─── Windy Point Forecast Scraping ─────────');
      if (force) logger.info('│ (Force mode: skipping duplicate check)');
      try {
        const windyResult = await scrapeWindyAllProvinces(scrapeOpts);
        results.windy = {
          success: true,
          total: windyResult.total,
          successful: windyResult.successful,
          skipped: windyResult.skipped,
          failed: windyResult.failed,
        };
        logger.success(`│ Windy: ${windyResult.successful} OK (${windyResult.skipped} skipped), ${windyResult.failed} failed`);
      } catch (err) {
        results.windy = { success: false, error: err.message };
        logger.error(`│ Windy failed: ${err.message}`);
      }
      logger.info('└────────────────────────────────────────────\n');

      // ── 3. Windy Air Quality Scraping ───────────────────────────────
      logger.info('┌─── Windy Air Quality Scraping (CAMS) ─────');
      if (force) logger.info('│ (Force mode: skipping duplicate check)');
      try {
        const aqResult = await scrapeWindyAirQualityAll(scrapeOpts);
        results.airQuality = {
          success: true,
          total: aqResult.total,
          successful: aqResult.successful,
          skipped: aqResult.skipped,
          failed: aqResult.failed,
        };
        logger.success(`│ Air Quality: ${aqResult.successful} OK (${aqResult.skipped} skipped), ${aqResult.failed} failed`);
      } catch (err) {
        results.airQuality = { success: false, error: err.message };
        logger.error(`│ Air Quality failed: ${err.message}`);
      }
      logger.info('└────────────────────────────────────────────\n');
    } else {
      logger.warn('⚠️  WINDY_API_KEY not set — skipping Windy scrapers');
      results.windy = { success: false, error: 'WINDY_API_KEY not configured' };
      results.airQuality = { success: false, error: 'WINDY_API_KEY not configured' };
    }

    // ── Summary ─────────────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const allOk = Object.values(results).every(r => r.success);

    logger.info('═══════════════════════════════════════════');
    logger.info('  Summary');
    logger.info('═══════════════════════════════════════════');
    logger.info(`  MOWRAM:      ${results.mowram?.success ? '✅' : '❌'} ${results.mowram?.successful ?? 0}/${results.mowram?.total ?? 0}`);
    logger.info(`  Windy:       ${results.windy?.success ? '✅' : '❌'} ${results.windy?.successful ?? 0}/${results.windy?.total ?? 0}`);
    logger.info(`  Air Quality: ${results.airQuality?.success ? '✅' : '❌'} ${results.airQuality?.successful ?? 0}/${results.airQuality?.total ?? 0}`);
    logger.info(`  Duration:    ${elapsed}s`);
    logger.info('═══════════════════════════════════════════');

    process.exit(allOk ? 0 : 1);
  } catch (error) {
    logger.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
