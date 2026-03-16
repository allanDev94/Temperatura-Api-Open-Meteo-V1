const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');

// Función para obtener coordenadas usando el geocoding de Open-Meteo
async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
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
  // Pedimos la temperatura actual (temperature_2m) usando el endpoint de forecast
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener datos meteorológicos');
  const data = await res.json();
  if (!data || !data.current_weather) throw new Error('Datos meteorológicos no disponibles');
  // Devolvemos temperatura y weathercode
  return {
    temperature: data.current_weather.temperature,
    weathercode: data.current_weather.weathercode
  };
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

function showResult(cityName, country, temperature, weathercode) {
  const icon = weatherIconSvg(weathercode);
  resultEl.innerHTML = `<div class="weather"><div class="icon">${icon}</div><div class="info"><h2>${cityName}, ${country}</h2><p>Temperatura actual: <strong>${temperature}°C</strong></p></div></div>`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
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

    setStatus('');
    showResult(place.name, place.country, data.temperature, data.weathercode);
  } catch (err) {
    console.error(err);
    setStatus('Ocurrió un error al obtener la temperatura.');
  }
});
