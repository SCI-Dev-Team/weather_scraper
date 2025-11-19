// Modern API client for restructured weather scraper
const API_BASE = '/api';
let allProvinces = [];
let currentWeatherData = null;

// Load provinces for dropdown
async function loadProvinces() {
  try {
    const response = await fetch(`${API_BASE}/provinces`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.success) {
      allProvinces = data.data;
      populateProvinceDropdown();
    }
  } catch (err) {
    console.error('Error loading provinces:', err);
    document.getElementById('areaSelect').innerHTML = '<option value="">Error loading provinces</option>';
  }
}

function populateProvinceDropdown() {
  const select = document.getElementById('areaSelect');
  select.innerHTML = '';
  
  allProvinces.forEach((province) => {
    const option = document.createElement('option');
    option.value = province.area_id;
    option.textContent = province.name;
    select.appendChild(option);
  });
}

// Format date for display
function formatDisplayDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function displayWeather(data) {
  const content = document.getElementById('weatherContent');
  const areaId = parseInt(document.getElementById('areaSelect').value);
  const province = allProvinces.find((p) => p.area_id === areaId);
  const areaName = province ? province.name : 'Unknown Area';
  
  let html = `<div class="area-name">📍 ${areaName}</div>`;

  // Hourly Forecast
  html += '<div class="weather-card">';
  html += '<h2>Hourly Forecast</h2>';
  html += '<div class="hourly-grid">';
  
  if (data.hourly && data.hourly.length > 0) {
    data.hourly.forEach((item) => {
      html += '<div class="hourly-item">';
      html += `<div class="day-period">${formatDisplayDate(item.forecast_date)} - ${item.period}</div>`;
      
      if (item.weather_image) {
        const imageUrl = item.weather_image.startsWith('http')
          ? item.weather_image
          : `http://cambodiameteo.com${item.weather_image}`;
        html += `<img src="${imageUrl}" alt="${item.weather_value || 'Weather'}" class="weather-icon" onerror="this.style.display='none'">`;
      }
      
      html += `<div class="data-row"><span class="label">Temperature:</span><span class="value">${item.temperature || 'N/A'}°C</span></div>`;
      html += `<div class="data-row"><span class="label">Humidity:</span><span class="value">${item.humidity || 'N/A'}%</span></div>`;
      html += `<div class="data-row"><span class="label">Wind Speed:</span><span class="value">${item.wind_speed || 'N/A'} Kph</span></div>`;
      
      if (item.wind_direction_value) {
        html += `<div class="data-row"><span class="label">Wind Direction:</span><span class="value">${item.wind_direction_value}</span></div>`;
      }
      
      if (item.weather_value) {
        html += `<div class="data-row"><span class="label">Weather:</span><span class="value">${item.weather_value}</span></div>`;
      }
      
      html += '</div>';
    });
  } else {
    html += '<div class="hourly-item">No hourly forecast data available</div>';
  }
  
  html += '</div></div>';

  // Daily Forecast
  html += '<div class="weather-card">';
  html += '<h2>Daily Forecast</h2>';
  html += '<div class="daily-grid">';
  
  if (data.daily && data.daily.length > 0) {
    data.daily.forEach((item) => {
      html += '<div class="daily-item">';
      html += `<div class="day">${formatDisplayDate(item.forecast_date)}</div>`;
      html += `<div class="temp">${item.max_temperature || 'N/A'}°C / ${item.min_temperature || 'N/A'}°C</div>`;
      html += `<div>Max: ${item.max_temperature || 'N/A'}°C | Min: ${item.min_temperature || 'N/A'}°C</div>`;
      html += `<div class="humidity">Humidity: ${item.max_humidity || 'N/A'}% / ${item.min_humidity || 'N/A'}%</div>`;
      html += '</div>';
    });
  } else {
    html += '<div class="daily-item">No daily forecast data available</div>';
  }
  
  html += '</div></div>';

  content.innerHTML = html;
  
  // Update JSON view
  const displayData = {
    area: areaName,
    hourly: data.hourly,
    daily: data.daily,
  };
  document.getElementById('jsonContent').textContent = JSON.stringify(displayData, null, 2);
}

async function loadWeather() {
  const areaId = document.getElementById('areaSelect').value;
  
  if (!areaId) {
    alert('Please select an area first');
    return;
  }
  
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const content = document.getElementById('weatherContent');

  loading.style.display = 'block';
  error.style.display = 'none';
  content.innerHTML = '';

  try {
    const response = await fetch(`${API_BASE}/weather?areaId=${areaId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch weather data');
    }

    currentWeatherData = result.data;
    displayWeather(result.data);
  } catch (err) {
    error.textContent = `Error loading weather data: ${err.message}`;
    error.style.display = 'block';
    console.error('Error:', err);
  } finally {
    loading.style.display = 'none';
  }
}

function toggleJsonView() {
  const jsonView = document.getElementById('jsonView');
  jsonView.style.display = jsonView.style.display === 'none' ? 'block' : 'none';
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  await loadProvinces();
  if (allProvinces.length > 0) {
    await loadWeather();
  }
});
