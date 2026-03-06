/**
 * HTTP Server
 * Main server entry point
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, validateConfig } from './config/index.js';
import { validateDatabaseConnection } from './config/database.js';
import { createLogger } from './utils/logger.js';
import {
  handleGetWeather,
  handlePostScrape,
  handleGetScrapeStatus,
  handleGetProvinces,
  handleGetWindyForecast,
  handlePostWindyScrape,
  handleGetWindyScrapeStatus,
  handleGetWindyAirQuality,
  handlePostWindyAirQualityScrape,
} from './api/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('Server');

/**
 * Set CORS headers
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Serve static files
 */
function serveStaticFile(filePath, contentType, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

/**
 * Main request handler (can be used by both local server and Vercel)
 */
export async function handleRequest(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${config.port}`);
  const pathname = url.pathname;

  // API Routes
  if (pathname === '/api/weather' && req.method === 'GET') {
    return handleGetWeather(url, res);
  }

  if (pathname === '/api/scrape' && req.method === 'POST') {
    return handlePostScrape(res);
  }

  if (pathname === '/api/scrape/status' && req.method === 'GET') {
    return handleGetScrapeStatus(res);
  }

  if (pathname === '/api/provinces' && req.method === 'GET') {
    return handleGetProvinces(res);
  }

  // ── Windy API Routes ───────────────────────────────────────────────────
  if (pathname === '/api/windy/forecast' && req.method === 'GET') {
    return handleGetWindyForecast(url, res);
  }

  if (pathname === '/api/windy/scrape' && req.method === 'POST') {
    return handlePostWindyScrape(url, res);
  }

  if (pathname === '/api/windy/scrape/status' && req.method === 'GET') {
    return handleGetWindyScrapeStatus(res);
  }

  if (pathname === '/api/windy/air-quality' && req.method === 'GET') {
    return handleGetWindyAirQuality(url, res);
  }

  if (pathname === '/api/windy/air-quality/scrape' && req.method === 'POST') {
    return handlePostWindyAirQualityScrape(url, res);
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    }));
    return;
  }

  // Static file serving
  if (pathname === '/' || pathname === '/index.html') {
    const indexPath = path.join(__dirname, '../public/index.html');
    serveStaticFile(indexPath, 'text/html', res);
    return;
  }

  if (pathname === '/js.js' || pathname === '/client.js') {
    const jsPath = path.join(__dirname, '../public/client.js');
    serveStaticFile(jsPath, 'application/javascript', res);
    return;
  }

  // 404 for all other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}

/**
 * Create HTTP server using the handler
 */
const server = http.createServer(handleRequest);

/**
 * Start server with validation
 */
async function startServer() {
  try {
    // Validate configuration
    validateConfig();
    logger.success('Configuration validated');

    // Validate database connection
    const dbCheck = await validateDatabaseConnection();
    if (!dbCheck.success) {
      throw new Error(dbCheck.message);
    }
    logger.success('Database connection validated');

    // Start listening
    server.listen(config.port, () => {
      logger.success(`Server running on http://localhost:${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info('API Endpoints:');
      logger.info('  GET  /api/weather?areaId=9&date=2025-11-19');
      logger.info('  GET  /api/provinces');
      logger.info('  POST /api/scrape');
      logger.info('  GET  /api/scrape/status');
      logger.info('  --- Windy API ---');
      logger.info('  GET  /api/windy/forecast?areaId=9&date=2025-11-19&model=gfs');
      logger.info('  POST /api/windy/scrape?areaId=9');
      logger.info('  GET  /api/windy/scrape/status');
      logger.info('  GET  /api/windy/air-quality?areaId=9');
      logger.info('  POST /api/windy/air-quality/scrape?areaId=9');
      logger.info('  GET  /api/health');
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();
