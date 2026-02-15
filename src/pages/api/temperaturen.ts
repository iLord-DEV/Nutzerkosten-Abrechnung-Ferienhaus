import type { APIRoute } from 'astro';

// Weather Cache Service Configuration
const WEATHER_CACHE_URL = process.env.WEATHER_CACHE_URL || 'http://localhost:3003/api';

interface SensorResponse {
  temp: number | null;
  humidity: number | null;
  timestamp: number;
}

export const GET: APIRoute = async () => {
  try {
    // Parallel fetch from Weather Cache Service
    const [badRes, wohnzimmerRes] = await Promise.all([
      fetch(`${WEATHER_CACHE_URL}/sensors/wuestenstein/bad/current`),
      fetch(`${WEATHER_CACHE_URL}/sensors/wuestenstein/wohnzimmer/current`)
    ]);

    // Check responses
    const badData: SensorResponse | null = badRes.ok ? await badRes.json() : null;
    const wohnzimmerData: SensorResponse | null = wohnzimmerRes.ok ? await wohnzimmerRes.json() : null;

    const result = {
      bad: badData?.temp ?? null,
      wohnzimmer: wohnzimmerData?.temp ?? null,
      timestamp: new Date().toISOString(),
      lastUpdate: {
        bad: badData?.timestamp ? new Date(badData.timestamp * 1000).toISOString() : null,
        wohnzimmer: wohnzimmerData?.timestamp ? new Date(wohnzimmerData.timestamp * 1000).toISOString() : null
      }
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache für 5 Minuten
        }
      }
    );

  } catch (error) {
    console.error('Fehler beim Abrufen der Temperaturen vom Weather Cache:', error);

    return new Response(
      JSON.stringify({
        error: 'Interner Serverfehler',
        bad: null,
        wohnzimmer: null
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
