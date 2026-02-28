#!/usr/bin/env node
/**
 * CLI Script for running Windy weather scraper manually
 *
 * Usage:
 *   node scripts/scrape-windy.js                    # Scrape all forecasts
 *   node scripts/scrape-windy.js --area 9            # Scrape Phnom Penh only
 *   node scripts/scrape-windy.js --air-quality       # Scrape air quality (CAMS)
 *   node scripts/scrape-windy.js --all               # Scrape everything
 */
import {
  scrapeWindyAllProvinces,
  scrapeWindyProvince,
  scrapeWindyAirQualityAll,
  scrapeWindyAirQuality,
} from '../src/services/windyScraper.js';
import { validateConfig } from '../src/config/index.js';
import { validateDatabaseConnection } from '../src/config/database.js';
import { config } from '../src/config/index.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger('WindyCLI');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    area: null,
    airQuality: false,
    all: false,
    force: false,
    forecast: true, // default action
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--area':
      case '-a':
        options.area = parseInt(args[++i]);
        break;
      case '--air-quality':
      case '--aq':
        options.airQuality = true;
        options.forecast = false;
        break;
      case '--all':
        options.all = true;
        options.forecast = true;
        options.airQuality = true;
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Windy Weather Scraper CLI

Usage:
  node scripts/scrape-windy.js [options]

Options:
  --area, -a <id>    Scrape a specific province (e.g., --area 9 for Phnom Penh)
  --air-quality, --aq  Scrape air quality data (CAMS model)
  --all              Scrape everything (forecast + air quality)
  --force, -f        Force re-scrape even if already scraped today
  --help, -h         Show this help message
        `);
        process.exit(0);
    }
  }

  return options;
}

async function main() {
  try {
    const options = parseArgs();

    logger.info('Windy Weather Scraper CLI');
    logger.info('========================\n');

    // Check for Windy API key
    if (!config.windy.apiKey) {
      throw new Error(
        'WINDY_API_KEY is required. Get one at https://api.windy.com/keys'
      );
    }

    // Validate configuration
    validateConfig();
    logger.success('Configuration validated');

    // Validate database connection
    const dbCheck = await validateDatabaseConnection();
    if (!dbCheck.success) {
      throw new Error(dbCheck.message);
    }
    logger.success('Database connection validated\n');

    // ── Forecast scraping ──────────────────────────────────────────────
    if (options.forecast || options.all) {
      logger.info('--- Point Forecast Scraping ---');
      if (options.force) logger.info('(Force mode: skipping duplicate check)');

      const scrapeOpts = { force: options.force };
      const forecastResult = options.area
        ? await scrapeWindyProvince(options.area, scrapeOpts)
        : await scrapeWindyAllProvinces(scrapeOpts);

      if (options.area) {
        if (forecastResult.skipped) {
          logger.info(`Result: ⏭️  ${forecastResult.provinceName} — already scraped today`);
        } else {
          logger.info(`Result: ${forecastResult.success ? '✅' : '❌'} ${forecastResult.provinceName || ''}`);
        }
        if (forecastResult.records) logger.info(`Records: ${forecastResult.records}`);
      } else {
        logger.info(`\nForecast Summary:`);
        logger.info(`  Total: ${forecastResult.total}`);
        logger.info(`  Successful: ${forecastResult.successful}`);
        logger.info(`  Skipped (already scraped): ${forecastResult.skipped}`);
        logger.info(`  Failed: ${forecastResult.failed}`);

        if (forecastResult.failed > 0) {
          logger.warn('\n  Failed areas:');
          forecastResult.details
            .filter(d => !d.success)
            .forEach(d => logger.warn(`    - ${d.provinceName}: ${d.error}`));
        }
      }
    }

    // ── Air quality scraping ───────────────────────────────────────────
    if (options.airQuality || options.all) {
      logger.info('\n--- Air Quality Scraping (CAMS) ---');
      if (options.force) logger.info('(Force mode: skipping duplicate check)');

      const scrapeOpts = { force: options.force };
      const aqResult = options.area
        ? await scrapeWindyAirQuality(options.area, scrapeOpts)
        : await scrapeWindyAirQualityAll(scrapeOpts);

      if (options.area) {
        if (aqResult.skipped) {
          logger.info(`Result: ⏭️  ${aqResult.provinceName} — already scraped today`);
        } else {
          logger.info(`Result: ${aqResult.success ? '✅' : '❌'} ${aqResult.provinceName || ''}`);
        }
      } else {
        logger.info(`  Successful: ${aqResult.successful} (${aqResult.skipped} skipped), Failed: ${aqResult.failed}`);
      }
    }

    logger.info('\n========================');
    logger.success('Done!');
    process.exit(0);
  } catch (error) {
    logger.error('CLI execution failed:', error.message);
    process.exit(1);
  }
}

main();
