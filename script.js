// ===================== ESTADO GLOBAL =====================
const state = {
  effect: null,
  favorites: JSON.parse(localStorage.getItem('fav')) || []
};

// ===================== ELEMENTOS =====================
const el = {
  input: document.getElementById('cityInput'),
  btn: document.getElementById('searchBtn'),
  list: document.getElementById('suggestions'),
  temp: document.getElementById('temp'),
  city: document.getElementById('city'),
  icon: document.getElementById('icon'),
  humidity: document.getElementById('humidity'),
  wind: document.getElementById('wind'),
  cloud: document.getElementById('cloud'),
  rain: document.getElementById('rain'),
  favBox: document.getElementById('favorites'),
  canvas: document.getElementById('fx')
};

const ctx = el.canvas.getContext('2d');
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
  el.canvas.width = innerWidth;
  el.canvas.height = innerHeight;
}

// ===================== EVENTOS =====================
let debounceTimer;
el.input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchSuggestions, 300);
});

/* ===================== AUTOCOMPLETE ===================== */
async function fetchSuggestions() {
  const q = el.input.value;
  if (!q) return el.list.innerHTML = '';

  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=5`);
  const data = await res.json();

  el.list.innerHTML = '';
  data.results?.forEach(city => {
    const div = document.createElement('div');
    div.innerText = `${city.name}, ${city.country}`;
    div.onclick = () => {
      el.input.value = city.name;
      el.list.innerHTML = '';
      getWeather(city.latitude, city.longitude, city.name);
    };
    el.list.appendChild(div);
  });
}

// ===================== API =====================
async function getWeather(lat, lon, nameManual) {
  let latitude = lat, longitude = lon, name = nameManual;

  if (!lat) {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${el.input.value}&count=1`);
    const g = await geo.json();
    if (!g.results) return;
    latitude = g.results[0].latitude;
    longitude = g.results[0].longitude;
    name = g.results[0].name;
  }

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation_probability,cloudcover,relativehumidity_2m&current_weather=true&timezone=auto`
  );

  const data = await res.json();
  updateUI(data, name);
}

// ===================== UI =====================
function updateUI(data, name) {
  const hour = new Date().getHours();

  el.temp.innerText = Math.round(data.current_weather.temperature) + '°';
  el.city.innerText = name;

  el.wind.innerText = data.current_weather.windspeed + ' km/h';
  el.cloud.innerText = data.hourly.cloudcover[hour] + '%';
  el.rain.innerText = data.hourly.precipitation_probability[hour] + '%';
  el.humidity.innerText = data.hourly.relativehumidity_2m[hour] + '%';

  applyTheme(data);
}

// ===================== TEMA =====================
function applyTheme(data) {
  const code = data.current_weather.weathercode;
  const isDay = data.current_weather.is_day;

  state.effect = null;

  if (code >= 60) {
    document.body.style.background = 'linear-gradient(#1e293b,#020617)';
    el.icon.innerText = '🌧️';
    state.effect = 'rain';
  } else if (code < 3) {
    if (isDay) {
      document.body.style.background = 'linear-gradient(#38bdf8,#facc15)';
      el.icon.innerText = '☀️';
      state.effect = 'sun';
    } else {
      document.body.style.background = 'linear-gradient(#020617,#0f172a)';
      el.icon.innerText = '🌙';
    }
  } else {
    document.body.style.background = 'linear-gradient(#475569,#020617)';
    el.icon.innerText = isDay ? '⛅' : '☁️';
  }
}

/* ===================== FAVORITOS ===================== */
function saveFavorite(city) {
  if (!state.favorites.includes(city)) {
    state.favorites.push(city);
    localStorage.setItem('fav', JSON.stringify(state.favorites));
    renderFavorites();
  }
}

function renderFavorites() {
  el.favBox.innerHTML = '';
  state.favorites.forEach(city => {
    const div = document.createElement('div');
    div.className = 'fav';
    div.innerText = city;
    div.onclick = () => {
      el.input.value = city;
      getWeather();
    };
    el.favBox.appendChild(div);
  });
}

renderFavorites();

/* ===================== GEOLOCALIZAÇÃO ===================== */
navigator.geolocation.getCurrentPosition(pos => {
  getWeather(pos.coords.latitude, pos.coords.longitude, 'Sua localização');
});

/* ===================== ANIMAÇÃO ===================== */
let particles = Array.from({ length: 120 }, () => createParticle());

function createParticle() {
  return {
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    speed: Math.random() * 4 + 1
  };
}

function animate() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  if (state.effect === 'rain') {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    particles.forEach(p => {
      ctx.fillRect(p.x, p.y, 2, 12);
      p.y += p.speed;
      if (p.y > innerHeight) p.y = 0;
    });
  }

  if (state.effect === 'sun') {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      p.y -= 0.3;
      if (p.y < 0) p.y = innerHeight;
    });
  }

  requestAnimationFrame(animate);
}

animate();