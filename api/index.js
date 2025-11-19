/**
 * Vercel Serverless Function Entry Point
 */
import {
  handleGetWeather,
  handlePostScrape,
  handleGetScrapeStatus,
  handleGetProvinces,
} from '../src/api/routes.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
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

    if (pathname === '/api/health' && req.method === 'GET') {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      });
      return;
    }

    // Static file serving
    if (pathname === '/' || pathname === '/index.html') {
      const indexPath = path.join(__dirname, '../public/index.html');
      const content = fs.readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(content);
      return;
    }

    if (pathname === '/client.js' || pathname === '/js.js') {
      const jsPath = path.join(__dirname, '../public/client.js');
      const content = fs.readFileSync(jsPath, 'utf-8');
      res.setHeader('Content-Type', 'application/javascript');
      res.status(200).send(content);
      return;
    }

    // 404 for all other routes
    res.status(404).json({ error: 'Not Found' });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
