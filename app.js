/* ── Configuration ──────────────────────────────── */
const CONFIG = {
  zipCode: "32250",
  // Jacksonville Beach, FL — Open-Meteo uses coordinates
  latitude: 30.2866,
  longitude: -81.3962,
  temperatureUnit: "fahrenheit",
  clocks: [
    { id: "clock-miami",    timezone: "America/New_York" },
    { id: "clock-sanfran",  timezone: "America/Los_Angeles" },
    { id: "clock-saopaulo", timezone: "America/Sao_Paulo" },
  ],
};

/* ── WMO weather codes → description + icon + theme */
const WMO = {
  0:  { desc: "Clear sky",          icon: "☀️",  theme: "sunny" },
  1:  { desc: "Mainly clear",       icon: "🌤️", theme: "sunny" },
  2:  { desc: "Partly cloudy",      icon: "⛅",  theme: "cloudy" },
  3:  { desc: "Overcast",           icon: "☁️",  theme: "cloudy" },
  45: { desc: "Foggy",              icon: "🌫️", theme: "foggy" },
  48: { desc: "Depositing rime fog", icon: "🌫️", theme: "foggy" },
  51: { desc: "Light drizzle",      icon: "🌦️", theme: "rainy" },
  53: { desc: "Moderate drizzle",   icon: "🌦️", theme: "rainy" },
  55: { desc: "Dense drizzle",      icon: "🌧️", theme: "rainy" },
  61: { desc: "Slight rain",        icon: "🌧️", theme: "rainy" },
  63: { desc: "Moderate rain",      icon: "🌧️", theme: "rainy" },
  65: { desc: "Heavy rain",         icon: "🌧️", theme: "rainy" },
  66: { desc: "Freezing rain",      icon: "🌨️", theme: "rainy" },
  67: { desc: "Heavy freezing rain", icon: "🌨️", theme: "rainy" },
  71: { desc: "Slight snow",        icon: "❄️",  theme: "snowy" },
  73: { desc: "Moderate snow",      icon: "❄️",  theme: "snowy" },
  75: { desc: "Heavy snow",         icon: "🌨️", theme: "snowy" },
  77: { desc: "Snow grains",        icon: "🌨️", theme: "snowy" },
  80: { desc: "Slight showers",     icon: "🌦️", theme: "rainy" },
  81: { desc: "Moderate showers",   icon: "🌧️", theme: "rainy" },
  82: { desc: "Violent showers",    icon: "⛈️", theme: "stormy" },
  85: { desc: "Slight snow showers", icon: "🌨️", theme: "snowy" },
  86: { desc: "Heavy snow showers", icon: "🌨️", theme: "snowy" },
  95: { desc: "Thunderstorm",       icon: "⛈️", theme: "stormy" },
  96: { desc: "Thunderstorm w/ hail", icon: "⛈️", theme: "stormy" },
  99: { desc: "Thunderstorm w/ heavy hail", icon: "⛈️", theme: "stormy" },
};

/* ── Clocks ─────────────────────────────────────── */
function updateClocks() {
  const now = new Date();
  for (const c of CONFIG.clocks) {
    const timeStr = now.toLocaleTimeString("en-US", {
      timeZone: c.timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const el = document.querySelector(`#${c.id} .clock-time`);
    if (el) el.textContent = timeStr;
  }
}

/* ── Greeting & date ───────────────────────────── */
function updateGreeting() {
  const now = new Date();
  const hour = now.getHours();
  let greeting;
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";

  document.getElementById("greeting").textContent = greeting;
  document.getElementById("date").textContent = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Weather ───────────────────────────────────── */
function applyTheme(weatherCode) {
  const info = WMO[weatherCode] || WMO[0];
  const app = document.getElementById("app");

  // Use night theme for clear sky after dark
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 20;
  let theme = info.theme;
  if (theme === "sunny" && isNight) theme = "clear-night";

  // Remove all theme classes and apply new one
  app.className = `theme-${theme}`;
  return info;
}

async function fetchWeather() {
  const { latitude, longitude, temperatureUnit } = CONFIG;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&temperature_unit=${temperatureUnit}&wind_speed_unit=mph&timezone=auto`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const current = data.current;

    const info = applyTheme(current.weather_code);
    const unit = temperatureUnit === "fahrenheit" ? "°F" : "°C";

    document.getElementById("weatherIcon").textContent = info.icon;
    document.getElementById("weatherTemp").textContent = `${Math.round(current.temperature_2m)}${unit}`;
    document.getElementById("weatherDesc").textContent = info.desc;
    document.getElementById("weatherDetail").textContent =
      `Feels like ${Math.round(current.apparent_temperature)}${unit} · Humidity ${current.relative_humidity_2m}% · Wind ${Math.round(current.wind_speed_10m)} mph`;
  } catch (err) {
    document.getElementById("weatherDesc").textContent = "Weather unavailable";
    console.error("Weather fetch failed:", err);
  }
}

/* ── Discussions ───────────────────────────────── */
async function fetchLatestDiscussion() {
  const url = "https://api.github.com/repos/trespilhas/fire-dashboard/discussions?per_page=1&direction=desc";

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });
    const discussions = await res.json();

    if (!Array.isArray(discussions) || discussions.length === 0) {
      document.getElementById("discussionTitle").textContent = "No discussions yet";
      document.getElementById("discussionBody").textContent = "Start a conversation on GitHub.";
      return;
    }

    const latest = discussions[0];
    document.getElementById("discussionTitle").textContent = latest.title;
    document.getElementById("discussionBody").textContent = latest.body
      ? latest.body.replace(/\r?\n/g, " ").slice(0, 200)
      : "";
    document.getElementById("discussionLink").href = latest.html_url;
  } catch (err) {
    document.getElementById("discussionTitle").textContent = "Discussions unavailable";
    document.getElementById("discussionBody").textContent = "";
    console.error("Discussion fetch failed:", err);
  }
}

/* ── Init ──────────────────────────────────────── */
updateClocks();
updateGreeting();
fetchWeather();
fetchLatestDiscussion();

setInterval(updateClocks, 1000);
setInterval(updateGreeting, 60_000);
setInterval(fetchWeather, 600_000); // refresh weather every 10 min
setInterval(fetchLatestDiscussion, 600_000); // refresh discussions every 10 min
