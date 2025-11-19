-- Normalized Weather Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- 1. Provinces/Areas Table
CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  area_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Hourly Forecast Table
CREATE TABLE IF NOT EXISTS hourly_forecast (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES areas(area_id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL, -- Actual date (YYYY-MM-DD)
  period TEXT NOT NULL, -- 'Morning', 'Afternoon', 'Night'
  humidity TEXT,
  temperature TEXT,
  wind_speed TEXT,
  wind_direction_value TEXT,
  wind_direction_image TEXT,
  weather_value TEXT,
  weather_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Daily Forecast Table
CREATE TABLE IF NOT EXISTS daily_forecast (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES areas(area_id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL, -- Actual date (YYYY-MM-DD)
  max_humidity TEXT,
  max_temperature TEXT,
  min_humidity TEXT,
  min_temperature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hourly_forecast_area_id ON hourly_forecast(area_id);
CREATE INDEX IF NOT EXISTS idx_hourly_forecast_created_at ON hourly_forecast(created_at);
CREATE INDEX IF NOT EXISTS idx_hourly_forecast_area_date ON hourly_forecast(area_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_hourly_forecast_date ON hourly_forecast(forecast_date);

CREATE INDEX IF NOT EXISTS idx_daily_forecast_area_id ON daily_forecast(area_id);
CREATE INDEX IF NOT EXISTS idx_daily_forecast_created_at ON daily_forecast(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_forecast_area_date ON daily_forecast(area_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_daily_forecast_date ON daily_forecast(forecast_date);

CREATE INDEX IF NOT EXISTS idx_areas_area_id ON areas(area_id);

-- Enable Row Level Security (RLS)
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_forecast ENABLE ROW LEVEL SECURITY;

-- Create policies for areas table
CREATE POLICY "Service role can do everything on areas" ON areas
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access to areas" ON areas
  FOR SELECT
  USING (true);

-- Create policies for hourly_forecast table
CREATE POLICY "Service role can do everything on hourly_forecast" ON hourly_forecast
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access to hourly_forecast" ON hourly_forecast
  FOR SELECT
  USING (true);

-- Create policies for daily_forecast table
CREATE POLICY "Service role can do everything on daily_forecast" ON daily_forecast
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access to daily_forecast" ON daily_forecast
  FOR SELECT
  USING (true);

