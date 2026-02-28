/**
 * Cambodia Weather Dashboard – Client
 * Handles MOWRAM forecast, Windy forecast, and Air Quality tabs
 */
const API_BASE = '/api';

let allProvinces = [];
let currentData = {
  mowram: null,
  windy: null,
  airQuality: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function kelvinToCelsius(k) {
  if (k == null) return null;
  return (k - 273.15).toFixed(1);
}

function pascalToHpa(pa) {
  if (pa == null) return null;
  return (pa / 100).toFixed(1);
}

function msToKmh(ms) {
  if (ms == null) return null;
  return (ms * 3.6).toFixed(1);
}

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.floor((target - today) / 86400000);
  if (diff === -1) return 'Yesterday';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === 2) return 'Day After';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function formatHour(h) {
  return String(h).padStart(2, '0') + ':00';
}

function emptyState(icon, message) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${message}</p></div>`;
}

function showLoading() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('error').style.display = 'none';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'block';
}

function getAreaName() {
  const areaId = parseInt(document.getElementById('areaSelect').value);
  const p = allProvinces.find(x => x.area_id === areaId);
  return p ? p.name : 'Unknown Area';
}

// ═══════════════════════════════════════════════════════════════════════════
// Tabs
// ═══════════════════════════════════════════════════════════════════════════

function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Province Dropdown
// ═══════════════════════════════════════════════════════════════════════════

async function loadProvinces() {
  try {
    const res = await fetch(`${API_BASE}/provinces`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success) {
      allProvinces = data.data;
      const select = document.getElementById('areaSelect');
      select.innerHTML = '';
      allProvinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.area_id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Error loading provinces:', err);
    document.getElementById('areaSelect').innerHTML = '<option value="">Error loading</option>';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Scrape Triggers
// ═══════════════════════════════════════════════════════════════════════════

async function triggerScrape(type) {
  showLoading();
  try {
    let url, label;
    if (type === 'windy') {
      url = `${API_BASE}/windy/scrape`;
      label = 'Windy';
    } else if (type === 'airquality') {
      url = `${API_BASE}/windy/air-quality/scrape`;
      label = 'Air Quality';
    } else {
      url = `${API_BASE}/scrape`;
      label = 'MOWRAM';
    }
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    hideLoading();
    if (!res.ok && res.status !== 202) throw new Error(data.error || res.statusText);
    alert(`${label} scrape triggered! ${data.message || ''}`);
  } catch (err) {
    hideLoading();
    showError('Scrape failed: ' + err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Load All Data
// ═══════════════════════════════════════════════════════════════════════════

async function loadAllData() {
  const areaId = document.getElementById('areaSelect').value;
  if (!areaId) { alert('Please select a province'); return; }

  showLoading();

  try {
    // Fetch all sources in parallel
    const [mowramRes, windyRes, aqRes] = await Promise.allSettled([
      fetch(`${API_BASE}/weather?areaId=${areaId}`).then(r => r.json()),
      fetch(`${API_BASE}/windy/forecast?areaId=${areaId}`).then(r => r.json()),
      fetch(`${API_BASE}/windy/air-quality?areaId=${areaId}`).then(r => r.json()),
    ]);

    currentData.mowram = mowramRes.status === 'fulfilled' && mowramRes.value.success ? mowramRes.value.data : null;
    currentData.windy = windyRes.status === 'fulfilled' && windyRes.value.success ? windyRes.value.data : null;
    currentData.airQuality = aqRes.status === 'fulfilled' && aqRes.value.success ? aqRes.value.data : null;

    renderMowram(currentData.mowram);
    renderWindyForecast(currentData.windy);
    renderAirQuality(currentData.airQuality);
    updateJsonView();
  } catch (err) {
    showError('Failed to load data: ' + err.message);
  } finally {
    hideLoading();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Render: MOWRAM Forecast
// ═══════════════════════════════════════════════════════════════════════════

function renderMowram(data) {
  const el = document.getElementById('mowramContent');

  if (!data || (!data.hourly?.length && !data.daily?.length)) {
    el.innerHTML = emptyState('🏛️', 'No MOWRAM forecast data available. Try scraping first.');
    return;
  }

  const areaName = getAreaName();
  let html = `<div class="area-badge">📍 ${areaName}</div>`;

  // ── Hourly ──
  html += '<div class="card"><div class="card-header"><h2>⏰ Hourly Forecast</h2></div><div class="card-body">';

  if (data.hourly && data.hourly.length > 0) {
    const grouped = {};
    data.hourly.forEach(item => {
      (grouped[item.forecast_date] = grouped[item.forecast_date] || []).push(item);
    });
    const dates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

    html += '<div class="grid-3">';
    dates.forEach(date => {
      const order = { 'ព្រឹក': 0, 'ថ្ងៃ': 1, 'យប់': 2, Morning: 0, Afternoon: 1, Night: 2 };
      grouped[date].sort((a, b) => (order[a.period] ?? 0) - (order[b.period] ?? 0));

      html += `<div class="forecast-item"><div class="day-label">📅 ${formatDisplayDate(date)}</div>`;
      grouped[date].forEach(item => {
        const icon = item.weather_image
          ? `<img src="${item.weather_image.startsWith('http') ? item.weather_image : 'http://cambodiameteo.com' + item.weather_image}" class="weather-icon" onerror="this.style.display='none'" alt=""> `
          : '';
        html += `<div class="data-row"><span class="label">${item.period}</span><span class="value">${icon}${item.temperature || '—'}°C · ${item.humidity || '—'}% · ${item.wind_speed || '—'} Kph</span></div>`;
      });
      html += '</div>';
    });
    html += '</div>';
  } else {
    html += emptyState('⏰', 'No hourly data');
  }

  html += '</div></div>';

  // ── Daily ──
  html += '<div class="card"><div class="card-header"><h2>📊 Daily Forecast</h2></div><div class="card-body"><div class="grid-4">';

  if (data.daily && data.daily.length > 0) {
    data.daily.forEach(item => {
      html += `<div class="daily-card">
        <div class="day">${formatDisplayDate(item.forecast_date)}</div>
        <div class="temp">${item.max_temperature || '—'}°C</div>
        <div class="detail">Low: ${item.min_temperature || '—'}°C</div>
        <div class="detail">💧 ${item.max_humidity || '—'}% / ${item.min_humidity || '—'}%</div>
      </div>`;
    });
  } else {
    html += emptyState('📊', 'No daily data');
  }

  html += '</div></div></div>';
  el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════
// Render: Windy Forecast
// ═══════════════════════════════════════════════════════════════════════════

function renderWindyForecast(data) {
  const el = document.getElementById('windyContent');

  if (!data || data.length === 0) {
    el.innerHTML = emptyState('🌊', 'No Windy forecast data available. Try scraping Windy first.');
    return;
  }

  const areaName = getAreaName();
  let html = `<div class="area-badge">📍 ${areaName} — Windy GFS</div>`;

  // Group by date
  const grouped = {};
  data.forEach(r => {
    (grouped[r.forecast_date] = grouped[r.forecast_date] || []).push(r);
  });
  const dates = Object.keys(grouped).sort();

  dates.forEach(date => {
    const rows = grouped[date].sort((a, b) => a.forecast_hour - b.forecast_hour);

    html += `<div class="card">
      <div class="card-header"><h2>📅 ${formatDisplayDate(date)}</h2>
        <span style="font-size:0.85em;color:var(--text-light);">${rows.length} hours</span>
      </div>
      <div class="card-body"><div class="grid-4">`;

    rows.forEach(r => {
      const tempC = kelvinToCelsius(r.temperature);
      const dewC = kelvinToCelsius(r.dewpoint);
      const hpa = pascalToHpa(r.pressure);
      const windKmh = msToKmh(r.wind_speed);
      const gustKmh = msToKmh(r.wind_gust);
      const arrowDeg = r.wind_direction != null ? r.wind_direction : 0;

      html += `<div class="windy-hour-card">
        <div class="windy-time">${formatHour(r.forecast_hour)} UTC</div>
        <div class="windy-metric"><span class="wm-label">🌡️ Temp</span><span class="wm-value">${tempC ?? '—'}°C</span></div>
        <div class="windy-metric"><span class="wm-label">💧 Humidity</span><span class="wm-value">${r.relative_humidity != null ? r.relative_humidity.toFixed(0) + '%' : '—'}</span></div>
        <div class="windy-metric"><span class="wm-label">🌬️ Wind</span><span class="wm-value"><span class="wind-arrow" style="transform:rotate(${arrowDeg}deg)">↑</span> ${windKmh ?? '—'} km/h ${r.wind_cardinal || ''}</span></div>`;

      if (r.wind_gust) {
        html += `<div class="windy-metric"><span class="wm-label">💨 Gust</span><span class="wm-value">${gustKmh} km/h</span></div>`;
      }

      html += `<div class="windy-metric"><span class="wm-label">🌧️ Precip 3h</span><span class="wm-value">${r.precipitation_3h != null ? r.precipitation_3h.toFixed(1) + ' mm' : '—'}</span></div>`;

      if (r.precipitation_type_label && r.precipitation_type !== 0) {
        html += `<div class="windy-metric"><span class="wm-label">Type</span><span class="wm-value">${r.precipitation_type_label}</span></div>`;
      }

      html += `<div class="windy-metric"><span class="wm-label">☁️ Clouds</span><span class="wm-value">L${r.clouds_low != null ? r.clouds_low.toFixed(0) : '—'}% M${r.clouds_medium != null ? r.clouds_medium.toFixed(0) : '—'}% H${r.clouds_high != null ? r.clouds_high.toFixed(0) : '—'}%</span></div>`;
      html += `<div class="windy-metric"><span class="wm-label">🌊 Dew</span><span class="wm-value">${dewC ?? '—'}°C</span></div>`;
      html += `<div class="windy-metric"><span class="wm-label">📊 Pressure</span><span class="wm-value">${hpa ?? '—'} hPa</span></div>`;

      if (r.cape) {
        html += `<div class="windy-metric"><span class="wm-label">⚡ CAPE</span><span class="wm-value">${r.cape.toFixed(0)} J/kg</span></div>`;
      }

      // Wave data (coastal)
      if (r.wave_height != null) {
        html += `<div class="windy-metric"><span class="wm-label">🌊 Waves</span><span class="wm-value">${r.wave_height.toFixed(1)}m / ${r.wave_period != null ? r.wave_period.toFixed(0) + 's' : '—'}</span></div>`;
      }

      html += '</div>';
    });

    html += '</div></div></div>';
  });

  el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════
// Render: Air Quality
// ═══════════════════════════════════════════════════════════════════════════

function aqLevel(val) {
  if (val == null) return 'good';
  if (val < 50) return 'good';
  if (val < 150) return 'moderate';
  return 'poor';
}

function renderAirQuality(data) {
  const el = document.getElementById('aqContent');

  if (!data || data.length === 0) {
    el.innerHTML = emptyState('🌬️', 'No air quality data available. Try scraping Windy air quality first.');
    return;
  }

  const areaName = getAreaName();
  let html = `<div class="area-badge">📍 ${areaName} — CAMS Air Quality</div>`;

  // Group by date
  const grouped = {};
  data.forEach(r => {
    (grouped[r.forecast_date] = grouped[r.forecast_date] || []).push(r);
  });
  const dates = Object.keys(grouped).sort();

  dates.forEach(date => {
    const rows = grouped[date].sort((a, b) => a.forecast_hour - b.forecast_hour);

    html += `<div class="card">
      <div class="card-header"><h2>📅 ${formatDisplayDate(date)}</h2></div>
      <div class="card-body">`;

    rows.forEach(r => {
      html += `<div style="margin-bottom:12px;">
        <div style="font-weight:600;color:var(--primary);margin-bottom:6px;">${formatHour(r.forecast_hour)} UTC</div>
        <div class="aq-grid">
          <div class="aq-card ${aqLevel(r.so2)}">
            <div class="aq-label">SO₂</div>
            <div class="aq-value">${r.so2 != null ? r.so2.toFixed(1) : '—'}</div>
            <div class="aq-unit">µg/m³</div>
          </div>
          <div class="aq-card ${aqLevel(r.dust)}">
            <div class="aq-label">Dust</div>
            <div class="aq-value">${r.dust != null ? r.dust.toFixed(1) : '—'}</div>
            <div class="aq-unit">µg/m³</div>
          </div>
          <div class="aq-card ${aqLevel(r.co)}">
            <div class="aq-label">CO</div>
            <div class="aq-value">${r.co != null ? r.co.toFixed(1) : '—'}</div>
            <div class="aq-unit">µg/m³</div>
          </div>
        </div>
      </div>`;
    });

    html += '</div></div>';
  });

  el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════
// JSON View
// ═══════════════════════════════════════════════════════════════════════════

function updateJsonView() {
  const areaName = getAreaName();
  const display = {
    area: areaName,
    mowram: currentData.mowram,
    windy_forecast: currentData.windy,
    air_quality: currentData.airQuality,
  };
  document.getElementById('jsonContent').textContent = JSON.stringify(display, null, 2);
}

function toggleJsonView() {
  const el = document.getElementById('jsonView');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ═══════════════════════════════════════════════════════════════════════════
// Initialize
// ═══════════════════════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  await loadProvinces();
  if (allProvinces.length > 0) {
    await loadAllData();
  }
});
