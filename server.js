import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeAllAreas, getWeatherData, PROVINCE_IDS, PROVINCE_NAMES_EN } from './scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;

// Track scraping status
let isScrapingInProgress = false;
let lastScrapeResult = null;

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse URL and query params
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // API: Get weather data from database
    if (pathname === '/api/weather' && req.method === 'GET') {
        try {
            const areaId = url.searchParams.get('areaId');
            const date = url.searchParams.get('date');
            const limit = url.searchParams.get('limit');
            
            const options = {};
            if (areaId) options.areaId = parseInt(areaId);
            if (date) options.date = date;
            if (limit) options.limit = parseInt(limit);
            
            const result = await getWeatherData(options);
            
            res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
    }

    // API: Trigger manual scraping
    if (pathname === '/api/scrape' && req.method === 'POST') {
        if (isScrapingInProgress) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                message: 'Scraping is already in progress. Please wait.' 
            }));
            return;
        }

        // Start scraping in background (non-blocking)
        isScrapingInProgress = true;
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: true, 
            message: 'Scraping started in background. Check /api/scrape/status for progress.' 
        }));

        // Run scraping asynchronously
        scrapeAllAreas()
            .then(result => {
                lastScrapeResult = result;
                isScrapingInProgress = false;
                console.log('✅ Scraping completed successfully');
            })
            .catch(err => {
                lastScrapeResult = { 
                    status: 'failed', 
                    error: err.message,
                    timestamp: new Date().toISOString()
                };
                isScrapingInProgress = false;
                console.error('❌ Scraping failed:', err);
            });
        return;
    }

    // API: Check scraping status
    if (pathname === '/api/scrape/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            isScrapingInProgress,
            lastScrapeResult
        }));
        return;
    }

    // API: Get provinces list
    if (pathname === '/api/provinces' && req.method === 'GET') {
        const provinces = PROVINCE_IDS.map(id => ({
            areaId: id,
            nameEn: PROVINCE_NAMES_EN[id]
        }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: provinces }));
        return;
    }

    // API: Health check
    if (pathname === '/api/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        }));
        return;
    }

    // Serve HTML file
    if (pathname === '/' || pathname === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading page');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
        return;
    }

    // API Documentation
    if (pathname === '/api' && req.method === 'GET') {
        const docs = {
            endpoints: {
                'GET /api/health': 'Health check endpoint',
                'GET /api/weather': 'Get weather data (params: areaId, date, limit)',
                'GET /api/provinces': 'Get list of all provinces',
                'POST /api/scrape': 'Trigger manual weather scraping',
                'GET /api/scrape/status': 'Check scraping progress and last result'
            },
            examples: {
                'Get all weather data': 'GET /api/weather',
                'Get weather for Phnom Penh': 'GET /api/weather?areaId=9',
                'Get weather for specific date': 'GET /api/weather?date=2024-11-19',
                'Get weather for area and date': 'GET /api/weather?areaId=9&date=2024-11-19',
                'Trigger scraping': 'POST /api/scrape',
                'Check scraping status': 'GET /api/scrape/status'
            }
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(docs, null, 2));
        return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
    console.log('🌤️  Weather Scraper API Server');
    console.log('='.repeat(50));
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
    console.log('='.repeat(50));
    console.log('\nAvailable endpoints:');
    console.log(`  GET  /api/health          - Health check`);
    console.log(`  GET  /api/weather         - Get weather data`);
    console.log(`  GET  /api/provinces       - Get provinces list`);
    console.log(`  POST /api/scrape          - Trigger scraping`);
    console.log(`  GET  /api/scrape/status   - Check scraping status`);
    console.log('');
});

