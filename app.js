/* ── Promise polyfill for older WebViews ────────── */
if (typeof Promise === "undefined") {
  (function () {
    function MiniPromise(executor) {
      var self = this;
      self._state = 0;
      self._value = undefined;
      self._handlers = [];

      function resolve(value) {
        if (self._state !== 0) return;
        self._state = 1;
        self._value = value;
        _flush(self);
      }

      function reject(reason) {
        if (self._state !== 0) return;
        self._state = 2;
        self._value = reason;
        _flush(self);
      }

      try { executor(resolve, reject); } catch (e) { reject(e); }
    }

    function _flush(self) {
      setTimeout(function () {
        for (var i = 0; i < self._handlers.length; i++) {
          _handle(self, self._handlers[i]);
        }
        self._handlers = [];
      }, 0);
    }

    function _handle(self, handler) {
      var cb = self._state === 1 ? handler.onFulfilled : handler.onRejected;
      if (cb === null) {
        (self._state === 1 ? handler.resolve : handler.reject)(self._value);
        return;
      }
      try {
        var result = cb(self._value);
        if (result && typeof result.then === "function") {
          result.then(handler.resolve, handler.reject);
        } else {
          handler.resolve(result);
        }
      } catch (e) { handler.reject(e); }
    }

    MiniPromise.prototype.then = function (onFulfilled, onRejected) {
      var self = this;
      return new MiniPromise(function (resolve, reject) {
        var h = {
          onFulfilled: typeof onFulfilled === "function" ? onFulfilled : null,
          onRejected: typeof onRejected === "function" ? onRejected : null,
          resolve: resolve,
          reject: reject,
        };
        if (self._state === 0) { self._handlers.push(h); }
        else { setTimeout(function () { _handle(self, h); }, 0); }
      });
    };

    MiniPromise.prototype["catch"] = function (onRejected) {
      return this.then(null, onRejected);
    };

    MiniPromise.resolve = function (value) {
      if (value && typeof value.then === "function") return value;
      return new MiniPromise(function (resolve) { resolve(value); });
    };

    MiniPromise.reject = function (reason) {
      return new MiniPromise(function (_, reject) { reject(reason); });
    };

    window.Promise = MiniPromise;
  })();
}

/* ── fetch polyfill for older Silk browsers ────── */
if (typeof window.fetch === "undefined") {
  window.fetch = function (url, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(options.method || "GET", url);
      if (options.headers) {
        Object.keys(options.headers).forEach(function (key) {
          xhr.setRequestHeader(key, options.headers[key]);
        });
      }
      xhr.onload = function () {
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          json: function () {
            return Promise.resolve(JSON.parse(xhr.responseText));
          },
        });
      };
      xhr.onerror = function () { reject(new Error("Network error")); };
      xhr.send(options.body || null);
    });
  };
}

/* ── Configuration ──────────────────────────────── */
var CONFIG = {
  zipCode: "32250",
  // Jacksonville Beach, FL — Open-Meteo uses coordinates
  latitude: 30.2866,
  longitude: -81.3962,
  temperatureUnit: "fahrenheit",
  clocks: [
    { id: "clock-miami", timezone: "America/New_York" },
    { id: "clock-sanfran", timezone: "America/Los_Angeles" },
    { id: "clock-saopaulo", timezone: "America/Sao_Paulo" },
  ],
};

/* ── SVG weather icons (no emoji dependency) ────── */
var ICONS = {
  sun: '<svg viewBox="0 0 64 64" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="10" stroke="none"/><line x1="32" y1="6" x2="32" y2="16"/><line x1="32" y1="48" x2="32" y2="58"/><line x1="6" y1="32" x2="16" y2="32"/><line x1="48" y1="32" x2="58" y2="32"/><line x1="14" y1="14" x2="21" y2="21"/><line x1="43" y1="43" x2="50" y2="50"/><line x1="50" y1="14" x2="43" y2="21"/><line x1="21" y1="43" x2="14" y2="50"/></svg>',
  moon: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><mask id="mn"><rect width="64" height="64" fill="white"/><circle cx="40" cy="26" r="20" fill="black"/></mask></defs><circle cx="28" cy="32" r="22" fill="currentColor" mask="url(#mn)"/></svg>',
  sunCloud: '<svg viewBox="0 0 64 64" fill="currentColor" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><g stroke-width="2" stroke-linecap="round" opacity="0.7"><circle cx="20" cy="20" r="6" stroke="none"/><line x1="20" y1="8" x2="20" y2="12"/><line x1="20" y1="28" x2="20" y2="32"/><line x1="8" y1="20" x2="12" y2="20"/><line x1="28" y1="20" x2="32" y2="20"/><line x1="11" y1="11" x2="14" y2="14"/><line x1="26" y1="26" x2="29" y2="29"/><line x1="29" y1="11" x2="26" y2="14"/><line x1="14" y1="26" x2="11" y2="29"/></g><g stroke="none"><circle cx="26" cy="40" r="10"/><circle cx="38" cy="34" r="12"/><circle cx="50" cy="42" r="8"/><rect x="16" y="40" width="42" height="10" rx="5"/></g></svg>',
  cloud: '<svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="34" r="12"/><circle cx="36" cy="26" r="14"/><circle cx="48" cy="36" r="10"/><rect x="10" y="34" width="48" height="12" rx="6"/></svg>',
  rain: '<svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="26" r="10"/><circle cx="32" cy="20" r="12"/><circle cx="44" cy="28" r="8"/><rect x="10" y="26" width="42" height="10" rx="5"/><g stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.7"><line x1="18" y1="42" x2="14" y2="52"/><line x1="30" y1="42" x2="26" y2="52"/><line x1="42" y1="42" x2="38" y2="52"/></g></svg>',
  heavyRain: '<svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="24" r="10"/><circle cx="32" cy="18" r="12"/><circle cx="44" cy="26" r="8"/><rect x="10" y="24" width="42" height="10" rx="5"/><g stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.7"><line x1="14" y1="40" x2="10" y2="52"/><line x1="24" y1="40" x2="20" y2="52"/><line x1="34" y1="40" x2="30" y2="52"/><line x1="44" y1="40" x2="40" y2="52"/></g></svg>',
  snow: '<svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="26" r="10"/><circle cx="32" cy="20" r="12"/><circle cx="44" cy="28" r="8"/><rect x="10" y="26" width="42" height="10" rx="5"/><g opacity="0.7"><circle cx="18" cy="44" r="2.5"/><circle cx="32" cy="48" r="2.5"/><circle cx="44" cy="44" r="2.5"/><circle cx="24" cy="52" r="2"/><circle cx="38" cy="54" r="2"/></g></svg>',
  storm: '<svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="10"/><circle cx="32" cy="16" r="12"/><circle cx="44" cy="24" r="8"/><rect x="10" y="22" width="42" height="10" rx="5"/><polygon points="36,34 28,46 33,46 27,58 40,42 35,42 40,34" opacity="0.85"/></svg>',
  fog: '<svg viewBox="0 0 64 64" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="8" y1="18" x2="56" y2="18"/><line x1="12" y1="28" x2="52" y2="28"/><line x1="8" y1="38" x2="56" y2="38"/><line x1="16" y1="48" x2="48" y2="48"/></svg>',
  chat: '<svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M8 10h48v30H28l-12 12V40H8z" opacity="0.85"/><circle cx="22" cy="25" r="3"/><circle cx="32" cy="25" r="3"/><circle cx="42" cy="25" r="3"/></svg>',
};

/* ── WMO weather codes → description + icon + theme */
var WMO = {
  0: { desc: "Clear sky", icon: "sun", theme: "sunny" },
  1: { desc: "Mainly clear", icon: "sunCloud", theme: "sunny" },
  2: { desc: "Partly cloudy", icon: "sunCloud", theme: "cloudy" },
  3: { desc: "Overcast", icon: "cloud", theme: "cloudy" },
  45: { desc: "Foggy", icon: "fog", theme: "foggy" },
  48: { desc: "Depositing rime fog", icon: "fog", theme: "foggy" },
  51: { desc: "Light drizzle", icon: "rain", theme: "rainy" },
  53: { desc: "Moderate drizzle", icon: "rain", theme: "rainy" },
  55: { desc: "Dense drizzle", icon: "heavyRain", theme: "rainy" },
  61: { desc: "Slight rain", icon: "rain", theme: "rainy" },
  63: { desc: "Moderate rain", icon: "heavyRain", theme: "rainy" },
  65: { desc: "Heavy rain", icon: "heavyRain", theme: "rainy" },
  66: { desc: "Freezing rain", icon: "snow", theme: "rainy" },
  67: { desc: "Heavy freezing rain", icon: "snow", theme: "rainy" },
  71: { desc: "Slight snow", icon: "snow", theme: "snowy" },
  73: { desc: "Moderate snow", icon: "snow", theme: "snowy" },
  75: { desc: "Heavy snow", icon: "snow", theme: "snowy" },
  77: { desc: "Snow grains", icon: "snow", theme: "snowy" },
  80: { desc: "Slight showers", icon: "rain", theme: "rainy" },
  81: { desc: "Moderate showers", icon: "heavyRain", theme: "rainy" },
  82: { desc: "Violent showers", icon: "storm", theme: "stormy" },
  85: { desc: "Slight snow showers", icon: "snow", theme: "snowy" },
  86: { desc: "Heavy snow showers", icon: "snow", theme: "snowy" },
  95: { desc: "Thunderstorm", icon: "storm", theme: "stormy" },
  96: { desc: "Thunderstorm w/ hail", icon: "storm", theme: "stormy" },
  99: { desc: "Thunderstorm w/ heavy hail", icon: "storm", theme: "stormy" },
};

/* ── Timezone support detection & fallback ──────── */
var _tzSupported = (function () {
  try {
    // Pick a date where UTC hour 3 and LA hour differ for sure
    var d = new Date(Date.UTC(2020, 5, 15, 3, 0, 0));
    var utc = d.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", hour12: false });
    var pac = d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false });
    return utc !== pac;
  } catch (e) { return false; }
})();

function _secondSundayOfMarch(year) {
  var d = new Date(Date.UTC(year, 2, 1)).getUTCDay();
  return 8 + (7 - d) % 7;
}
function _firstSundayOfNov(year) {
  var d = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  return 1 + (7 - d) % 7;
}
function _isUSDST(date, stdOffsetHours) {
  var y = date.getUTCFullYear();
  var start = Date.UTC(y, 2, _secondSundayOfMarch(y), 2 - stdOffsetHours, 0, 0);
  var end = Date.UTC(y, 10, _firstSundayOfNov(y), 1 - stdOffsetHours, 0, 0);
  var t = date.getTime();
  return t >= start && t < end;
}
function _getOffsetMinutes(timezone, date) {
  switch (timezone) {
    case "America/New_York": return _isUSDST(date, -5) ? -240 : -300;
    case "America/Los_Angeles": return _isUSDST(date, -8) ? -420 : -480;
    case "America/Sao_Paulo": return -180;
    default: return -date.getTimezoneOffset();
  }
}
function _pad2(n) { return n < 10 ? "0" + n : "" + n; }
function _formatTimeFallback(timezone, date) {
  var off = _getOffsetMinutes(timezone, date);
  var total = date.getUTCHours() * 60 + date.getUTCMinutes() + off;
  while (total < 0) total += 1440;
  while (total >= 1440) total -= 1440;
  var h = Math.floor(total / 60);
  var m = total % 60;
  var s = date.getUTCSeconds();
  var ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return _pad2(h) + ":" + _pad2(m) + ":" + _pad2(s) + " " + ampm;
}

/* ── Clocks ─────────────────────────────────────── */
function updateClocks() {
  var now = new Date();
  for (var i = 0; i < CONFIG.clocks.length; i++) {
    var c = CONFIG.clocks[i];
    var timeStr;
    if (_tzSupported) {
      timeStr = now.toLocaleTimeString("en-US", {
        timeZone: c.timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } else {
      timeStr = _formatTimeFallback(c.timezone, now);
    }
    var el = document.querySelector("#" + c.id + " .clock-time");
    if (el) el.textContent = timeStr;
  }
}

/* ── Greeting & date ───────────────────────────── */
function updateGreeting() {
  var now = new Date();
  var hour = now.getHours();
  var greeting;
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
  var info = WMO[weatherCode] || WMO[0];
  var app = document.getElementById("app");

  // Use night theme for clear sky after dark
  var hour = new Date().getHours();
  var isNight = hour < 6 || hour >= 20;
  var theme = info.theme;
  var icon = info.icon;
  if (theme === "sunny" && isNight) {
    theme = "clear-night";
    icon = "moon";
  }

  app.className = "theme-" + theme;
  return { desc: info.desc, icon: icon, theme: theme };
}

function fetchWeather() {
  var latitude = CONFIG.latitude;
  var longitude = CONFIG.longitude;
  var temperatureUnit = CONFIG.temperatureUnit;
  var url =
    "https://api.open-meteo.com/v1/forecast?latitude=" + latitude + "&longitude=" + longitude +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
    "&temperature_unit=" + temperatureUnit + "&wind_speed_unit=mph&timezone=auto" +
    "&_t=" + Date.now();

  fetch(url).then(function (res) {
    return res.json();
  }).then(function (data) {
    var current = data.current;
    var info = applyTheme(current.weather_code);
    var unit = temperatureUnit === "fahrenheit" ? "°F" : "°C";

    document.getElementById("weatherIcon").innerHTML = ICONS[info.icon] || "";
    document.getElementById("weatherTemp").textContent = Math.round(current.temperature_2m) + unit;
    document.getElementById("weatherDesc").textContent = info.desc;
    document.getElementById("weatherDetail").textContent =
      "Feels like " + Math.round(current.apparent_temperature) + unit +
      " | Humidity " + current.relative_humidity_2m + "%" +
      " | Wind " + Math.round(current.wind_speed_10m) + " mph";
  })["catch"](function (err) {
    document.getElementById("weatherDesc").textContent = "Weather unavailable";
    console.error("Weather fetch failed:", err);
  });
}

/* ── Discussions ───────────────────────────────── */
function fetchLatestDiscussion() {
  var url = "https://api.github.com/repos/trespilhas/fire-dashboard/discussions?per_page=1&direction=desc&_t=" + Date.now();

  fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  }).then(function (res) {
    return res.json();
  }).then(function (discussions) {
    if (!Array.isArray(discussions) || discussions.length === 0) {
      document.getElementById("discussionTitle").textContent = "No discussions yet";
      document.getElementById("discussionBody").textContent = "Start a conversation on GitHub.";
      return;
    }

    var latest = discussions[0];
    document.getElementById("discussionTitle").textContent = latest.title;
    document.getElementById("discussionBody").textContent = latest.body
      ? latest.body.replace(/\r?\n/g, " ").slice(0, 200)
      : "";
    document.getElementById("discussionLink").href = latest.html_url;
  })["catch"](function (err) {
    document.getElementById("discussionTitle").textContent = "Discussions unavailable";
    document.getElementById("discussionBody").textContent = "";
    console.error("Discussion fetch failed:", err);
  });
}

/* ── Init ──────────────────────────────────────── */
document.getElementById("discussionIcon").innerHTML = ICONS.chat;
updateClocks();
updateGreeting();
fetchWeather();
fetchLatestDiscussion();

setInterval(updateClocks, 1000);
setInterval(updateGreeting, 60000);
setInterval(fetchWeather, 600000);          // refresh weather every 10 min
setInterval(fetchLatestDiscussion, 600000); // refresh discussions every 10 min
