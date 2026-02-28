# Windy API Integration

This document covers the Windy API integration for the Cambodia Weather Scraper, detailing **what data is scraped**, **how to use it**, and **what each API provides**.

---

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [1. Point Forecast API](#1-point-forecast-api)
- [2. Map Forecast API (Frontend)](#2-map-forecast-api-frontend)
- [3. Windy Plugins API (Frontend)](#3-windy-plugins-api-frontend)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Important Data You Can Scrape](#important-data-you-can-scrape)

---

## Overview

| Windy API          | Type          | Integrated | What It Provides                                    |
| ------------------ | ------------- | ---------- | --------------------------------------------------- |
| Point Forecast API | Backend/Data  | ✅ Yes     | Hourly weather forecasts for any coordinate          |
| Map Forecast API   | Frontend/Tile | 📋 Docs   | Weather map overlay tiles (wind, rain, clouds, etc.) |
| Windy Plugins API  | Frontend/SDK  | 📋 Docs   | Embeddable interactive Windy maps                    |

---

## Setup

### 1. Get API Keys

Go to **https://api.windy.com/keys** and create:

- A **Point Forecast API** key

### 2. Add to `.env`

```env
# Windy API Keys
WINDY_API_KEY=your_point_forecast_api_key_here
```

### 3. Run Database Migration

Execute `supabase/windy_schema.sql` in your Supabase SQL Editor to create the required tables.

---

## 1. Point Forecast API

**Endpoint:** `POST https://api.windy.com/api/point-forecast/v2`

The most valuable API — provides **machine-readable hourly forecast data** for any GPS coordinate.

### What You Can Scrape

| Category         | Parameter          | Data Field                   | Unit    | Description                            |
| ---------------- | ------------------ | ---------------------------- | ------- | -------------------------------------- |
| **Temperature**  | `temp`             | `temp-surface`               | Kelvin  | Air temperature                        |
|                  | `dewpoint`         | `dewpoint-surface`           | Kelvin  | Dew point temperature                  |
| **Humidity**     | `rh`               | `rh-surface`                 | %       | Relative humidity                      |
| **Pressure**     | `pressure`         | `pressure-surface`           | Pa      | Atmospheric pressure                   |
| **Wind**         | `wind`             | `wind_u-surface`, `wind_v-surface` | m/s | Wind speed & direction (2D vector)     |
|                  | `windGust`         | `gust-surface`               | m/s     | Wind gust speed                        |
| **Precipitation**| `precip`           | `past3hprecip-surface`       | mm      | Total 3h precipitation                 |
|                  | `snowPrecip`       | `past3hsnowprecip-surface`   | mm      | Snowfall (3h)                          |
|                  | `convPrecip`       | `past3hconvprecip-surface`   | mm      | Convective precipitation (3h)          |
|                  | `ptype`            | `ptype-surface`              | int     | Type: 0=none, 1=rain, 5=snow, etc.    |
| **Clouds**       | `lclouds`          | `lclouds-surface`            | %       | Low cloud coverage (>800hPa)           |
|                  | `mclouds`          | `mclouds-surface`            | %       | Medium cloud coverage (450-800hPa)     |
|                  | `hclouds`          | `hclouds-surface`            | %       | High cloud coverage (<450hPa)          |
| **Storms**       | `cape`             | `cape-surface`               | J/kg    | Convective energy (storm indicator)    |
| **Waves**        | `waves`            | `waves_height/period/direction-surface` | m/s/° | Wave data (coastal only) |
| **Air Quality**  | `so2sm`            | `chem_so2sm-surface`         | µg/m³   | Sulfur dioxide (CAMS model)            |
|                  | `dustsm`           | `chem_dustsm-surface`        | µg/m³   | Dust particles (CAMS model)            |
|                  | `cosc`             | `chem_cosc-surface`          | µg/m³   | Carbon monoxide (CAMS model)           |

### Forecast Models

| Model       | Coverage                | Best For                    |
| ----------- | ----------------------- | --------------------------- |
| **GFS**     | 🌍 Global              | Cambodia (default)          |
| **CAMS**    | 🌍 Global              | Air quality data only       |
| ICON EU     | Europe only             | ❌ Not for Cambodia         |
| AROME       | France only             | ❌ Not for Cambodia         |
| NAM (CONUS) | USA only                | ❌ Not for Cambodia         |

### Altitude Levels

Data can be requested at different atmospheric pressure levels:

`surface`, `1000h`, `950h`, `925h`, `900h`, `850h`, `800h`, `700h`, `600h`, `500h`, `400h`, `300h`, `200h`, `150h`

Default: `surface` (ground level).

### Usage Examples

```bash
# Scrape all provinces
curl -X POST http://localhost:3001/api/windy/scrape

# Scrape single province (Phnom Penh = area 9)
curl -X POST "http://localhost:3001/api/windy/scrape?areaId=9"

# Get forecast data
curl "http://localhost:3001/api/windy/forecast?areaId=9"
curl "http://localhost:3001/api/windy/forecast?areaId=9&date=2026-02-28&model=gfs"

# Scrape air quality (CAMS model)
curl -X POST http://localhost:3001/api/windy/air-quality/scrape
curl "http://localhost:3001/api/windy/air-quality?areaId=9"
```

---

## 2. Map Forecast API (Frontend)

**Not a data-scraping API** — this provides **weather map tiles** for embedding visual weather maps.

### What It Provides

- Wind layer tiles
- Temperature overlays
- Precipitation/rain radar
- Cloud coverage visualization
- Pressure isobars
- Wave height maps

### How to Use (Frontend Only)

The Map Forecast API is used with **Leaflet** or similar mapping libraries:

```html
<!-- Example: Windy weather tiles on a Leaflet map -->
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script>
  const map = L.map('map').setView([11.56, 104.93], 7); // Cambodia center
  
  // Base map tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  
  // Windy weather overlay tiles
  L.tileLayer(
    'https://tiles.windy.com/tiles/v10.0/{overlay}/{level}/{z}/{x}/{y}.png?key=YOUR_MAP_FORECAST_KEY',
    {
      overlay: 'wind',  // Options: wind, temp, rain, clouds, pressure, waves
      level: 'surface',
      opacity: 0.6,
    }
  ).addTo(map);
</script>
```

> 📖 Full docs: https://api.windy.com/map-forecast/docs

---

## 3. Windy Plugins API (Frontend)

**Not a data-scraping API** — this is a **JavaScript SDK** for embedding a fully interactive Windy map widget.

### What It Provides

- Full interactive Windy map (same as windy.com)
- Weather layer switching (wind, rain, temperature, etc.)
- Location markers and custom overlays
- Forecast timeline scrubber
- Custom plugin development

### How to Use (Frontend Only)

```html
<script src="https://unpkg.com/@nicely/windy-plugins-api@0.3.0/dist/boot.js"></script>
<div id="windy" style="width: 100%; height: 500px;"></div>

<script>
  windyInit({
    key: 'YOUR_WINDY_PLUGINS_API_KEY',
    lat: 11.56,
    lon: 104.93,
    zoom: 7,
  }, windyAPI => {
    const { map, store, overlays } = windyAPI;
    
    // Switch to rain overlay
    store.set('overlay', 'rain');
    
    // Add custom marker
    L.marker([11.56, 104.93])
      .addTo(map)
      .bindPopup('Phnom Penh');
  });
</script>
```

> 📖 Full docs: https://api.windy.com/plugins/docs
> 📖 Examples: https://github.com/nicely/windy-plugins-api

---

## API Endpoints

### Windy Forecast

| Method | Endpoint                          | Description                            |
| ------ | --------------------------------- | -------------------------------------- |
| GET    | `/api/windy/forecast`             | Get forecast data from DB              |
| POST   | `/api/windy/scrape`               | Scrape all provinces (background)      |
| POST   | `/api/windy/scrape?areaId=9`      | Scrape single province                 |
| GET    | `/api/windy/scrape/status`        | Check scraping progress                |

**Query parameters for GET:** `areaId`, `date` (YYYY-MM-DD), `model` (gfs), `limit`

### Air Quality

| Method | Endpoint                              | Description                        |
| ------ | ------------------------------------- | ---------------------------------- |
| GET    | `/api/windy/air-quality`              | Get air quality data from DB       |
| POST   | `/api/windy/air-quality/scrape`       | Scrape all provinces               |
| POST   | `/api/windy/air-quality/scrape?areaId=9` | Scrape single province          |

**Query parameters for GET:** `areaId`, `date`, `limit`

---

## Database Schema

Two Supabase tables (see `supabase/windy_schema.sql`):

### `windy_forecast`
Stores hourly point forecast data with temperature, wind, precipitation, clouds, waves, and atmospheric data.

### `windy_air_quality`
Stores CAMS model air quality forecasts (SO₂, dust, CO).

---

## Important Data You Can Scrape

### 🌡️ Most Valuable for Cambodia Weather

1. **Temperature + Humidity** — Essential daily forecasting
2. **Wind Speed & Direction** — Critical for agriculture, fishing, aviation
3. **Precipitation (3h totals)** — Flood warnings, irrigation planning
4. **Cloud Coverage** — Solar energy, agriculture
5. **CAPE** — Thunderstorm/severe weather prediction
6. **Wave Data** — Fishing safety for Sihanoukville, Kampot, Kep, Koh Kong
7. **Air Quality (SO₂, Dust, CO)** — Public health, burning season monitoring

### 📊 Unique Data Not Available from cambodiameteo.com

| Data Point      | Available from Windy | Available from CambodiaMeteo |
| --------------- | -------------------- | ---------------------------- |
| Wind gust       | ✅                   | ❌                           |
| Precipitation   | ✅ (3h accumulation) | ❌                           |
| Cloud layers    | ✅ (low/mid/high)    | ❌                           |
| CAPE (storms)   | ✅                   | ❌                           |
| Wave data       | ✅                   | ❌                           |
| Air quality     | ✅ (SO₂, dust, CO)   | ❌                           |
| Pressure        | ✅                   | ❌                           |
| Dew point       | ✅                   | ❌                           |
| Precip type     | ✅                   | ❌                           |

---

## Rate Limits

| Plan        | Point Forecast         |
| ----------- | ---------------------- |
| Free        | ~1,000 requests/day    |
| Professional| Higher limits          |

The scraper includes a 1-second delay between province requests to respect rate limits. Scraping all 25 provinces takes ~25 seconds.
