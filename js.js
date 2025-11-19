import * as cheerio from 'cheerio';

fetch("http://cambodiameteo.com/forecast", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "menu=116&lang=km&areaid=3"
  })
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    
    // Extract area name
    const areaName = $('#select_city option:selected').text().trim();
    
    // Extract hourly forecast data
    const hourlyForecast = [];
    const days = ['Yesterday', 'Today', 'Tomorrow'];
    const periods = ['Morning', 'Afternoon', 'Night'];
    
    // Get all data rows
    const rows = $('table.WM tr');
    let humidityRow = null;
    let temperatureRow = null;
    let weatherRow = null;
    let windDirectionRow = null;
    let windSpeedRow = null;
    
    rows.each((i, row) => {
      const $row = $(row);
      const firstCell = $row.find('td.cellIntitule1').first().text().trim();
      
      if (firstCell.includes('Humidity')) humidityRow = $row;
      else if (firstCell.includes('Temperature')) temperatureRow = $row;
      else if (firstCell.includes('Weather')) weatherRow = $row;
      else if (firstCell.includes('Wind direction')) windDirectionRow = $row;
      else if (firstCell.includes('Wind speed')) windSpeedRow = $row;
    });
    
    // Extract values from each row
    const extractValues = (row) => {
      return row.find('td.cellValeur').map((i, cell) => {
        const $cell = $(cell);
        const img = $cell.find('img');
        if (img.length) {
          return {
            value: img.attr('title') || img.attr('src'),
            image: img.attr('src')
          };
        }
        return $cell.text().trim();
      }).get();
    };
    
    const humidityValues = extractValues(humidityRow);
    const temperatureValues = extractValues(temperatureRow);
    const weatherValues = extractValues(weatherRow);
    const windDirectionValues = extractValues(windDirectionRow);
    const windSpeedValues = extractValues(windSpeedRow);
    
    // Structure hourly forecast (9 values: 3 days × 3 periods)
    days.forEach((day, dayIndex) => {
      periods.forEach((period, periodIndex) => {
        const index = dayIndex * 3 + periodIndex;
        hourlyForecast.push({
          day: day,
          period: period,
          humidity: humidityValues[index] || null,
          temperature: temperatureValues[index] || null,
          weather: weatherValues[index] || null,
          windDirection: windDirectionValues[index] || null,
          windSpeed: windSpeedValues[index] || null
        });
      });
    });
    
    // Extract daily forecast data
    const dailyForecast = [];
    // Find the second table with class WM (Daily Forecast table)
    const dailyTable = $('table.WM').filter((i, table) => {
      return $(table).find('h1.titreTableau').text().trim().includes('Daily Forecast');
    }).first();
    
    const dailyRows = dailyTable.find('tr');
    
    let maxHumidityRow = null;
    let maxTempRow = null;
    let minHumidityRow = null;
    let minTempRow = null;
    
    dailyRows.each((i, row) => {
      const $row = $(row);
      const firstCell = $row.find('td.cellIntitule1').first().text().trim();
      
      if (firstCell.toLowerCase().includes('max humidity')) maxHumidityRow = $row;
      else if (firstCell.toLowerCase().includes('max temperature')) maxTempRow = $row;
      else if (firstCell.toLowerCase().includes('min humidity')) minHumidityRow = $row;
      else if (firstCell.toLowerCase().includes('min temperature')) minTempRow = $row;
    });
    
    const maxHumidityValues = maxHumidityRow ? maxHumidityRow.find('td.cellValeur').map((i, cell) => $(cell).text().trim()).get() : [];
    const maxTempValues = maxTempRow ? maxTempRow.find('td.cellValeur').map((i, cell) => $(cell).text().trim()).get() : [];
    const minHumidityValues = minHumidityRow ? minHumidityRow.find('td.cellValeur').map((i, cell) => $(cell).text().trim()).get() : [];
    const minTempValues = minTempRow ? minTempRow.find('td.cellValeur').map((i, cell) => $(cell).text().trim()).get() : [];
    
    days.forEach((day, index) => {
      dailyForecast.push({
        day: day,
        maxHumidity: maxHumidityValues[index] || null,
        maxTemperature: maxTempValues[index] || null,
        minHumidity: minHumidityValues[index] || null,
        minTemperature: minTempValues[index] || null
      });
    });
    
    // Create final JSON structure
    const weatherData = {
      area: areaName,
      hourlyForecast: hourlyForecast,
      dailyForecast: dailyForecast
    };
    
    console.log(JSON.stringify(weatherData, null, 2));
  })
  .catch(err => console.error(err));
  