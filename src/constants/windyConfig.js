/**
 * Windy API Configuration Constants
 * Coordinates for Cambodian provinces and API parameter mappings
 */

// ── API Endpoints ──────────────────────────────────────────────────────────
export const WINDY_ENDPOINTS = {
  pointForecast: 'https://api.windy.com/api/point-forecast/v2',
};

// ── Forecast Models ────────────────────────────────────────────────────────
// GFS is the best global model for Cambodia (Southeast Asia)
export const WINDY_MODELS = {
  GFS: 'gfs',
  GFS_WAVE: 'gfsWave', // Global wave model (for coastal wave data)
  ICON_EU: 'iconEu',   // Europe only — not useful for Cambodia
  AROME: 'arome',      // France only
};

export const DEFAULT_MODEL = WINDY_MODELS.GFS;

// ── Forecast Parameters ────────────────────────────────────────────────────
// Key parameters available from Windy Point Forecast API
export const WINDY_PARAMETERS = {
  // Core weather
  TEMPERATURE: 'temp',
  DEW_POINT: 'dewpoint',
  RELATIVE_HUMIDITY: 'rh',
  PRESSURE: 'pressure',

  // Wind
  WIND: 'wind', // returns wind_u and wind_v components
  WIND_GUST: 'windGust', // gust speed

  // Precipitation
  PRECIPITATION: 'precip', // total precipitation (3h accumulation)
  SNOW_PRECIPITATION: 'snowPrecip', // snow precipitation (3h)
  CONVECTIVE_PRECIP: 'convPrecip', // convective precipitation (3h)

  // Clouds
  LOW_CLOUDS: 'lclouds',
  MEDIUM_CLOUDS: 'mclouds',
  HIGH_CLOUDS: 'hclouds',

  // Atmospheric
  CAPE: 'cape', // convective available potential energy (storm indicator)
  PRECIP_TYPE: 'ptype', // 0=none, 1=rain, 5=snow, 3=freezing rain, 7=mix, 8=ice

  // Waves (coastal provinces)
  WAVES: 'waves', // height, period, direction

  // Air quality (CAMS model only)
  SO2: 'so2sm',
  DUST: 'dustsm',
  CO: 'cosc',
};

// Default parameter set for Cambodian weather scraping
export const DEFAULT_PARAMETERS = [
  WINDY_PARAMETERS.TEMPERATURE,
  WINDY_PARAMETERS.DEW_POINT,
  WINDY_PARAMETERS.RELATIVE_HUMIDITY,
  WINDY_PARAMETERS.PRESSURE,
  WINDY_PARAMETERS.WIND,
  WINDY_PARAMETERS.WIND_GUST,
  WINDY_PARAMETERS.PRECIPITATION,
  WINDY_PARAMETERS.LOW_CLOUDS,
  WINDY_PARAMETERS.MEDIUM_CLOUDS,
  WINDY_PARAMETERS.HIGH_CLOUDS,
  WINDY_PARAMETERS.CAPE,
  WINDY_PARAMETERS.PRECIP_TYPE,
];

// Coastal-only parameter set (waves require the gfsWave model, NOT gfs)
// Use WAVE_PARAMETERS with model 'gfsWave' in a separate request
export const WAVE_PARAMETERS = [
  WINDY_PARAMETERS.WAVES,
];

// Air quality parameters (requires CAMS model)
export const AIR_QUALITY_PARAMETERS = [
  WINDY_PARAMETERS.SO2,
  WINDY_PARAMETERS.DUST,
  WINDY_PARAMETERS.CO,
];

// ── Altitude Levels ────────────────────────────────────────────────────────
export const DEFAULT_LEVELS = ['surface'];
export const MULTI_LEVELS = ['surface', '950h', '850h', '700h', '500h'];

// ── Cambodia Province Coordinates ──────────────────────────────────────────
// Latitude/Longitude for each province capital/center (matching area_id)
export const PROVINCE_COORDINATES = {
  1: { lat: 10.99, lon: 104.79, name: 'Takeo', coastal: false },
  2: { lat: 11.09, lon: 105.80, name: 'Svay Rieng', coastal: false },
  3: { lat: 13.53, lon: 105.97, name: 'Stung Treng', coastal: false },
  4: { lat: 13.36, lon: 103.86, name: 'Siem Reap', coastal: false },
  5: { lat: 13.74, lon: 107.00, name: 'Ratanakiri', coastal: false },
  6: { lat: 11.49, lon: 105.32, name: 'Prey Veng', coastal: false },
  7: { lat: 13.79, lon: 104.98, name: 'Preah Vihear', coastal: false },
  8: { lat: 12.54, lon: 103.92, name: 'Pursat', coastal: false },
  9: { lat: 11.56, lon: 104.93, name: 'Phnom Penh', coastal: false },
  10: { lat: 14.18, lon: 103.72, name: 'Oddar Meanchey', coastal: false },
  11: { lat: 12.45, lon: 107.19, name: 'Mondulkiri', coastal: false },
  12: { lat: 10.63, lon: 103.52, name: 'Preah Sihanouk', coastal: true },
  13: { lat: 12.85, lon: 102.61, name: 'Pailin', coastal: false },
  14: { lat: 12.49, lon: 106.02, name: 'Kratie', coastal: false },
  15: { lat: 11.22, lon: 104.89, name: 'Kandal', coastal: false },
  16: { lat: 10.61, lon: 104.18, name: 'Kampot', coastal: true },
  17: { lat: 12.71, lon: 104.89, name: 'Kampong Thom', coastal: false },
  18: { lat: 11.45, lon: 104.52, name: 'Kampong Speu', coastal: false },
  19: { lat: 12.25, lon: 104.67, name: 'Kampong Chhnang', coastal: false },
  20: { lat: 11.99, lon: 105.46, name: 'Kampong Cham', coastal: false },
  21: { lat: 10.48, lon: 104.32, name: 'Kep', coastal: true },
  22: { lat: 11.62, lon: 103.01, name: 'Koh Kong', coastal: true },
  23: { lat: 13.59, lon: 102.98, name: 'Banteay Meanchey', coastal: false },
  24: { lat: 13.10, lon: 103.20, name: 'Battambang', coastal: false },
  32: { lat: 12.05, lon: 105.85, name: 'Tboung Khmum', coastal: false },
};

// Coastal province IDs (for wave data scraping)
export const COASTAL_PROVINCE_IDS = Object.entries(PROVINCE_COORDINATES)
  .filter(([_, coord]) => coord.coastal)
  .map(([id]) => parseInt(id));

// ── Precipitation Type Mapping ─────────────────────────────────────────────
export const PRECIP_TYPE_MAP = {
  0: { en: 'No precipitation', kh: 'គ្មានទឹកភ្លៀង' },
  1: { en: 'Rain', kh: 'ភ្លៀង' },
  3: { en: 'Freezing rain', kh: 'ភ្លៀងត្រជាក់កក' },
  5: { en: 'Snow', kh: 'ព្រិល' },
  7: { en: 'Rain and snow mix', kh: 'ភ្លៀងនិងព្រិលចម្រុះ' },
  8: { en: 'Ice pellets', kh: 'គ្រាប់ទឹកកក' },
};

// ── Wind Direction Helper ──────────────────────────────────────────────────
/**
 * Convert wind u/v components to speed (m/s) and direction (degrees)
 * @param {number} u - West→East component (m/s)
 * @param {number} v - South→North component (m/s)
 * @returns {{ speed: number, direction: number, cardinal: string }}
 */
export function windFromComponents(u, v) {
  const speed = Math.sqrt(u * u + v * v);
  // Meteorological direction: where wind comes FROM
  let direction = (Math.atan2(-u, -v) * 180) / Math.PI;
  if (direction < 0) direction += 360;

  const cardinals = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const cardinal = cardinals[Math.round(direction / 22.5) % 16];

  return {
    speed: Math.round(speed * 100) / 100,
    direction: Math.round(direction * 10) / 10,
    cardinal,
  };
}
