import type { Position, WeatherData } from "../types";

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    cloud_cover: number;
    wind_speed_10m: number;
    uv_index: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    cloud_cover: number[];
    wind_speed_10m: number[];
    uv_index: number[];
  };
}

export async function fetchWeatherData(
  position: Position,
): Promise<WeatherData> {
  const lat = position.latitude.toFixed(4);
  const lon = position.longitude.toFixed(4);
  
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,uv_index&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=3`;
  
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else {
      throw new Error(
        `Weather API error: ${response.status} ${response.statusText}`,
      );
    }
  }

  const data: OpenMeteoResponse = await response.json();

  // Validate required fields
  if (!data.current || !data.hourly) {
    throw new Error("Invalid weather data received from API");
  }

  // Convert Open-Meteo format to our internal format
  const current = {
    dt: Math.floor(new Date(data.current.time).getTime() / 1000),
    temp: data.current.temperature_2m,
    feels_like: data.current.temperature_2m, // Open-Meteo doesn't provide feels_like in free tier
    pressure: 1013, // Default value
    humidity: data.current.relative_humidity_2m,
    uvi: data.current.uv_index,
    clouds: data.current.cloud_cover,
    wind_speed: data.current.wind_speed_10m,
    weather: [{
      id: 800,
      main: "Clear",
      description: "clear sky",
      icon: "01d"
    }]
  };

  // Convert hourly data (use all available data from 3-day forecast)
  const hourlyData = data.hourly;
  const maxHours = hourlyData.time.length;
  
  const hourly = Array.from({ length: maxHours }, (_, i) => ({
    dt: Math.floor(new Date(hourlyData.time[i]).getTime() / 1000),
    temp: hourlyData.temperature_2m[i],
    feels_like: hourlyData.temperature_2m[i],
    pressure: 1013,
    humidity: hourlyData.relative_humidity_2m[i],
    uvi: hourlyData.uv_index[i],
    clouds: hourlyData.cloud_cover[i],
    wind_speed: hourlyData.wind_speed_10m[i],
    weather: [{
      id: 800,
      main: "Clear",
      description: "clear sky",
      icon: "01d"
    }],
    pop: 0 // Not provided by Open-Meteo free tier
  }));

  return {
    current,
    hourly
  } as WeatherData;
}
