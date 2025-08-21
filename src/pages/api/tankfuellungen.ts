import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GET: APIRoute = async () => {
  try {
    const tankfuellungen = await prisma.tankfuellung.findMany({
      orderBy: {
        datum: 'desc',
      },
    });

    // Verbrauchsberechnung für jede Tankfüllung
    const tankfuellungenMitVerbrauch = tankfuellungen.map((tf, index) => {
      if (index < tankfuellungen.length - 1) {
        const naechsteTf = tankfuellungen[index + 1];
        const verbrauchteStunden = tf.zaehlerstand - naechsteTf.zaehlerstand;
        const verbrauchProStunde = verbrauchteStunden > 0 ? tf.liter / verbrauchteStunden : 0;
        
        return {
          ...tf,
          verbrauchProStunde: verbrauchProStunde.toFixed(1),
          verbrauchteStunden: verbrauchteStunden.toFixed(1),
        };
      }
      return {
        ...tf,
        verbrauchProStunde: '-',
        verbrauchteStunden: '-',
      };
    });

    return new Response(JSON.stringify(tankfuellungenMitVerbrauch), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden der Tankfüllungen:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Laden der Daten' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Session prüfen
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
    if (session.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Nur Admins können Tankfüllungen erfassen' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const jahr = new Date(body.datum).getFullYear();
    
    // Tankfüllung erstellen (allgemeine Systemdaten)
    const tankfuellung = await prisma.tankfuellung.create({
      data: {
        datum: new Date(body.datum + 'T12:00:00Z'), // Mittag UTC für konsistente Datums-Behandlung
        liter: parseFloat(body.liter),
        preisProLiter: parseFloat(body.preisProLiter),
        zaehlerstand: parseFloat(body.zaehlerstand),
      },
    });

    // Prüfen ob das die 2. Tankfüllung ist (kann Jahre später sein!)
    const alleTankfuellungen = await prisma.tankfuellung.findMany({
      orderBy: { datum: 'asc' },
    });

    // Ab der 2. Tankfüllung: Tatsächlichen Verbrauch berechnen
    if (alleTankfuellungen.length >= 2) {
      const neueste = alleTankfuellungen[alleTankfuellungen.length - 1];
      const vorherige = alleTankfuellungen[alleTankfuellungen.length - 2];
      
      const stundenDifferenz = neueste.zaehlerstand - vorherige.zaehlerstand;
      if (stundenDifferenz > 0) {
        const neuerVerbrauchProStunde = neueste.liter / stundenDifferenz;
        
        console.log(`🔥 VERBRAUCH BERECHNET: ${neueste.liter}L ÷ ${stundenDifferenz}h = ${neuerVerbrauchProStunde.toFixed(3)} L/h`);
        
        // Aktualisiere alle Jahre ab dem Jahr der 2. Tankfüllung
        const startJahr = new Date(neueste.datum).getFullYear();
        const currentYear = new Date().getFullYear();
        
        for (let year = startJahr; year <= currentYear; year++) {
          await prisma.preise.upsert({
            where: { jahr: year },
            update: {
              verbrauchProStunde: neuerVerbrauchProStunde,
              istBerechnet: true,
            },
            create: {
              jahr: year,
              oelpreisProLiter: body.preisProLiter,
              uebernachtungMitglied: 15.0,
              uebernachtungGast: 25.0,
              verbrauchProStunde: neuerVerbrauchProStunde,
              istBerechnet: true,
            },
          });
        }
      }
    }

    return new Response(JSON.stringify({
      ...tankfuellung,
      verbrauchBerechnet: alleTankfuellungen.length >= 2,
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Tankfüllung:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Erstellen der Tankfüllung' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
