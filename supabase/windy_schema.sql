-- ═══════════════════════════════════════════════════════════════════════════
-- Windy API Database Schema
-- Run this SQL in your Supabase SQL Editor AFTER the main schema
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Windy Point Forecast Table ────────────────────────────────────────
-- Stores hourly forecast data from Windy Point Forecast API (GFS model)
-- Each row = one timestamp for one province
CREATE TABLE IF NOT EXISTS windy_forecast (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES areas(area_id) ON DELETE CASCADE,
  model TEXT NOT NULL DEFAULT 'gfs',
  forecast_date DATE NOT NULL,
  forecast_hour INTEGER NOT NULL,           -- UTC hour (0-23)
  forecast_timestamp TIMESTAMPTZ NOT NULL,  -- Full ISO timestamp

  -- Temperature & humidity
  temperature FLOAT,          -- Kelvin (convert to °C: val - 273.15)
  dewpoint FLOAT,             -- Kelvin
  relative_humidity FLOAT,    -- Percentage (%)
  pressure FLOAT,             -- Pascals (Pa)

  -- Wind
  wind_u FLOAT,               -- m/s (West→East component)
  wind_v FLOAT,               -- m/s (South→North component)
  wind_speed FLOAT,           -- m/s (computed from u,v)
  wind_direction FLOAT,       -- Degrees (meteorological, 0=N, 90=E)
  wind_cardinal TEXT,          -- Cardinal direction (N, NE, E, etc.)
  wind_gust FLOAT,            -- m/s (gust speed)

  -- Precipitation
  precipitation_3h FLOAT,     -- mm (3-hour accumulation)
  precipitation_type INTEGER, -- 0=none, 1=rain, 3=freezing, 5=snow, 7=mix, 8=ice
  precipitation_type_label TEXT,

  -- Clouds
  clouds_low FLOAT,           -- % coverage (below 800hPa)
  clouds_medium FLOAT,        -- % coverage (450-800hPa)
  clouds_high FLOAT,          -- % coverage (above 450hPa)

  -- Atmospheric
  cape FLOAT,                 -- J/kg (Convective Available Potential Energy)

  -- Waves (coastal provinces only)
  wave_height FLOAT,          -- meters
  wave_period FLOAT,          -- seconds
  wave_direction FLOAT,       -- degrees

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Windy Air Quality Table ──────────────────────────────────────────
-- Stores air quality data from Windy CAMS model
CREATE TABLE IF NOT EXISTS windy_air_quality (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES areas(area_id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecast_hour INTEGER NOT NULL,
  forecast_timestamp TIMESTAMPTZ NOT NULL,

  so2 FLOAT,    -- µg/m³ (Sulfur dioxide)
  dust FLOAT,   -- µg/m³ (Dust particles)
  co FLOAT,     -- µg/m³ (Carbon monoxide)

  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════════════

-- Windy Forecast indexes
CREATE INDEX IF NOT EXISTS idx_windy_forecast_area_id ON windy_forecast(area_id);
CREATE INDEX IF NOT EXISTS idx_windy_forecast_area_date ON windy_forecast(area_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_windy_forecast_model ON windy_forecast(model);
CREATE INDEX IF NOT EXISTS idx_windy_forecast_timestamp ON windy_forecast(forecast_timestamp);
CREATE INDEX IF NOT EXISTS idx_windy_forecast_date ON windy_forecast(forecast_date);

-- Air Quality indexes
CREATE INDEX IF NOT EXISTS idx_windy_aq_area_id ON windy_air_quality(area_id);
CREATE INDEX IF NOT EXISTS idx_windy_aq_area_date ON windy_air_quality(area_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_windy_aq_date ON windy_air_quality(forecast_date);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE windy_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE windy_air_quality ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can do everything on windy_forecast" ON windy_forecast
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on windy_air_quality" ON windy_air_quality
  FOR ALL USING (auth.role() = 'service_role');

-- Public read access
CREATE POLICY "Allow public read access to windy_forecast" ON windy_forecast
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to windy_air_quality" ON windy_air_quality
  FOR SELECT USING (true);
