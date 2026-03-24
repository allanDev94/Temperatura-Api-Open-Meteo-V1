const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');


const CACHE_DURATION = 60 * 60 * 1000; // 1 hora en milisegundos

// Obtener datos desde caché
function getCache(key) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  const parsed = JSON.parse(cached);

  const now = Date.now();

  // Verifica si aún es válido
  if (now - parsed.timestamp < CACHE_DURATION) {
    return parsed.data;
  }

  // Si expiró, lo eliminamos
  localStorage.removeItem(key);
  return null;
}

// Guardar datos en caché
function setCache(key, data) {
  const cacheData = {
    data,
    timestamp: Date.now()
  };
  localStorage.setItem(key, JSON.stringify(cacheData));
}

// Función para obtener coordenadas usando el geocoding de Open-Meteo
async function geocodeCity(city) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error en geocoding');
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  return {
    name: data.results[0].name,
    lat: data.results[0].latitude,
    lon: data.results[0].longitude,
    country: data.results[0].country
  };
}

// Función para obtener el clima (temperatura actual) desde Open-Meteo
async function fetchTemperature(lat, lon) {
  const cacheKey = `weather_${lat}_${lon}`;

  // 1. Revisar caché
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log('Usando datos en caché');
    return cachedData;
  }

  // 2. Llamar a la API si no hay caché
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener datos meteorológicos');

  const data = await res.json();
  if (!data || !data.current_weather) throw new Error('Datos meteorológicos no disponibles');

  const current = data.current;

return {
  temperature: current.temperature_2m,
  humidity: current.relative_humidity_2m,
  wind: current.wind_speed_10m,
  precipitation: current.precipitation
};

  // 3. Guardar en caché
  setCache(cacheKey, result);

  return result;
}

function setStatus(message) {
  statusEl.textContent = message;
}

// Mapea weathercode (Open-Meteo) a un icono SVG simple
function weatherIconSvg(code) {
  // Mapas simplificados: 0 cielo claro, 1-3 despejado/parcial, 45-48 niebla, 51-67 lluvia, 71-77 nieve, 80-82 lluvia ligera, 95-99 tormenta
  if (code === 0) {
    return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5" fill="#FFD54F"/></svg>`;
  }
  if (code >= 1 && code <= 3) {
    return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="4" fill="#FFD54F"/><path d="M14 14h6v6H14z" fill="#90CAF9"/></svg>`;
  }
  if ((code >= 45 && code <= 48) || (code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 16a4 4 0 014-4h6a4 4 0 110 8H9a5 5 0 01-4-4z" fill="#90A4AE"/><path d="M8 19v3M12 19v3M16 19v3" stroke="#0288D1" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  }
  if ((code >= 71 && code <= 77)) {
    return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 16a6 6 0 0112 0" fill="#ECEFF1"/><path d="M8 18l2 2M14 18l2 2" stroke="#90A4AE" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  }
  if (code >= 95 && code <= 99) {
    return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12h20M4 6h16M6 18h12" stroke="#E53935" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  }

  // Default
  return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="6" fill="#B0BEC5"/></svg>`;
}

function showResult(cityName, country, weather) {
  resultEl.innerHTML = `
    <div class="weather">
      <h2>${cityName}, ${country}</h2>
      <p>🌡️ Temperatura: <strong>${weather.temperature}°C</strong></p>
      <p>💧 Humedad: ${weather.humidity}%</p>
      <p>💨 Viento: ${weather.wind} km/h</p>
      <p>🌧️ Precipitación: ${weather.precipitation} mm</p>
    </div>
  `;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = cityInput.value.trim();
if (!input) return;

setStatus('Buscando ciudades...');
resultEl.innerHTML = '';

try {
  const results = await fetchMultipleCitiesWeather(input);

  setStatus('');
  showComparison(results);

} catch (err) {
  console.error(err);
  setStatus('Error al obtener datos.');
}
  if (!city) return;

  setStatus('Buscando ubicación...');
  resultEl.innerHTML = '';

  try {
    const place = await geocodeCity(city);
    if (!place) {
      setStatus('Ciudad no encontrada.');
      return;
    }

    setStatus(`Obteniendo clima para ${place.name}, ${place.country}...`);
    const data = await fetchTemperature(place.lat, place.lon);
    const forecast = await fetchForecast(place.lat, place.lon);

    setStatus('');
    showResult(place.name, place.country, data.temperature, data.weathercode);
    showForecast(forecast);
  } catch (err) {
    console.error(err);
    setStatus('Ocurrió un error al obtener la temperatura.');
  }
});

async function fetchForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener pronóstico');

  const data = await res.json();

  if (!data || !data.daily) throw new Error('Pronóstico no disponible');

  // Tomamos solo 5 días
  const forecast = data.daily.time.slice(0, 5).map((date, i) => ({
    date,
    max: data.daily.temperature_2m_max[i],
    min: data.daily.temperature_2m_min[i]
  }));

  return forecast;
}

function showForecast(forecast) {
  const html = forecast.map(day => `
    <div class="forecast-day">
      <p><strong>${day.date}</strong></p>
      <p>🌡️ Máx: ${day.max}°C</p>
      <p>❄️ Mín: ${day.min}°C</p>
    </div>
  `).join('');

  resultEl.innerHTML += `
    <div class="forecast">
      <h3>Pronóstico 5 días</h3>
      ${html}
    </div>
  `;
}

async function fetchMultipleCitiesWeather(citiesInput) {
  const cities = citiesInput.split(',').map(c => c.trim());

  const results = [];

  for (const city of cities) {
    try {
      const place = await geocodeCity(city);

      if (!place) {
        results.push({
          city,
          error: 'No encontrada'
        });
        continue;
      }

      const weather = await fetchTemperature(place.lat, place.lon);

      results.push({
        city: place.name,
        country: place.country,
        temperature: weather.temperature
      });

    } catch (error) {
      results.push({
        city,
        error: 'Error al obtener datos'
      });
    }
  }

  return results;
}

function showComparison(results) {
  const html = results.map(item => {
    if (item.error) {
      return `
        <div class="city-card">
          <h3>${item.city}</h3>
          <p>❌ ${item.error}</p>
        </div>
      `;
    }

    return `
      <div class="city-card">
        <h3>${item.city}, ${item.country}</h3>
        <p>🌡️ ${item.temperature}°C</p>
      </div>
    `;
  }).join('');

  resultEl.innerHTML = `
    <div class="comparison">
      <h2>Comparación de ciudades</h2>
      ${html}
    </div>
  `;
}
