const DEFAULT_LOCATION = { name: "Boca Raton", latitude: 26.3683, longitude: -80.1289 };

const WEATHER_CODES = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Dense drizzle", "🌧️"],
  61: ["Light rain", "🌧️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌦️"],
  82: ["Violent showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm w/ hail", "⛈️"],
  99: ["Thunderstorm w/ hail", "⛈️"],
};

function describeCode(code) {
  return WEATHER_CODES[code] || ["Unknown", "❓"];
}

function backgroundClassForCode(code) {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "clear";
}

const els = {
  form: document.getElementById("search-form"),
  input: document.getElementById("city-input"),
  location: document.querySelector(".location"),
  temp: document.querySelector(".temp"),
  condition: document.querySelector(".condition"),
  detail1Label: document.getElementById("detail1-label"),
  detail1Value: document.getElementById("detail1-value"),
  detail2Label: document.getElementById("detail2-label"),
  detail2Value: document.getElementById("detail2-value"),
  detail3Label: document.getElementById("detail3-label"),
  detail3Value: document.getElementById("detail3-value"),
  forecast: document.getElementById("forecast"),
  error: document.getElementById("error"),
  unitButtons: document.querySelectorAll(".unit-btn"),
  bg: document.querySelector(".bg"),
  greeting: document.getElementById("greeting"),
};

function setGreeting() {
  const hour = new Date().getHours();
  let text;
  let icon;
  if (hour < 5) {
    text = "Good night";
    icon = "🌙";
  } else if (hour < 12) {
    text = "Good morning";
    icon = "☀️";
  } else if (hour < 17) {
    text = "Good afternoon";
    icon = "🌤️";
  } else if (hour < 21) {
    text = "Good evening";
    icon = "🌆";
  } else {
    text = "Good night";
    icon = "🌙";
  }
  els.greeting.textContent = `${text}, Elif ${icon}`;
}

let state = {
  location: DEFAULT_LOCATION,
  unit: "fahrenheit",
  data: null,
  selectedDay: 0,
};

function showError(message) {
  els.error.textContent = message;
  els.error.hidden = false;
}

function clearError() {
  els.error.hidden = true;
}

async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed");
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`Couldn't find "${city}"`);
  }
  const result = data.results[0];
  return {
    name: result.admin1 ? `${result.name}, ${result.admin1}` : result.name,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

async function fetchWeather({ latitude, longitude }, unit) {
  const windUnit = unit === "celsius" ? "kmh" : "mph";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,wind_speed_10m_max` +
    `&temperature_unit=${unit}&wind_speed_unit=${windUnit}&timezone=auto&forecast_days=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather request failed");
  return res.json();
}

function setBackground(weatherCode, isDay) {
  const nightClass = isDay === 0 ? " night" : "";
  els.bg.className = `bg ${backgroundClassForCode(weatherCode)}${nightClass}`;
}

function renderCurrent(locationName, data, unit) {
  const current = data.current;
  const [condition, icon] = describeCode(current.weather_code);
  const windUnitLabel = unit === "celsius" ? "km/h" : "mph";

  els.location.textContent = locationName;
  els.temp.textContent = `${Math.round(current.temperature_2m)}°`;
  els.condition.textContent = `${icon} ${condition}`;

  els.detail1Label.textContent = "Feels like";
  els.detail1Value.textContent = `${Math.round(current.apparent_temperature)}°`;
  els.detail2Label.textContent = "Humidity";
  els.detail2Value.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  els.detail3Label.textContent = "Wind";
  els.detail3Value.textContent = `${Math.round(current.wind_speed_10m)} ${windUnitLabel}`;

  setBackground(current.weather_code, current.is_day);
}

function renderDay(dayIndex) {
  const data = state.data;
  if (!data) return;
  const unit = state.unit;
  const windUnitLabel = unit === "celsius" ? "km/h" : "mph";
  const daily = data.daily;

  if (dayIndex === 0) {
    renderCurrent(state.location.name, data, unit);
  } else {
    const dateStr = daily.time[dayIndex];
    const dayName = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
    const [condition, icon] = describeCode(daily.weather_code[dayIndex]);
    const hi = Math.round(daily.temperature_2m_max[dayIndex]);
    const lo = Math.round(daily.temperature_2m_min[dayIndex]);

    els.location.textContent = `${state.location.name} · ${dayName}`;
    els.temp.textContent = `${hi}°`;
    els.condition.textContent = `${icon} ${condition}`;

    els.detail1Label.textContent = "Feels like";
    els.detail1Value.textContent = `${Math.round(daily.apparent_temperature_max[dayIndex])}°`;
    els.detail2Label.textContent = "Low";
    els.detail2Value.textContent = `${lo}°`;
    els.detail3Label.textContent = "Wind";
    els.detail3Value.textContent = `${Math.round(daily.wind_speed_10m_max[dayIndex])} ${windUnitLabel}`;

    setBackground(daily.weather_code[dayIndex], 1);
  }

  state.selectedDay = dayIndex;
  els.forecast.querySelectorAll(".forecast-day").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.dayIndex) === dayIndex);
  });
}

function renderForecastButtons(data) {
  els.forecast.innerHTML = "";
  const days = data.daily.time;
  days.forEach((dateStr, i) => {
    if (i === 0) return;
    const [, dayIcon] = describeCode(data.daily.weather_code[i]);
    const dayName = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
    const hi = Math.round(data.daily.temperature_2m_max[i]);
    const lo = Math.round(data.daily.temperature_2m_min[i]);

    const dayBtn = document.createElement("button");
    dayBtn.type = "button";
    dayBtn.className = "forecast-day";
    dayBtn.dataset.dayIndex = i;
    dayBtn.innerHTML = `
      <span class="day">${dayName}</span>
      <span class="icon">${dayIcon}</span>
      <span class="hi-lo">${hi}° / ${lo}°</span>
    `;
    dayBtn.addEventListener("click", () => renderDay(i));
    els.forecast.appendChild(dayBtn);
  });
}

async function loadLocation(location) {
  clearError();
  state.location = location;
  try {
    const data = await fetchWeather(location, state.unit);
    state.data = data;
    renderForecastButtons(data);
    renderDay(0);
  } catch (err) {
    showError(err.message || "Something went wrong");
  }
}

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = els.input.value.trim();
  if (!city) return;
  clearError();
  try {
    const location = await geocode(city);
    await loadLocation(location);
    els.input.value = "";
  } catch (err) {
    showError(err.message || "Something went wrong");
  }
});

els.unitButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const unit = btn.dataset.unit;
    if (unit === state.unit) return;
    state.unit = unit;
    els.unitButtons.forEach((b) => b.classList.toggle("active", b === btn));
    clearError();
    try {
      const data = await fetchWeather(state.location, state.unit);
      state.data = data;
      renderForecastButtons(data);
      renderDay(state.selectedDay);
    } catch (err) {
      showError(err.message || "Something went wrong");
    }
  });
});

setGreeting();
loadLocation(DEFAULT_LOCATION);
