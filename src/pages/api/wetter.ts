import type { APIRoute } from 'astro';

const OPENWEATHER_API_KEY = import.meta.env.OPENWEATHER_API_KEY;
const LATITUDE = import.meta.env.OPENWEATHER_LAT;
const LONGITUDE = import.meta.env.OPENWEATHER_LON;

// OpenWeatherMap One Call API 3.0
const ONE_CALL_API = 'https://api.openweathermap.org/data/3.0/onecall';

interface WeatherDescription {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface CurrentWeather {
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

interface HourlyWeather {
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
  pop: number; // Probability of precipitation
}

interface DailyTemp {
  day: number;
  min: number;
  max: number;
  night: number;
  eve: number;
  morn: number;
}

interface DailyWeather {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: DailyTemp;
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

interface WeatherAlert {
  sender_name: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
}

interface OneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  alerts?: WeatherAlert[];
}

export const GET: APIRoute = async () => {
  try {
    if (!OPENWEATHER_API_KEY || !LATITUDE || !LONGITUDE) {
      return new Response(
        JSON.stringify({
          error: 'OpenWeatherMap API ist nicht konfiguriert',
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

    // One Call API 3.0 - Alles in einem Request
    const response = await fetch(
      `${ONE_CALL_API}?lat=${LATITUDE}&lon=${LONGITUDE}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=de`
    );

    if (!response.ok) {
      throw new Error(`OpenWeatherMap API Fehler: ${response.status}`);
    }

    const data: OneCallResponse = await response.json();

    // Aktuelles Wetter aufbereiten
    const current = {
      temp: Math.round(data.current.temp * 10) / 10,
      feelsLike: Math.round(data.current.feels_like * 10) / 10,
      humidity: data.current.humidity,
      pressure: data.current.pressure,
      dewPoint: Math.round(data.current.dew_point * 10) / 10,
      uvIndex: Math.round(data.current.uvi * 10) / 10,
      clouds: data.current.clouds,
      visibility: Math.round(data.current.visibility / 1000), // Meter zu Kilometer
      description: data.current.weather[0]?.description || 'Keine Daten',
      icon: data.current.weather[0]?.icon || '01d',
      windSpeed: Math.round(data.current.wind_speed * 3.6), // m/s zu km/h
      windDirection: data.current.wind_deg,
      timestamp: new Date(data.current.dt * 1000).toISOString()
    };

    // Stündliche Vorhersage - nächste 24 Stunden
    const hourly = data.hourly.slice(0, 24).map((item) => ({
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

    // Tägliche Vorhersage - nächste 7 Tage
    const daily = data.daily.slice(0, 7).map((item) => ({
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

    // Wetterwarnungen (falls vorhanden)
    const alerts = data.alerts?.map((alert) => ({
      sender: alert.sender_name,
      event: alert.event,
      start: new Date(alert.start * 1000).toISOString(),
      end: new Date(alert.end * 1000).toISOString(),
      description: alert.description,
      tags: alert.tags
    })) || [];

    const result = {
      current,
      hourly,
      daily,
      alerts,
      timezone: data.timezone,
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
    console.error('Fehler beim Abrufen der Wetterdaten:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
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
