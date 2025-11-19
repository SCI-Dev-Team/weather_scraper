# API Documentation

Complete API reference for the MOWRAM Weather Scraper service.

## Base URL

```
Development: http://localhost:3001
Production: https://your-domain.vercel.app
```

## Authentication

Currently, the API is public and does not require authentication. Consider adding authentication for production use.

---

## Endpoints

### 1. Health Check

Check if the API is running.

**Endpoint:** `GET /api/health`

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-11-19T10:00:00.000Z",
  "version": "2.0.0"
}
```

**Status Codes:**

- `200 OK` - Service is healthy

---

### 2. Get Weather Data

Retrieve weather forecast data with optional filters.

**Endpoint:** `GET /api/weather`

**Query Parameters:**

| Parameter | Type    | Required | Description                 |
| --------- | ------- | -------- | --------------------------- |
| `areaId`  | integer | No       | Province area ID (1-24, 32) |
| `date`    | string  | No       | Forecast date (YYYY-MM-DD)  |
| `limit`   | integer | No       | Maximum number of results   |

**Examples:**

```bash
# Get all weather data
curl "http://localhost:3001/api/weather"

# Get weather for Phnom Penh (area ID 9)
curl "http://localhost:3001/api/weather?areaId=9"

# Get weather for specific date
curl "http://localhost:3001/api/weather?date=2025-11-19"

# Get weather for specific area and date
curl "http://localhost:3001/api/weather?areaId=9&date=2025-11-19"

# Limit results
curl "http://localhost:3001/api/weather?limit=10"
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "hourly": [
      {
        "id": "uuid-here",
        "area_id": 9,
        "forecast_date": "2025-11-19",
        "period": "Morning",
        "humidity": "75-85%",
        "temperature": "24-28°C",
        "wind_speed": "10-20 km/h",
        "wind_direction_value": "NE",
        "wind_direction_image": "/images/wind_ne.png",
        "weather_value": "Partly Cloudy",
        "weather_image": "/images/partly_cloudy.png",
        "created_at": "2025-11-19T00:00:00.000Z"
      }
      // ... more records
    ],
    "daily": [
      {
        "id": "uuid-here",
        "area_id": 9,
        "forecast_date": "2025-11-19",
        "max_humidity": "90%",
        "max_temperature": "32°C",
        "min_humidity": "70%",
        "min_temperature": "24°C",
        "created_at": "2025-11-19T00:00:00.000Z"
      }
      // ... more records
    ]
  }
}
```

**Error Response (500 Internal Server Error):**

```json
{
  "success": false,
  "error": "Error message here"
}
```

---

### 3. Get All Provinces

Retrieve list of all provinces/areas.

**Endpoint:** `GET /api/provinces`

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "area_id": 1,
      "name": "តាកែវ",
      "created_at": "2025-11-19T00:00:00.000Z"
    },
    {
      "id": 2,
      "area_id": 9,
      "name": "ភ្នំពេញ",
      "created_at": "2025-11-19T00:00:00.000Z"
    }
    // ... more provinces
  ]
}
```

---

### 4. Trigger Scraping

Manually trigger weather data scraping for all provinces.

**Endpoint:** `POST /api/scrape`

**Request:**

```bash
curl -X POST "http://localhost:3001/api/scrape"
```

**Success Response (202 Accepted):**

```json
{
  "success": true,
  "message": "Scraping started in background. Check /api/scrape/status for progress."
}
```

**Already in Progress Response (429 Too Many Requests):**

```json
{
  "success": false,
  "message": "Scraping is already in progress. Please wait."
}
```

**Notes:**

- Scraping runs in the background (non-blocking)
- Check `/api/scrape/status` for progress
- Only one scraping operation can run at a time

---

### 5. Get Scraping Status

Check the current status of scraping operations.

**Endpoint:** `GET /api/scrape/status`

**Response (200 OK):**

```json
{
  "isScrapingInProgress": false,
  "lastScrapeResult": {
    "total": 25,
    "successful": 23,
    "skipped": 2,
    "failed": 0,
    "details": [
      {
        "success": true,
        "areaId": 1,
        "provinceName": "Takeo",
        "hourlyRecords": 6,
        "dailyRecords": 3
      },
      {
        "success": true,
        "skipped": true,
        "areaId": 9,
        "provinceName": "Phnom Penh"
      }
      // ... more details
    ],
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
```

**Response when never scraped:**

```json
{
  "isScrapingInProgress": false,
  "lastScrapeResult": null
}
```

---

## Province Area IDs

| Area ID | Province Name (EN) | Province Name (KH) |
| ------- | ------------------ | ------------------ |
| 1       | Takeo              | តាកែវ              |
| 2       | Svay Rieng         | ស្វាយរៀង           |
| 3       | Stung Treng        | ស្ទឹងត្រែង         |
| 4       | Siem Reap          | សៀមរាប             |
| 5       | Ratanakiri         | រតនគីរី            |
| 6       | Prey Veng          | ព្រៃវែង            |
| 7       | Preah Vihear       | ព្រះវិហារ          |
| 8       | Pursat             | ពោធិ៍សាត់          |
| 9       | Phnom Penh         | ភ្នំពេញ            |
| 10      | Oddar Meanchey     | ឧត្ដរមានជ័យ        |
| 11      | Mondulkiri         | មណ្ឌលគីរី          |
| 12      | Preah Sihanouk     | ព្រះសីហនុ          |
| 13      | Pailin             | ប៉ៃលិន             |
| 14      | Kratie             | ក្រចេះ             |
| 15      | Kandal             | កណ្ដាល             |
| 16      | Kampot             | កំពត               |
| 17      | Kampong Thom       | កំពង់ធំ            |
| 18      | Kampong Speu       | កំពង់ស្ពឺ          |
| 19      | Kampong Chhnang    | កំពង់ឆ្នាំង        |
| 20      | Kampong Cham       | កំពង់ចាម           |
| 21      | Kep                | កែប                |
| 22      | Koh Kong           | កោះកុង             |
| 23      | Banteay Meanchey   | បន្ទាយមានជ័យ       |
| 24      | Battambang         | បាត់ដំបង           |
| 32      | Tboung Khmum       | ត្បូងឃ្មុំ         |

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description here"
}
```

**Common HTTP Status Codes:**

- `200 OK` - Request successful
- `202 Accepted` - Request accepted, processing in background
- `404 Not Found` - Endpoint or resource not found
- `429 Too Many Requests` - Rate limit exceeded or operation in progress
- `500 Internal Server Error` - Server error occurred

---

## Rate Limiting

Currently, there's no rate limiting except for the scraping endpoint:

- Only one scraping operation can run at a time
- Attempting to start another will return `429 Too Many Requests`

**Recommendation:** Add rate limiting for production use.

---

## CORS

CORS is enabled for all origins (`*`) in development. For production, configure specific origins in the environment variables:

```env
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

---

## Data Retention

- Weather data older than 14 days is automatically deleted
- Cleanup runs before each scraping operation
- Configure retention period in `src/config/index.js`

---

## Scheduled Scraping

The API can be configured for automatic scraping via:

1. **Vercel Cron Jobs** (configured in `vercel.json`):
   - Runs daily at 6:00 PM (18:00 UTC)
   - Path: `POST /api/scrape`

2. **Supabase Edge Functions**:
   - Serverless function for scheduled execution
   - Configure via Supabase dashboard

---

## Client Integration Examples

### JavaScript/Fetch

```javascript
// Get weather for Phnom Penh
const response = await fetch('http://localhost:3001/api/weather?areaId=9');
const data = await response.json();

if (data.success) {
  console.log('Hourly:', data.data.hourly);
  console.log('Daily:', data.data.daily);
}
```

### cURL

```bash
# Pretty print JSON with jq
curl -s "http://localhost:3001/api/weather?areaId=9" | jq .
```

### Python

```python
import requests

response = requests.get('http://localhost:3001/api/weather', params={'areaId': 9})
data = response.json()

if data['success']:
    print('Hourly:', data['data']['hourly'])
    print('Daily:', data['data']['daily'])
```

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for API version history.

---

## Support

For API issues or questions:

1. Check this documentation
2. Review the [README.md](./README.md)
3. Open an issue on GitHub

---

**Last Updated:** November 19, 2025  
**API Version:** 2.0.0
