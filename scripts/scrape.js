#!/usr/bin/env node
/**
 * CLI Script for running weather scraper manually
 */
import { scrapeAllAreas } from '../src/services/weatherScraper.js';
import { validateConfig } from '../src/config/index.js';
import { validateDatabaseConnection } from '../src/config/database.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger('CLI');

async function main() {
  try {
    logger.info('Weather Scraper CLI');
    logger.info('===================\n');

    // Validate configuration
    validateConfig();
    logger.success('Configuration validated\n');

    // Validate database connection
    const dbCheck = await validateDatabaseConnection();
    if (!dbCheck.success) {
      throw new Error(dbCheck.message);
    }
    logger.success('Database connection validated\n');

    // Run scraper
    const result = await scrapeAllAreas();

    logger.info('\n===================');
    logger.info('Scraping Summary:');
    logger.info(`Total areas: ${result.total}`);
    logger.info(`Successful: ${result.successful}`);
    logger.info(`Skipped: ${result.skipped}`);
    logger.info(`Failed: ${result.failed}`);

    if (result.failed > 0) {
      logger.warn('\nFailed areas:');
      result.details
        .filter(d => !d.success)
        .forEach(d => logger.warn(`  - ${d.provinceName}: ${d.error}`));
    }

    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error) {
    logger.error('CLI execution failed:', error.message);
    process.exit(1);
  }
}

main();
