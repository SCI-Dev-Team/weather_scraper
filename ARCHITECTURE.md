# Architecture Overview

Visual guide to the weather scraper architecture.

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────────┐        ┌──────────────────────────────┐  │
│  │   Web Browser    │        │    External Services          │  │
│  │  (index.html)    │        │  (Curl, Postman, etc.)       │  │
│  └────────┬─────────┘        └──────────────┬───────────────┘  │
└───────────┼────────────────────────────────┼──────────────────┘
            │                                 │
            └────────────────┬────────────────┘
                             │ HTTP Requests
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     src/server.js                         │  │
│  │         (Main HTTP Server & Request Router)              │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────────────┐ │
│  │                    src/api/routes.js                       │ │
│  │  • GET  /api/weather       • POST /api/scrape             │ │
│  │  • GET  /api/provinces     • GET  /api/scrape/status      │ │
│  │  • GET  /api/health                                        │ │
│  └────────────────────────┬─────────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            src/services/weatherScraper.js                │  │
│  │  • scrapeAllAreas()      • scrapeAreaWeather()           │  │
│  │  • getWeatherData()      • cleanupOldData()              │  │
│  │  • checkDuplicateData()  • saveAreaInfo()                │  │
│  └────────────┬────────────────────────────┬─────────────────┘ │
└───────────────┼────────────────────────────┼──────────────────┘
                │                            │
    ┌───────────▼─────────┐     ┌───────────▼─────────┐
    │  External Source    │     │    Database Layer   │
    │  cambodiameteo.com  │     │                     │
    └─────────────────────┘     └─────────┬───────────┘
                                          │
                                          ▼
                        ┌──────────────────────────────────┐
                        │    src/config/database.js        │
                        │    (Supabase Client)             │
                        └────────────┬─────────────────────┘
                                     │
                                     ▼
                        ┌──────────────────────────────────┐
                        │         Supabase                 │
                        │  • areas                         │
                        │  • hourly_forecast               │
                        │  • daily_forecast                │
                        └──────────────────────────────────┘
```

## 🔄 Data Flow

### 1. Weather Data Scraping Flow

```
┌──────────┐    POST      ┌────────────┐    Trigger    ┌────────────────┐
│ Client   │─────────────>│ API Routes │──────────────>│ Scraper Service│
└──────────┘   /scrape     └────────────┘               └────────┬───────┘
                                                                  │
                                                         Fetch    │
                              ┌──────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ cambodiameteo.com│
                    │  (HTTP POST)     │
                    └─────────┬────────┘
                              │ HTML Response
                              ▼
                    ┌──────────────────┐
                    │  Parse with      │
                    │  Cheerio         │
                    └─────────┬────────┘
                              │ Structured Data
                              ▼
                    ┌──────────────────┐
                    │  Save to         │
                    │  Supabase        │
                    └──────────────────┘
```

### 2. Weather Data Retrieval Flow

```
┌──────────┐    GET       ┌────────────┐    Query     ┌──────────┐
│ Client   │─────────────>│ API Routes │─────────────>│ Database │
└──────────┘  /weather    └────────────┘              └────┬─────┘
                                ▲                           │
                                │         Data              │
                                └───────────────────────────┘
```

## 📦 Module Dependencies

```
src/server.js
    ├── src/config/index.js
    │   └── dotenv
    ├── src/config/database.js
    │   ├── @supabase/supabase-js
    │   └── dotenv
    ├── src/utils/logger.js
    └── src/api/routes.js
        └── src/services/weatherScraper.js
            ├── cheerio
            ├── src/config/database.js
            ├── src/config/index.js
            ├── src/constants/provinces.js
            ├── src/utils/dateHelpers.js
            └── src/utils/logger.js
```

## 🗂️ Directory Structure with Responsibilities

```
weather_scraper/
│
├── src/
│   ├── api/                    # HTTP Request Handling
│   │   └── routes.js          → Route handlers, request/response
│   │
│   ├── config/                 # Configuration Management
│   │   ├── database.js        → Supabase client setup
│   │   └── index.js           → Centralized config, validation
│   │
│   ├── constants/              # Static Data
│   │   └── provinces.js       → Province mappings & IDs
│   │
│   ├── services/               # Business Logic
│   │   └── weatherScraper.js  → Scraping, parsing, data operations
│   │
│   ├── utils/                  # Helper Functions
│   │   ├── dateHelpers.js     → Date formatting & manipulation
│   │   └── logger.js          → Structured logging
│   │
│   └── server.js              # Entry Point
│
├── public/                     # Static Files (Frontend)
│   ├── index.html             → Web UI
│   └── client.js              → Client-side JavaScript
│
├── scripts/                    # CLI Tools
│   └── scrape.js              → Manual scraping script
│
├── tests/                      # Test Files
│   └── weatherScraper.test.js → Unit & integration tests
│
└── supabase/                   # Supabase Related
    ├── functions/             → Edge functions
    │   └── weather-scraper/   → Serverless scraping function
    └── supabase_schema.sql    → Database schema
```

## 🔐 Security Layers

```
┌─────────────────────────────────────────────┐
│            Environment Variables             │
│  (.env - Not committed to version control)  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Configuration Validation             │
│     (src/config/index.js - validateConfig)   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           Supabase RLS Policies              │
│  (Row Level Security on database tables)    │
└─────────────────────────────────────────────┘
```

## ⚡ Request Lifecycle

```
1. Request Received
   └─> src/server.js (HTTP Server)

2. CORS Headers Set
   └─> setCorsHeaders()

3. Route Matching
   └─> pathname parsed from URL

4. Route Handler Invoked
   └─> src/api/routes.js
       ├─> handleGetWeather()
       ├─> handlePostScrape()
       ├─> handleGetScrapeStatus()
       └─> handleGetProvinces()

5. Service Layer Called
   └─> src/services/weatherScraper.js
       ├─> Data fetching
       ├─> Parsing
       └─> Database operations

6. Response Sent
   └─> JSON response with status code

7. Logging
   └─> src/utils/logger.js
```

## 🔄 Scraping Workflow

```
START: POST /api/scrape
  │
  ├─> Check if scraping in progress
  │   └─> YES → Return 429 (Too Many Requests)
  │   └─> NO  → Continue
  │
  ├─> Mark scraping as in progress
  │
  ├─> Return 202 (Accepted) immediately
  │
  └─> Background Process:
      │
      ├─> Cleanup old data (>14 days)
      │
      ├─> For each province (25 total):
      │   │
      │   ├─> Check for duplicate data
      │   │   └─> EXISTS → Skip
      │   │   └─> NONE   → Continue
      │   │
      │   ├─> Fetch HTML from cambodiameteo.com
      │   │
      │   ├─> Parse with Cheerio
      │   │   ├─> Extract hourly forecast
      │   │   └─> Extract daily forecast
      │   │
      │   ├─> Save to Supabase
      │   │   ├─> Insert hourly records
      │   │   └─> Insert daily records
      │   │
      │   └─> Delay 500ms (rate limiting)
      │
      ├─> Store final results
      │
      └─> Mark scraping as complete

CHECK STATUS: GET /api/scrape/status
```

## 🎯 Key Design Patterns

1. **Separation of Concerns**: Each module has a single responsibility
2. **Dependency Injection**: Config passed to functions, not hardcoded
3. **Error Handling**: Try-catch with proper error propagation
4. **Logging**: Structured logging throughout
5. **Configuration Management**: Centralized and validated
6. **Modular Design**: Easy to test and maintain

## 📈 Scalability Considerations

Current design supports:

- ✅ Easy addition of new API endpoints
- ✅ New data sources (add new services)
- ✅ Multiple database backends (abstract config layer)
- ✅ Caching layer (can be added to service layer)
- ✅ Authentication middleware (can be added to server)
- ✅ Rate limiting (can be added to API layer)

---

**Architecture Version**: 2.0  
**Last Updated**: November 19, 2025
