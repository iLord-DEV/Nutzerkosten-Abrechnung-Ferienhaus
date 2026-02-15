import type { APIRoute } from 'astro';

// Weather Cache Service Configuration
const WEATHER_CACHE_URL = process.env.WEATHER_CACHE_URL || 'http://localhost:3003/api';
const LOCATION_SLUG = 'wuestenstein';

// Types from Weather Cache Service (OpenWeatherMap format)
interface WeatherDescription {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface CurrentWeatherResponse {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather: WeatherDescription[];
}

interface HourlyWeatherResponse {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather: WeatherDescription[];
  pop: number;
}

interface DailyWeatherResponse {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: {
    day: number;
    min: number;
    max: number;
    night: number;
    eve: number;
    morn: number;
  };
  feels_like: {
    day: number;
    night: number;
    eve: number;
    morn: number;
  };
  pressure: number;
  humidity: number;
  dew_point: number;
  wind_speed: number;
  wind_deg: number;
  weather: WeatherDescription[];
  clouds: number;
  pop: number;
  rain?: number;
  snow?: number;
  uvi: number;
}

interface AlertResponse {
  sender_name: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
}

interface AlertsResponse {
  alerts: AlertResponse[];
}

export const GET: APIRoute = async () => {
  try {
    // Parallel fetch from Weather Cache Service
    const [currentRes, hourlyRes, dailyRes, alertsRes] = await Promise.all([
      fetch(`${WEATHER_CACHE_URL}/weather/${LOCATION_SLUG}/current`),
      fetch(`${WEATHER_CACHE_URL}/weather/${LOCATION_SLUG}/hourly?hours=24`),
      fetch(`${WEATHER_CACHE_URL}/weather/${LOCATION_SLUG}/daily?days=7`),
      fetch(`${WEATHER_CACHE_URL}/weather/${LOCATION_SLUG}/alerts`)
    ]);

    // Check if any request failed
    if (!currentRes.ok || !hourlyRes.ok || !dailyRes.ok) {
      throw new Error(`Weather Cache API Fehler: current=${currentRes.status}, hourly=${hourlyRes.status}, daily=${dailyRes.status}`);
    }

    const currentData: CurrentWeatherResponse = await currentRes.json();
    const hourlyData: HourlyWeatherResponse[] = await hourlyRes.json();
    const dailyData: DailyWeatherResponse[] = await dailyRes.json();

    // Alerts are optional (may return 404 if no alerts)
    let alertsData: AlertResponse[] = [];
    if (alertsRes.ok) {
      const alertsJson: AlertsResponse = await alertsRes.json();
      alertsData = alertsJson.alerts || [];
    }

    // Transform current weather (same format as before for dashboard compatibility)
    const current = {
      temp: Math.round(currentData.temp * 10) / 10,
      feelsLike: Math.round(currentData.feels_like * 10) / 10,
      humidity: currentData.humidity,
      pressure: currentData.pressure,
      dewPoint: Math.round(currentData.dew_point * 10) / 10,
      uvIndex: Math.round(currentData.uvi * 10) / 10,
      clouds: currentData.clouds,
      visibility: Math.round(currentData.visibility / 1000), // Meter zu Kilometer
      description: currentData.weather[0]?.description || 'Keine Daten',
      icon: currentData.weather[0]?.icon || '01d',
      windSpeed: Math.round(currentData.wind_speed * 3.6), // m/s zu km/h
      windDirection: currentData.wind_deg,
      timestamp: new Date(currentData.dt * 1000).toISOString()
    };

    // Transform hourly forecast
    const hourly = hourlyData.slice(0, 24).map((item) => ({
      time: new Date(item.dt * 1000).toISOString(),
      temp: Math.round(item.temp * 10) / 10,
      feelsLike: Math.round(item.feels_like * 10) / 10,
      description: item.weather[0]?.description || 'Keine Daten',
      icon: item.weather[0]?.icon || '01d',
      humidity: item.humidity,
      windSpeed: Math.round(item.wind_speed * 3.6),
      pop: Math.round(item.pop * 100), // Probability of Precipitation in %
      uvIndex: Math.round(item.uvi * 10) / 10
    }));

    // Transform daily forecast
    const daily = dailyData.slice(0, 7).map((item) => ({
      date: new Date(item.dt * 1000).toISOString(),
      sunrise: new Date(item.sunrise * 1000).toISOString(),
      sunset: new Date(item.sunset * 1000).toISOString(),
      tempDay: Math.round(item.temp.day * 10) / 10,
      tempMin: Math.round(item.temp.min * 10) / 10,
      tempMax: Math.round(item.temp.max * 10) / 10,
      tempNight: Math.round(item.temp.night * 10) / 10,
      description: item.weather[0]?.description || 'Keine Daten',
      icon: item.weather[0]?.icon || '01d',
      humidity: item.humidity,
      windSpeed: Math.round(item.wind_speed * 3.6),
      pop: Math.round(item.pop * 100),
      uvIndex: Math.round(item.uvi * 10) / 10,
      rain: item.rain || 0,
      snow: item.snow || 0
    }));

    // Transform alerts
    const alerts = alertsData.map((alert) => ({
      sender: alert.sender_name,
      event: alert.event,
      start: new Date(alert.start * 1000).toISOString(),
      end: new Date(alert.end * 1000).toISOString(),
      description: alert.description,
      tags: alert.tags
    }));

    const result = {
      current,
      hourly,
      daily,
      alerts,
      timezone: 'Europe/Berlin',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600' // Cache für 10 Minuten
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Wetterdaten vom Weather Cache:', error);

    return new Response(
      JSON.stringify({
        error: 'Interner Serverfehler',
        current: null,
        hourly: null,
        daily: null,
        alerts: null
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
