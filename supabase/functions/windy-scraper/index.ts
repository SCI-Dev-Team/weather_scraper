// Supabase Edge Function for Windy Weather Scraping
// Runs on Deno — fetches Windy Point Forecast + Air Quality data for all Cambodian provinces

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// ─── Province Coordinates ──────────────────────────────────────────────────
const PROVINCE_COORDINATES: Record<number, { lat: number; lon: number; name: string; coastal: boolean }> = {
  1:  { lat: 10.99, lon: 104.79, name: "Takeo", coastal: false },
  2:  { lat: 11.09, lon: 105.80, name: "Svay Rieng", coastal: false },
  3:  { lat: 13.53, lon: 105.97, name: "Stung Treng", coastal: false },
  4:  { lat: 13.36, lon: 103.86, name: "Siem Reap", coastal: false },
  5:  { lat: 13.74, lon: 107.00, name: "Ratanakiri", coastal: false },
  6:  { lat: 11.49, lon: 105.32, name: "Prey Veng", coastal: false },
  7:  { lat: 13.79, lon: 104.98, name: "Preah Vihear", coastal: false },
  8:  { lat: 12.54, lon: 103.92, name: "Pursat", coastal: false },
  9:  { lat: 11.56, lon: 104.93, name: "Phnom Penh", coastal: false },
  10: { lat: 14.18, lon: 103.72, name: "Oddar Meanchey", coastal: false },
  11: { lat: 12.45, lon: 107.19, name: "Mondulkiri", coastal: false },
  12: { lat: 10.63, lon: 103.52, name: "Preah Sihanouk", coastal: true },
  13: { lat: 12.85, lon: 102.61, name: "Pailin", coastal: false },
  14: { lat: 12.49, lon: 106.02, name: "Kratie", coastal: false },
  15: { lat: 11.22, lon: 104.89, name: "Kandal", coastal: false },
  16: { lat: 10.61, lon: 104.18, name: "Kampot", coastal: true },
  17: { lat: 12.71, lon: 104.89, name: "Kampong Thom", coastal: false },
  18: { lat: 11.45, lon: 104.52, name: "Kampong Speu", coastal: false },
  19: { lat: 12.25, lon: 104.67, name: "Kampong Chhnang", coastal: false },
  20: { lat: 11.99, lon: 105.46, name: "Kampong Cham", coastal: false },
  21: { lat: 10.48, lon: 104.32, name: "Kep", coastal: true },
  22: { lat: 11.62, lon: 103.01, name: "Koh Kong", coastal: true },
  23: { lat: 13.59, lon: 102.98, name: "Banteay Meanchey", coastal: false },
  24: { lat: 13.10, lon: 103.20, name: "Battambang", coastal: false },
  32: { lat: 12.05, lon: 105.85, name: "Tboung Khmum", coastal: false },
};

const COASTAL_IDS = Object.entries(PROVINCE_COORDINATES)
  .filter(([_, c]) => c.coastal)
  .map(([id]) => parseInt(id));

const DEFAULT_PARAMETERS = [
  "temp", "dewpoint", "rh", "pressure",
  "wind", "windGust",
  "precip", "lclouds", "mclouds", "hclouds",
  "cape", "ptype",
];

const AQ_PARAMETERS = ["so2sm", "dustsm", "cosc"];

const PRECIP_TYPE_MAP: Record<number, string> = {
  0: "No precipitation", 1: "Rain", 3: "Freezing rain",
  5: "Snow", 7: "Rain and snow mix", 8: "Ice pellets",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function windFromComponents(u: number, v: number) {
  const speed = Math.sqrt(u * u + v * v);
  let direction = (Math.atan2(-u, -v) * 180) / Math.PI;
  if (direction < 0) direction += 360;
  const cardinals = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  const cardinal = cardinals[Math.round(direction / 22.5) % 16];
  return {
    speed: Math.round(speed * 100) / 100,
    direction: Math.round(direction * 10) / 10,
    cardinal,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPointForecast(
  apiKey: string,
  lat: number,
  lon: number,
  parameters: string[],
  model: string,
) {
  const body = { lat, lon, model, parameters, levels: ["surface"], key: apiKey };

  const res = await fetch("https://api.windy.com/api/point-forecast/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Windy API ${res.status}: ${text}`);
  }

  return res.json();
}

// ─── Main Handler ──────────────────────────────────────────────────────────

serve(async (_req: Request) => {
  try {
    const WINDY_API_KEY = Deno.env.get("WINDY_API_KEY");
    if (!WINDY_API_KEY) {
      return new Response(JSON.stringify({ error: "WINDY_API_KEY not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const todayDate = formatDate(new Date());
    const areaIds = Object.keys(PROVINCE_COORDINATES).map(Number);

    let forecastSuccess = 0;
    let forecastSkipped = 0;
    let forecastErrors = 0;
    let aqSuccess = 0;
    let aqSkipped = 0;
    let aqErrors = 0;

    // ── Point Forecast Scraping ──────────────────────────────────────

    for (const areaId of areaIds) {
      const coords = PROVINCE_COORDINATES[areaId];
      const model = "gfs";

      try {
        // Check duplicate
        const { data: existing } = await supabase
          .from("windy_forecast")
          .select("id")
          .eq("area_id", areaId)
          .eq("model", model)
          .eq("forecast_date", todayDate)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`⏭️  ${coords.name} forecast already scraped today`);
          forecastSkipped++;
          continue;
        }

        // Delete old data for this area
        await supabase.from("windy_forecast").delete().eq("area_id", areaId).eq("model", model);

        // Fetch from Windy API
        const raw = await fetchPointForecast(WINDY_API_KEY, coords.lat, coords.lon, DEFAULT_PARAMETERS, model);

        if (!raw || !raw.ts) {
          console.log(`❌ No data for ${coords.name}`);
          forecastErrors++;
          continue;
        }

        // Transform records
        const records = raw.ts.map((ts: number, i: number) => {
          const forecastTime = new Date(ts);
          const windU = raw["wind_u-surface"]?.[i] ?? 0;
          const windV = raw["wind_v-surface"]?.[i] ?? 0;
          const wind = windFromComponents(windU, windV);
          const ptype = raw["ptype-surface"]?.[i] ?? 0;

          return {
            area_id: areaId,
            model,
            forecast_date: formatDate(forecastTime),
            forecast_hour: forecastTime.getUTCHours(),
            forecast_timestamp: forecastTime.toISOString(),
            temperature: raw["temp-surface"]?.[i] ?? null,
            dewpoint: raw["dewpoint-surface"]?.[i] ?? null,
            relative_humidity: raw["rh-surface"]?.[i] ?? null,
            pressure: raw["pressure-surface"]?.[i] ?? null,
            wind_u: windU,
            wind_v: windV,
            wind_speed: wind.speed,
            wind_direction: wind.direction,
            wind_cardinal: wind.cardinal,
            wind_gust: raw["gust-surface"]?.[i] ?? null,
            precipitation_3h: raw["past3hprecip-surface"]?.[i] ?? null,
            precipitation_type: ptype,
            precipitation_type_label: PRECIP_TYPE_MAP[ptype] || null,
            clouds_low: raw["lclouds-surface"]?.[i] ?? null,
            clouds_medium: raw["mclouds-surface"]?.[i] ?? null,
            clouds_high: raw["hclouds-surface"]?.[i] ?? null,
            cape: raw["cape-surface"]?.[i] ?? null,
          };
        });

        // Coastal wave data (separate gfsWave fetch)
        if (COASTAL_IDS.includes(areaId) && records.length > 0) {
          try {
            const waveRaw = await fetchPointForecast(WINDY_API_KEY, coords.lat, coords.lon, ["waves"], "gfsWave");
            if (waveRaw && waveRaw.ts) {
              const waveLookup: Record<number, any> = {};
              waveRaw.ts.forEach((ts: number, i: number) => {
                waveLookup[ts] = {
                  wave_height: waveRaw["waves_height-surface"]?.[i] ?? null,
                  wave_period: waveRaw["waves_period-surface"]?.[i] ?? null,
                  wave_direction: waveRaw["waves_direction-surface"]?.[i] ?? null,
                };
              });
              records.forEach((record: any) => {
                const tsMs = new Date(record.forecast_timestamp).getTime();
                if (waveLookup[tsMs]) {
                  record.wave_height = waveLookup[tsMs].wave_height;
                  record.wave_period = waveLookup[tsMs].wave_period;
                  record.wave_direction = waveLookup[tsMs].wave_direction;
                }
              });
            }
          } catch (waveErr: any) {
            console.log(`⚠️ Wave data unavailable for ${coords.name}: ${waveErr?.message}`);
          }
        }

        // Insert
        const { error: insertError } = await supabase.from("windy_forecast").insert(records);
        if (insertError) throw insertError;

        console.log(`✅ ${coords.name}: ${records.length} forecast records`);
        forecastSuccess++;
      } catch (err: any) {
        console.error(`❌ ${coords.name} forecast error:`, err?.message || err);
        forecastErrors++;
      }

      await sleep(1000);
    }

    // ── Air Quality Scraping ─────────────────────────────────────────

    for (const areaId of areaIds) {
      const coords = PROVINCE_COORDINATES[areaId];

      try {
        // Check duplicate
        const { data: existing } = await supabase
          .from("windy_air_quality")
          .select("id")
          .eq("area_id", areaId)
          .eq("forecast_date", todayDate)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`⏭️  ${coords.name} AQ already scraped today`);
          aqSkipped++;
          continue;
        }

        // Delete old
        await supabase.from("windy_air_quality").delete().eq("area_id", areaId);

        // Fetch
        const raw = await fetchPointForecast(WINDY_API_KEY, coords.lat, coords.lon, AQ_PARAMETERS, "cams");

        if (!raw || !raw.ts) {
          console.log(`❌ No AQ data for ${coords.name}`);
          aqErrors++;
          continue;
        }

        const records = raw.ts.map((ts: number, i: number) => {
          const forecastTime = new Date(ts);
          return {
            area_id: areaId,
            forecast_date: formatDate(forecastTime),
            forecast_hour: forecastTime.getUTCHours(),
            forecast_timestamp: forecastTime.toISOString(),
            so2: raw["chem_so2sm-surface"]?.[i] ?? null,
            dust: raw["chem_dustsm-surface"]?.[i] ?? null,
            co: raw["chem_cosc-surface"]?.[i] ?? null,
          };
        });

        const { error: insertError } = await supabase.from("windy_air_quality").insert(records);
        if (insertError) throw insertError;

        console.log(`✅ ${coords.name}: ${records.length} AQ records`);
        aqSuccess++;
      } catch (err: any) {
        console.error(`❌ ${coords.name} AQ error:`, err?.message || err);
        aqErrors++;
      }

      await sleep(1000);
    }

    // ── Summary ──────────────────────────────────────────────────────

    const summary = {
      status: "completed",
      timestamp: new Date().toISOString(),
      forecast: {
        total: areaIds.length,
        successful: forecastSuccess,
        skipped: forecastSkipped,
        errors: forecastErrors,
      },
      airQuality: {
        total: areaIds.length,
        successful: aqSuccess,
        skipped: aqSkipped,
        errors: aqErrors,
      },
    };

    console.log("📊 Summary:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({ error: error?.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
