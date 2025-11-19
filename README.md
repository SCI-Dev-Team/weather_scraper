# MOWRAM Weather Scraper

A professional weather data scraping and API service for Cambodia's meteorological data from [cambodiameteo.com](http://cambodiameteo.com/forecast).

## 🌟 Features

- **Automated Weather Scraping**: Fetches weather data for all 25 Cambodian provinces
- **RESTful API**: Clean API endpoints for accessing weather data
- **Data Persistence**: Stores data in Supabase with automatic cleanup
- **Duplicate Prevention**: Smart checking to avoid redundant data scraping
- **Background Processing**: Non-blocking scraping operations
- **Modern Architecture**: Modular, maintainable codebase following Node.js best practices

## 📁 Project Structure

```
weather_scraper/
├── src/
│   ├── api/
│   │   └── routes.js          # API route handlers
│   ├── config/
│   │   ├── database.js        # Database client & validation
│   │   └── index.js           # Central configuration
│   ├── constants/
│   │   └── provinces.js       # Province mappings
│   ├── services/
│   │   └── weatherScraper.js  # Core scraping logic
│   ├── utils/
│   │   ├── dateHelpers.js     # Date utilities
│   │   └── logger.js          # Logging utility
│   └── server.js              # Main server entry point
├── public/
│   ├── index.html             # Frontend UI
│   └── client.js              # Frontend JavaScript
├── scripts/
│   └── scrape.js              # CLI scraping script
├── supabase/
│   ├── functions/             # Supabase Edge Functions
│   └── supabase_schema.sql    # Database schema
├── tests/                     # Test files (coming soon)
├── .env.example               # Environment variables template
├── .eslintrc.json            # ESLint configuration
├── .prettierrc.json          # Prettier configuration
├── .gitignore                # Git ignore rules
├── package.json              # Project dependencies
├── vercel.json               # Vercel deployment config
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
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

   Edit `.env` and add your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   PORT=3001
   NODE_ENV=development
   ```

4. **Set up database**
   - Go to your Supabase project SQL Editor
   - Run the SQL from `supabase/supabase_schema.sql`

5. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3001`

## 📚 API Documentation

### Get Weather Data

**GET** `/api/weather`

Retrieve weather forecast data from the database.

**Query Parameters:**

- `areaId` (optional): Province area ID (1-24, 32)
- `date` (optional): Date in YYYY-MM-DD format
- `limit` (optional): Limit number of results

**Example:**

```bash
curl "http://localhost:3001/api/weather?areaId=9&date=2025-11-19"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "hourly": [...],
    "daily": [...]
  }
}
```

### Get All Provinces

**GET** `/api/provinces`

Get list of all provinces/areas.

**Example:**

```bash
curl "http://localhost:3001/api/provinces"
```

### Trigger Manual Scraping

**POST** `/api/scrape`

Manually trigger weather data scraping for all provinces.

**Example:**

```bash
curl -X POST "http://localhost:3001/api/scrape"
```

**Response:**

```json
{
  "success": true,
  "message": "Scraping started in background. Check /api/scrape/status for progress."
}
```

### Check Scraping Status

**GET** `/api/scrape/status`

Check the current scraping status and last result.

**Example:**

```bash
curl "http://localhost:3001/api/scrape/status"
```

**Response:**

```json
{
  "isScrapingInProgress": false,
  "lastScrapeResult": {
    "total": 25,
    "successful": 23,
    "skipped": 2,
    "failed": 0,
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
```

### Health Check

**GET** `/api/health`

Check if the server is running.

**Example:**

```bash
curl "http://localhost:3001/api/health"
```

## 🛠️ Available Scripts

```bash
# Start production server
npm start

# Start development server with auto-reload
npm run dev

# Run weather scraping manually
npm run scrape

# Lint code
npm run lint

# Fix lint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check
```

## 🗂️ Database Schema

### Tables

1. **areas** - Stores province information
   - `id`: Serial primary key
   - `area_id`: Unique area identifier
   - `name`: Province name
   - `created_at`: Timestamp

2. **hourly_forecast** - Hourly weather forecasts
   - `id`: UUID primary key
   - `area_id`: References areas(area_id)
   - `forecast_date`: Date (YYYY-MM-DD)
   - `period`: Morning/Afternoon/Night
   - `humidity`, `temperature`, `wind_speed`, etc.
   - `created_at`: Timestamp

3. **daily_forecast** - Daily weather summaries
   - `id`: UUID primary key
   - `area_id`: References areas(area_id)
   - `forecast_date`: Date (YYYY-MM-DD)
   - `max_humidity`, `max_temperature`, etc.
   - `created_at`: Timestamp

## 🏗️ Architecture

### Modular Design

The project follows a clean, modular architecture:

- **Config Layer**: Centralized configuration and environment management
- **Service Layer**: Business logic for weather scraping
- **API Layer**: HTTP route handlers
- **Utils**: Reusable utility functions
- **Constants**: Shared constants and mappings

### Data Flow

1. Client requests weather data via API
2. API routes handle the request
3. Service layer fetches from database or triggers scraping
4. Scraper parses HTML and stores in Supabase
5. Response sent back to client

## 🔧 Configuration

All configuration is managed through environment variables and the config module:

```javascript
// src/config/index.js
export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    /* ... */
  },
  scraper: {
    /* ... */
  },
  cors: {
    /* ... */
  },
};
```

## 📦 Deployment

### Vercel

The project includes a `vercel.json` configuration for easy Vercel deployment:

```bash
vercel deploy
```

Configure environment variables in your Vercel project settings.

### Supabase Edge Functions

Deploy the edge function for scheduled scraping:

```bash
cd supabase/functions
supabase functions deploy weather-scraper
```

## 🔒 Environment Variables

| Variable                    | Description                            | Required |
| --------------------------- | -------------------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | Your Supabase project URL              | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key              | Yes      |
| `PORT`                      | Server port (default: 3001)            | No       |
| `NODE_ENV`                  | Environment (development/production)   | No       |
| `ALLOWED_ORIGINS`           | CORS allowed origins (comma-separated) | No       |

## 🧪 Testing

Testing framework coming soon. Contributions welcome!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

Developed for MOWRAM (Ministry of Water Resources and Meteorology) Cambodia

## 🙏 Acknowledgments

- Weather data sourced from [cambodiameteo.com](http://cambodiameteo.com)
- Built with [Supabase](https://supabase.com)
- Deployed on [Vercel](https://vercel.com)

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Note**: This is a restructured professional version (v2.0.0) of the weather scraper project.
