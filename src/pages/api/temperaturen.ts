import type { APIRoute } from 'astro';

const MOBILE_ALERTS_API = 'https://www.data199.com/api/pv1/device/lastmeasurement';
const PHONE_ID = process.env.MOBILE_ALERTS_PHONE_ID;

// Sensor-IDs
const SENSORS = {
  bad: '020113080F22',
  wohnzimmer: '026337DAADF1'
};

interface SensorMeasurement {
  idx: number;
  ts: number;
  c: number;
  t1?: number; // Temperatur in °C
}

interface SensorDevice {
  deviceid: string;
  lastseen: number;
  lowbat: boolean;
  measurement: SensorMeasurement;
}

interface MobileAlertsResponse {
  success: boolean;
  phoneid?: string;
  devices?: SensorDevice[];
  errorcode?: number;
  errormessage?: string;
}

export const GET: APIRoute = async () => {
  try {
    if (!PHONE_ID) {
      return new Response(
        JSON.stringify({
          error: 'MOBILE_ALERTS_PHONE_ID ist nicht konfiguriert',
          bad: null,
          wohnzimmer: null
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // API-Aufruf für beide Sensoren (POST mit x-www-form-urlencoded)
    const deviceIds = `${SENSORS.bad},${SENSORS.wohnzimmer}`;
    const body = new URLSearchParams({
      deviceids: deviceIds,
      phoneid: PHONE_ID
    });

    const response = await fetch(MOBILE_ALERTS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Nutzerkosten-App/1.0'
      },
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error(`Mobile Alerts API Fehler: ${response.status}`);
    }

    const data: MobileAlertsResponse = await response.json();

    // API-Fehlerbehandlung
    if (!data.success) {
      throw new Error(data.errormessage || 'Unbekannter API-Fehler');
    }

    // Sensordaten extrahieren
    const devices = data.devices || [];

    const badSensor = devices.find((d: SensorDevice) => d.deviceid === SENSORS.bad);
    const wohnzimmerSensor = devices.find((d: SensorDevice) => d.deviceid === SENSORS.wohnzimmer);

    const result = {
      bad: badSensor?.measurement?.t1 ?? null,
      wohnzimmer: wohnzimmerSensor?.measurement?.t1 ?? null,
      timestamp: new Date().toISOString(),
      lastUpdate: {
        bad: badSensor?.lastseen ? new Date(badSensor.lastseen * 1000).toISOString() : null,
        wohnzimmer: wohnzimmerSensor?.lastseen ? new Date(wohnzimmerSensor.lastseen * 1000).toISOString() : null
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
    console.error('Fehler beim Abrufen der Temperaturen:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
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
