# Cambodia Weather Scraper

A professional weather data scraping and API service for Cambodia — combining **MOWRAM** meteorological data from [cambodiameteo.com](http://cambodiameteo.com/forecast) and **Windy** forecast & air quality data from the [Windy Point Forecast API](https://api.windy.com/) for all 25 Cambodian provinces.

## 🌟 Features

- **Dual Data Sources**: MOWRAM (HTML scraping) + Windy Point Forecast API (GFS/CAMS models)
- **25 Province Coverage**: Full weather data for every Cambodian province
- **Air Quality Monitoring**: SO₂, dust, and CO data via Windy CAMS model
- **Coastal Wave Data**: Wave height, period, and direction for coastal provinces (gfsWave model)
- **Automated Scheduling**: Daily cron jobs via GitHub Actions, Vercel Cron, and Supabase Edge Functions
- **Duplicate Prevention**: Smart checking to avoid redundant data on every scrape
- **RESTful API**: Clean endpoints for both MOWRAM and Windy data
- **Data Persistence**: Supabase PostgreSQL with Row Level Security (RLS)
- **Background Processing**: Non-blocking scraping operations
- **Dashboard UI**: Tabbed interface with MOWRAM, Windy, and Air Quality views

## 📁 Project Structure

```
weather_scraper/
├── src/
│   ├── api/
│   │   └── routes.js              # API route handlers (MOWRAM + Windy)
│   ├── config/
│   │   ├── database.js            # Supabase client & validation
│   │   └── index.js               # Central configuration
│   ├── constants/
│   │   ├── provinces.js           # MOWRAM province mappings
│   │   └── windyConfig.js         # Windy API config & province coordinates
│   ├── services/
│   │   ├── weatherScraper.js      # MOWRAM scraping logic
│   │   └── windyScraper.js        # Windy API scraping logic
│   ├── utils/
│   │   ├── dateHelpers.js         # Date utilities
│   │   ├── logger.js              # Logging utility
│   │   └── response.js            # HTTP response helpers
│   └── server.js                  # HTTP server entry point
├── public/
│   ├── index.html                 # Dashboard UI (tabbed)
│   └── client.js                  # Frontend JavaScript
├── scripts/
│   ├── scrape.js                  # MOWRAM CLI scraper
│   ├── scrape-windy.js            # Windy CLI scraper
│   └── scrape-all.js              # Combined scraper (MOWRAM + Windy + AQ)
├── api/
│   └── index.js                   # Vercel serverless entry point
├── supabase/
│   ├── supabase_schema.sql        # MOWRAM database schema
│   ├── windy_schema.sql           # Windy database schema
│   └── functions/
│       ├── weather-scraper/       # MOWRAM Supabase Edge Function (Deno)
│       │   └── index.ts
│       └── windy-scraper/         # Windy Supabase Edge Function (Deno)
│           └── index.ts
├── tests/
│   └── weatherScraper.test.js     # Test files
├── .github/
│   └── workflows/
│       └── weather-scraper.yml    # GitHub Actions daily cron
├── .env.example                   # Environment variables template
├── package.json                   # Project dependencies & scripts
├── vercel.json                    # Vercel deployment & cron config
├── WINDY_API.md                   # Windy API documentation
└── README.md                      # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Supabase account and project
- Windy API key ([get one here](https://api.windy.com/keys))

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/SCI-Dev-Team/weather_scraper.git
   cd weather_scraper
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   WINDY_API_KEY=your-windy-api-key-here
   PORT=3001
   NODE_ENV=development
   ```

4. **Set up database**
   - Go to your Supabase project **SQL Editor**
   - Run `supabase/supabase_schema.sql` (MOWRAM tables)
   - Run `supabase/windy_schema.sql` (Windy tables)

5. **Start the development server**

   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3001`

## 📚 API Documentation

### MOWRAM Endpoints

#### Get Weather Data

**GET** `/api/weather`

| Parameter | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| `areaId`  | integer | Province area ID (1–24, 32)         |
| `date`    | string  | Date in YYYY-MM-DD format           |
| `limit`   | integer | Limit number of results             |

```bash
curl "http://localhost:3001/api/weather?areaId=9&date=2026-02-28"
```

#### Get All Provinces

**GET** `/api/provinces`

```bash
curl "http://localhost:3001/api/provinces"
```

#### Trigger MOWRAM Scraping

**POST** `/api/scrape`

```bash
curl -X POST "http://localhost:3001/api/scrape"
```

#### Check MOWRAM Scraping Status

**GET** `/api/scrape/status`

```bash
curl "http://localhost:3001/api/scrape/status"
```

---

### Windy Endpoints

#### Get Windy Forecast Data

**GET** `/api/windy/forecast`

| Parameter | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| `areaId`  | integer | Province area ID (1–24, 32)         |
| `date`    | string  | Date in YYYY-MM-DD format           |
| `model`   | string  | Model name (`gfs`, `gfsWave`)       |
| `limit`   | integer | Limit number of results             |

```bash
curl "http://localhost:3001/api/windy/forecast?areaId=9&model=gfs"
```

#### Trigger Windy Forecast Scraping

**POST** `/api/windy/scrape`

| Parameter | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| `areaId`  | integer | Scrape a single province (optional) |
| `force`   | boolean | Skip duplicate check (`true/false`) |

```bash
# All provinces
curl -X POST "http://localhost:3001/api/windy/scrape"

# Single province, force mode
curl -X POST "http://localhost:3001/api/windy/scrape?areaId=9&force=true"
```

#### Check Windy Scraping Status

**GET** `/api/windy/scrape/status`

```bash
curl "http://localhost:3001/api/windy/scrape/status"
```

#### Get Air Quality Data

**GET** `/api/windy/air-quality`

| Parameter | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| `areaId`  | integer | Province area ID (1–24, 32)         |
| `date`    | string  | Date in YYYY-MM-DD format           |
| `limit`   | integer | Limit number of results             |

```bash
curl "http://localhost:3001/api/windy/air-quality?areaId=9"
```

#### Trigger Air Quality Scraping

**POST** `/api/windy/air-quality/scrape`

| Parameter | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| `areaId`  | integer | Scrape a single province (optional) |
| `force`   | boolean | Skip duplicate check (`true/false`) |

```bash
curl -X POST "http://localhost:3001/api/windy/air-quality/scrape"
```

---

### Health Check

**GET** `/api/health`

```bash
curl "http://localhost:3001/api/health"
```

## 🛠️ Available Scripts

```bash
# ── Server ──────────────────────────────────────────
npm start                 # Start production server
npm run dev               # Start dev server with auto-reload

# ── MOWRAM Scraping ────────────────────────────────
npm run scrape            # Scrape MOWRAM weather data

# ── Windy Scraping ─────────────────────────────────
npm run scrape:windy      # Scrape Windy forecast (all provinces)
npm run scrape:windy:aq   # Scrape Windy air quality (all provinces)
npm run scrape:windy:all  # Scrape Windy forecast + air quality

# ── Combined ───────────────────────────────────────
npm run scrape:all        # Scrape everything (MOWRAM + Windy + AQ)

# ── Code Quality ───────────────────────────────────
npm run lint              # Lint code
npm run lint:fix          # Fix lint issues
npm run format            # Format code with Prettier
npm run format:check      # Check formatting
```

### Windy CLI Options

```bash
# Scrape a specific province
node scripts/scrape-windy.js --area 9

# Scrape air quality only
node scripts/scrape-windy.js --air-quality

# Scrape all data (forecast + air quality)
node scripts/scrape-windy.js --all

# Force scrape (skip duplicate check)
node scripts/scrape-windy.js --all --force
```

## 🗂️ Database Schema

### MOWRAM Tables (`supabase_schema.sql`)

| Table              | Description                              |
| ------------------ | ---------------------------------------- |
| `areas`            | Province info (area_id, name)            |
| `hourly_forecast`  | Hourly forecasts (temperature, humidity, wind, weather) |
| `daily_forecast`   | Daily summaries (min/max temperature & humidity) |

### Windy Tables (`windy_schema.sql`)

| Table                | Description                              |
| -------------------- | ---------------------------------------- |
| `windy_forecast`     | Hourly GFS forecast data (temperature, wind, pressure, clouds, precipitation, waves) |
| `windy_air_quality`  | CAMS air quality data (SO₂, dust, CO)    |

All tables have:
- **Row Level Security (RLS)** enabled
- **Service role** has full CRUD access
- **Public** has read-only access
- **Indexes** on `area_id`, `forecast_date`, and composite keys

## ⏰ Automated Scheduling

The scraper runs automatically daily at **1:00 AM Cambodia time** (6:00 PM UTC) via three scheduling systems:

### 1. GitHub Actions (`.github/workflows/weather-scraper.yml`)

| Step | Script | Description |
| ---- | ------ | ----------- |
| 1    | `npm run scrape` | MOWRAM weather data |
| 2    | `npm run scrape:windy:all` | Windy forecast + air quality |

**Required GitHub Secrets:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WINDY_API_KEY`

### 2. Vercel Cron (`vercel.json`)

| Time (UTC)  | Endpoint                       | Description          |
| ----------- | ------------------------------ | -------------------- |
| `0 18 * * *`  | `POST /api/scrape`            | MOWRAM scraping      |
| `5 18 * * *`  | `POST /api/windy/scrape`      | Windy forecast       |
| `10 18 * * *` | `POST /api/windy/air-quality/scrape` | Windy air quality |

### 3. Supabase Edge Functions

```bash
# Deploy MOWRAM scraper
supabase functions deploy weather-scraper

# Deploy Windy scraper
supabase functions deploy windy-scraper

# Set Windy API key secret
supabase secrets set WINDY_API_KEY=your-key-here
```

## 🏗️ Architecture

### Data Sources

| Source  | Method         | Model(s)              | Data                                    |
| ------- | -------------- | --------------------- | --------------------------------------- |
| MOWRAM  | HTML scraping  | —                     | Temperature, humidity, wind, weather    |
| Windy   | REST API (POST)| `gfs`                 | Temperature, wind, pressure, clouds, precipitation, CAPE |
| Windy   | REST API (POST)| `gfsWave`             | Wave height, period, direction (coastal only) |
| Windy   | REST API (POST)| `cams`                | SO₂, dust, CO (air quality)             |

### Coastal Provinces

Wave data is fetched separately using the `gfsWave` model for these provinces:

> Kampot, Kep, Koh Kong, Preah Sihanouk

### Data Flow

```
┌──────────────────┐     ┌──────────────────┐
│  cambodiameteo   │     │   Windy API v2   │
│  (HTML scraping) │     │  (Point Forecast) │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
    weatherScraper.js       windyScraper.js
         │                        │
         └────────┬───────────────┘
                  │
           ┌──────▼──────┐
           │   Supabase   │
           │  PostgreSQL   │
           └──────┬───────┘
                  │
           ┌──────▼──────┐
           │  REST API    │
           │  (routes.js) │
           └──────┬───────┘
                  │
           ┌──────▼──────┐
           │  Dashboard   │
           │  (index.html)│
           └──────────────┘
```

### Duplicate Prevention

Both scrapers check for existing data before inserting:

- **MOWRAM**: Checks by `area_id` + `forecast_date`
- **Windy Forecast**: Checks by `area_id` + `model` + today's `forecast_date`
- **Windy Air Quality**: Checks by `area_id` + today's `forecast_date`

Use `?force=true` (API) or `--force` (CLI) to bypass duplicate checks.

## 🔧 Configuration

```javascript
// src/config/index.js
export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: { url, serviceRoleKey },
  scraper: { baseUrl, dataRetentionDays: 14, requestTimeout: 30000 },
  windy: { apiKey },
  cors: { allowedOrigins },
};
```

## 📦 Deployment

### Vercel

```bash
# Deploy to Vercel
vercel deploy

# Required environment variables in Vercel dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
# WINDY_API_KEY
```

### Supabase Edge Functions

```bash
# Deploy both edge functions
supabase functions deploy weather-scraper
supabase functions deploy windy-scraper

# Set secrets
supabase secrets set WINDY_API_KEY=your-key-here
```

## 🔒 Environment Variables

| Variable                       | Description                            | Required |
| ------------------------------ | -------------------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`     | Supabase project URL                   | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY`    | Supabase service role key              | Yes      |
| `WINDY_API_KEY`                | Windy Point Forecast API key           | Yes      |
| `PORT`                         | Server port (default: 3001)            | No       |
| `NODE_ENV`                     | Environment (development/production)   | No       |
| `ALLOWED_ORIGINS`              | CORS allowed origins (comma-separated) | No       |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

Developed by **SCI Dev Team** for MOWRAM (Ministry of Water Resources and Meteorology) Cambodia

## 🙏 Acknowledgments

- MOWRAM weather data sourced from [cambodiameteo.com](http://cambodiameteo.com)
- Forecast & air quality data from [Windy API](https://api.windy.com/)
- Built with [Supabase](https://supabase.com)
- Deployed on [Vercel](https://vercel.com)

---

**v2.0.0** — MOWRAM + Windy Point Forecast + Air Quality Integration
