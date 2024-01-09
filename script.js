const API_KEY = "S4XXLCPPG48HXA722PZHXWBZ6";
let city = "";
let currentCity = "";
let weather = {};
let timeInterval;
let userCoords = null;

const settings = {
  tempUnit: "C",
  windSpeedUnit: "km/h",
  pressureUnit: "hPa",
  humidityUnit: "%",
  mode: "dark",
  hour: "12h",
};

const sectionEls = document.querySelectorAll("section");
const sidebarLinkEls = document.querySelectorAll(".sidebar .menu-item");

const showSection = (section) => {
  sectionEls.forEach((sectionEl) => {
    sectionEl.classList.remove("active");
  });
  section = document.getElementById(section);
  if (section) {
    section.classList.add("active");
  }

  sidebarLinkEls.forEach((sidebarLinkEl) => {
    sidebarLinkEl.classList.remove("active");
  });

  const sidebarLinkEl = document.querySelector(
    `[data-section="${section.id}"]`
  );
  if (sidebarLinkEl) {
    sidebarLinkEl.classList.add("active");
  }
};

sidebarLinkEls.forEach((sidebarLinkEl) => {
  sidebarLinkEl.addEventListener("click", (e) => {
    const section = sidebarLinkEl.dataset.section;
    showSection(section);
    if (section === "cities") {
      renderBookmarkedCities();
    }
  });
});

const cityEl = document.getElementById("city"),
  datetimeEl = document.getElementById("datetime"),
  tempEl = document.getElementById("temp"),
  iconEl = document.getElementById("icon"),
  bookmarkCityBtn = document.getElementById("bookmark-btn");

const todayForecastEl = document.getElementById("today-forecast");
const forecastItemHTML = (time, icon, desc, temp) => `
  <div class="forecast-item">
    <div class="time">${time}</div>
    <div class="icon">
      <img src="${icon}" alt="${desc}" />
    </div>
    <div class="temp">${temp}</div>
  </div>
`;

const weeklyForecastEl = document.getElementById("weekly-forecast");
const weeklyForecastItemHTML = (day, icon, desc, maxTemp, lowTemp) => `
  <li>
   <p class="day">${day}</p>
   <div class="bottom">
   <div class="icon-wrapper">
       <img src="icons/${icon}.png" alt="${desc}" class="icon" />
       <p class="text">${desc}</p>
    </div>
  <p class="temp">${maxTemp}/<span>${lowTemp}</span></p></div>
 </li>
`;

const feelsLikeEl = document.getElementById("feels-like"),
  windSpeedEl = document.getElementById("wind-speed"),
  humidityEl = document.getElementById("humidity"),
  UVIndexEl = document.getElementById("uv-index"),
  pressureEl = document.getElementById("pressure"),
  sunriseEl = document.getElementById("sunrise"),
  sunsetEl = document.getElementById("sunset"),
  cloudsEl = document.getElementById("clouds");

const fetchWeather = async (city) => {
  const response = await fetch(
    `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city}/next7days?unitGroup=metric&key=${API_KEY}&contentType=json`
  );
  const data = await response.json();
  return data;
};

const updateWeather = async () => {
  document.body.classList.add("loading");
  if (!city && userCoords) {
    city = await getUserCity();
  }

  if (city !== currentCity) {
    weather = await fetchWeather(city.name);
    console.log(weather);
    currentCity = city;
    cityEl.textContent = city.name;
    const bookmarkedCities = JSON.parse(
      localStorage.getItem("bookmarkedCities")
    );
    if (bookmarkedCities) {
      if (bookmarkedCities.includes(currentCity)) {
        bookmarkCityBtn.classList.add("active");
      } else {
        bookmarkCityBtn.classList.remove("active");
      }
    }
  }

  datetimeEl.textContent = getDatetime(city.timezone, settings.hour === "12h");

  clearInterval(timeInterval);

  timeInterval = setInterval(() => {
    datetimeEl.textContent = getDatetime(
      city.timezone,
      settings.hour === "12h"
    );
  }, 1000);

  const { temp, conditions, icon } = weather.currentConditions;
  tempEl.textContent = convertTemp(temp);
  iconEl.src = `icons/${icon}.png`;
  iconEl.alt = conditions;
  updateTodayForecast(weather.days[0].hours);
  updateWeeklyForecast(weather.days.slice(1));

  feelsLikeEl.textContent = convertTemp(weather.currentConditions.feelslike);
  windSpeedEl.textContent = convertWindSpeed(
    weather.currentConditions.windspeed
  );
  humidityEl.textContent =
    weather.currentConditions.humidity + settings.humidityUnit;
  UVIndexEl.textContent = weather.currentConditions.uvindex;
  pressureEl.textContent = convertPressure(weather.currentConditions.pressure);
  sunriseEl.textContent = formatTime(weather.currentConditions.sunrise);
  sunsetEl.textContent = formatTime(weather.currentConditions.sunset);
  cloudsEl.textContent = weather.currentConditions.cloudcover + "%";
  document.body.classList.remove("loading");
};

const updateTodayForecast = (forecast) => {
  todayForecastEl.innerHTML = "";
  forecast.forEach((hour) => {
    const time = formatTime(hour.datetime);
    const icon = `icons/${hour.icon}.png`;
    const desc = hour.conditions;
    const temp = convertTemp(hour.temp);
    todayForecastEl.innerHTML += forecastItemHTML(time, icon, desc, temp);
  });
};

const updateWeeklyForecast = (forecast) => {
  weeklyForecastEl.innerHTML = "";
  forecast.forEach((day) => {
    const date = new Date(day.datetime);
    const dayName = date.toLocaleString("en-US", { weekday: "long" });
    const icon = day.icon;
    const desc = day.conditions;
    const maxTemp = convertTemp(day.tempmax);
    const lowTemp = convertTemp(day.tempmin);
    weeklyForecastEl.innerHTML += weeklyForecastItemHTML(
      dayName,
      icon,
      desc,
      maxTemp,
      lowTemp
    );
  });
};

const getUserCoords = async () => {
  let location = null;
  try {
    location = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  } catch (err) {
    alert("Please allow location access to get your current city or search");
  }
  if (location) {
    userCoords = location.coords;
  }
};

const getUserCity = async () => {
  let data = await fetch(
    `https://api.teleport.org/api/locations/${userCoords.latitude},${userCoords.longitude}/`
  );
  data = await data.json();
  let cityLink =
    data._embedded["location:nearest-cities"][0]._links["location:nearest-city"]
      .href;

  let cityDetails = await getCityDetails(cityLink);

  // create  new city object with city name and full name and timezone
  const city = {
    name: cityDetails.name,
    fullName: cityDetails.full_name,
    timezone: cityDetails._links["city:timezone"].name,
    cityLink,
  };

  return city;
};

const getDatetime = (timezone, hour12) => {
  const date = new Date().toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const timeOptions = {
    hour: "numeric",
    minute: "numeric",
    hour12: hour12,
    timeZone: timezone,
  };

  const time = new Date().toLocaleTimeString("en-US", timeOptions);

  return `${date}, ${time}`;
};

const formatTime = (time) => {
  const [hour, minute] = time.split(":");
  const date = new Date();
  date.setHours(hour);
  date.setMinutes(minute);
  const options = {
    hour: "numeric",
    minute: "numeric",
    hour12: settings.hour === "12h",
  };
  return date.toLocaleString("en-US", options);
};

const init = async () => {
  // if settings retrieved from local storage then update the UI
  handleSavedSettings();
  handleMode();
  await getUserCoords();
  if (userCoords) {
    await updateWeather();
    showSection("home");
  } else {
    document.body.classList.remove("loading");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});

// Search functionality

const searchInput = document.getElementById("search-input"),
  autocompleteEl = document.getElementById("autocomplete"),
  searchIcon = document.getElementById("search"),
  loadingIcon = document.getElementById("loading"),
  closeIcon = document.getElementById("close");

const searchCities = async (searchTerm) => {
  let data = await fetch(
    `https://api.teleport.org/api/cities/?search=${encodeURIComponent(
      searchTerm
    )}`
  );

  data = await data.json();
  const foundCities = [];
  data._embedded["city:search-results"].forEach((city) => {
    foundCities.push({
      name: city.matching_full_name,
      link: city._links["city:item"].href,
    });
  });

  return foundCities;
};

const getCityDetails = async (cityLink) => {
  let data = await fetch(cityLink);
  data = await data.json();
  return data;
};

const showAutocomplete = (cities) => {
  autocompleteEl.innerHTML = "";
  autocompleteEl.classList.add("active");
  // create ul element
  const autocompleteListEl = document.createElement("ul");
  autocompleteEl.appendChild(autocompleteListEl);

  cities.forEach((item) => {
    const autocompleteItemEl = document.createElement("li");
    autocompleteItemEl.textContent = item.name;
    // add active class to the el if it's the current city name
    if (item.name === city.fullName) {
      autocompleteItemEl.classList.add("active");
    }
    autocompleteItemEl.addEventListener("click", async () => {
      if (item.name !== city.fullName) {
        searchInput.value = item.name;
        autocompleteEl.innerHTML = "";
        autocompleteEl.classList.remove("active");
        let cityDetails = await getCityDetails(item.link);
        city = {
          name: cityDetails.name,
          fullName: cityDetails.full_name,
          timezone: cityDetails._links["city:timezone"].name,
          cityLink: item.link,
        };
        await updateWeather();
        showSection("home");
      }
    });
    autocompleteListEl.appendChild(autocompleteItemEl);
  });
};

let prevSearchTerm = "";
let prevFoundCities = [];

const handleSearch = async (e) => {
  const searchTerm = e.target.value;
  if (searchTerm.length >= 3) {
    loadingIcon.classList.remove("hidden");
    closeIcon.classList.add("hidden");
    let foundCities = [];

    if (prevSearchTerm === searchTerm) {
      foundCities = prevFoundCities;
    } else {
      foundCities = await searchCities(searchTerm);
      prevFoundCities = foundCities;
      prevSearchTerm = searchTerm;
    }
    if (foundCities.length > 0) {
      showAutocomplete(foundCities);
    } else {
      autocompleteEl.innerHTML = "";
      autocompleteEl.classList.remove("active");
    }

    loadingIcon.classList.add("hidden");
    closeIcon.classList.remove("hidden");
  } else {
    autocompleteEl.innerHTML = "";
    autocompleteEl.classList.remove("active");
  }
};

let typingTimer;
searchInput.addEventListener("input", function (e) {
  const searchTerm = e.target.value;
  if (searchTerm === "") {
    searchIcon.classList.remove("hidden");
    closeIcon.classList.add("hidden");
  } else {
    searchIcon.classList.add("hidden");
    closeIcon.classList.remove("hidden");
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    handleSearch(e);
  }, 1000);
});

searchInput.addEventListener("focus", handleSearch);

closeIcon.addEventListener("click", () => {
  searchInput.value = "";
  autocompleteEl.innerHTML = "";
  autocompleteEl.classList.remove("active");
  searchIcon.classList.remove("hidden");
  closeIcon.classList.add("hidden");
  currentCity = "";
  init();
});

document.addEventListener("click", (e) => {
  if (
    !e.target.closest("#search-input") &&
    !e.target.closest("#autocomplete")
  ) {
    autocompleteEl.classList.remove("active");
  }
});

// switch button functionality
const switchEls = document.querySelectorAll(".switch");

switchEls.forEach((switchEl) => {
  const switchItems = switchEl.querySelectorAll(".switch-item");
  const switchBackdropEl = switchEl.querySelector(".switch-backdrop");
  // get all switch children with calss switch-item then set swith.backdrop width

  switchBackdropEl.style.width = `calc(100% / ${switchItems.length} - 10px)`;
  // check which switch item is active and move switch.backdrop to it

  // set active class on switch item when clicked and move switch.backdrop to the clicked item by setting left property + 5px to center it

  switchItems.forEach((switchItem) => {
    if (switchItem.classList.contains("active")) {
      if (switchItem.previousElementSibling === null) {
        switchBackdropEl.style.left = switchItem.offsetLeft - 5 + "px";
      } else {
        switchBackdropEl.style.left = switchItem.offsetLeft + 5 + "px";
      }
    }

    switchItem.addEventListener("click", (e) => {
      switchItems.forEach((switchItem) => {
        switchItem.classList.remove("active");
      });
      switchItem.classList.add("active");
      // if switch item is the first one then
      if (switchItem.previousElementSibling === null) {
        switchBackdropEl.style.left = switchItem.offsetLeft - 5 + "px";
      } else {
        switchBackdropEl.style.left = switchItem.offsetLeft + 5 + "px";
      }

      // handle switch button click
      handleSettings(e);
    });
  });
});

const handleSettings = (e) => {
  const switchId = e.currentTarget.closest(".switch").id;
  const switchValue = e.currentTarget.dataset.value;
  console.log(switchId, switchValue);
  settings[switchId] = switchValue;
  if (switchId === "mode") {
    handleMode();
  } else {
    updateWeather();
  }
  localStorage.setItem("settings", JSON.stringify(settings));
};

// if settings retrieved from local storage then update the UI
const handleSavedSettings = () => {
  // get settings from local storage
  const settingsFromStorage = localStorage.getItem("settings");
  if (settingsFromStorage) {
    Object.assign(settings, JSON.parse(settingsFromStorage));
  }
  // update switch buttons for each setting in settings object
  for (const setting in settings) {
    const switchEl = document.getElementById(setting);
    if (switchEl) {
      const switchBackdropEl = switchEl.querySelector(".switch-backdrop");
      const switchItems = switchEl.querySelectorAll(".switch-item");
      switchItems.forEach((switchItem) => {
        if (switchItem.dataset.value === settings[setting]) {
          switchItem.classList.add("active");
          if (switchItem.previousElementSibling === null) {
            switchBackdropEl.style.left = switchItem.offsetLeft - 5 + "px";
          } else {
            switchBackdropEl.style.left = switchItem.offsetLeft + 5 + "px";
          }
        } else {
          switchItem.classList.remove("active");
        }
      });
    }
  }
};

// handle dark mode
const handleMode = () => {
  const bodyEl = document.body;
  const prefersDarkMode = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  if (
    settings.mode === "dark" ||
    (settings.mode === "system" && prefersDarkMode)
  ) {
    bodyEl.classList.add("dark");
  } else {
    bodyEl.classList.remove("dark");
  }
};

// unit conversions
// temp c, f
const convertTemp = (temp) => {
  const convertedTemp = settings.tempUnit === "C" ? temp : (temp * 9) / 5 + 32;
  return `${convertedTemp.toFixed(1)}°${settings.tempUnit}`;
};

// wind speed km/h, m/s, knots
const convertWindSpeed = (windSpeed) => {
  let convertedSpeed = windSpeed;
  switch (settings.windSpeedUnit) {
    case "m/s":
      convertedSpeed /= 3.6;
      break;
    case "knots":
      convertedSpeed /= 1.852;
      break;
    default:
      break;
  }
  return `${convertedSpeed.toFixed(2)} ${settings.windSpeedUnit}`;
};

// pressure hPa, inch, kPa, mm
const convertPressure = (pressure) => {
  let convertedPressure = pressure;
  switch (settings.pressureUnit) {
    case "in":
      convertedPressure *= 0.02953;
      break;
    case "kPa":
      convertedPressure /= 10;
      break;
    case "mm":
      convertedPressure *= 0.750062;
      break;
    default:
      break;
  }
  return `${convertedPressure.toFixed(2)} ${settings.pressureUnit}`;
};

// bookmark city
bookmarkCityBtn.addEventListener("click", () => {
  let bookmarkedCities = JSON.parse(localStorage.getItem("bookmarkedCities"));
  if (bookmarkedCities) {
    let isBookmarked = false;
    bookmarkedCities.forEach((item) => {
      if (item.fullName === currentCity.fullName) {
        isBookmarked = true;
      }
    });
    if (bookmarkedCities && isBookmarked) {
      bookmarkedCities = bookmarkedCities.filter(
        (item) => item.fullName !== currentCity.fullName
      );
      bookmarkCityBtn.classList.remove("active");
    } else {
      bookmarkedCities.push(currentCity);
      bookmarkCityBtn.classList.add("active");
    }
  } else {
    bookmarkedCities = [currentCity];
    bookmarkCityBtn.classList.add("active");
  }
  localStorage.setItem("bookmarkedCities", JSON.stringify(bookmarkedCities));
});

// render bookmarked cities
const bookmarkedCitiesEl = document.getElementById("bookmarks");
let prevRenderedBookmarkedCities = [];
const bookmarkedCityHTML = (city, temp, icon, time) => `
                  <div class="icon"><img src="icons/${icon}.png" alt="sunny"  /></div>
                  <div class="details">
                    <div>
                      <p class="city">${city}</p>
                      <p class="temp">${temp}</p>
                    </div>
                    <p class="time">
                      <i class="fa-solid fa-clock"></i>
                      <span>${time}</span>
                    </p>
                  </div>
`;

const renderBookmarkedCities = async () => {
  document.body.classList.add("loading");
  const bookmarkedCities = JSON.parse(localStorage.getItem("bookmarkedCities"));
  if (
    bookmarkedCities &&
    !compareCityArrays(bookmarkedCities, prevRenderedBookmarkedCities)
  ) {
    console.log("rendering bookmarked cities");
    bookmarkedCitiesEl.innerHTML = "";
    bookmarkedCities.forEach(async (item) => {
      const weather = await fetchWeather(item.name);
      const { temp, icon } = weather.currentConditions;
      const time = getDatetime(item.timezone, settings.hour === "12h");
      const bookmarkedCityEl = document.createElement("li");
      bookmarkedCityEl.classList.add("box");

      bookmarkedCityEl.innerHTML = bookmarkedCityHTML(
        item.name,
        convertTemp(temp),
        icon,
        time
      );

      bookmarkedCityEl.addEventListener("click", () => {
        if (item.fullName !== currentCity.fullName) {
          city = item;
          updateWeather();
          showSection("home");
        } else {
          showSection("home");
        }
      });

      bookmarkedCitiesEl.appendChild(bookmarkedCityEl);
    });
    prevRenderedBookmarkedCities = bookmarkedCities;
  }
  document.body.classList.remove("loading");
};

function compareCityArrays(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = arr1.length; i--; ) {
    if (arr1[i].fullName !== arr2[i].fullName) {
      return false;
    }
  }

  return true;
}
