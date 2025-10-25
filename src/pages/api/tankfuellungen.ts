import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../utils/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    
    const tankfuellungen = await prisma.tankfuellung.findMany({
      orderBy: {
        datum: 'asc',
      },
      include: {
        zaehler: {
          select: {
            id: true,
            einbauDatum: true,
          },
        },
      },
    });

    // Verbrauchsberechnung für jede Tankfüllung
    const tankfuellungenMitVerbrauch = tankfuellungen.map((tf, index) => {
      if (index > 0) {
        const vorherigeTf = tankfuellungen[index - 1];
        const verbrauchteStunden = tf.zaehlerstand - vorherigeTf.zaehlerstand;
        const verbrauchProStunde = verbrauchteStunden > 0 ? vorherigeTf.liter / verbrauchteStunden : 0;
        
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

export const POST: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;

    const body = await request.json();
    const jahr = new Date(body.datum).getFullYear();
    
    // Aktiven Zähler finden
    const aktiverZaehler = await prisma.zaehler.findFirst({
      where: { istAktiv: true },
    });

    if (!aktiverZaehler) {
      return new Response(JSON.stringify({ 
        error: 'Kein aktiver Zähler gefunden. Bitte erst einen Zähler einbauen.' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Tankfüllung erstellen (allgemeine Systemdaten)
    const tankfuellung = await prisma.tankfuellung.create({
      data: {
        datum: new Date(body.datum + 'T12:00:00Z'), // Mittag UTC für konsistente Datums-Behandlung
        liter: parseFloat(body.liter),
        preisProLiter: parseFloat(body.preisProLiter),
        zaehlerstand: parseFloat(body.zaehlerstand),
        zaehlerId: aktiverZaehler.id,
      },
    });

    // Verbrauchsberechnung: Nur für Tankfüllungen mit dem gleichen Zähler
    const tankfuellungenGleicherZaehler = await prisma.tankfuellung.findMany({
      where: { zaehlerId: aktiverZaehler.id },
      orderBy: { datum: 'asc' },
    });

    // Ab der 2. Tankfüllung mit dem gleichen Zähler: Tatsächlichen Verbrauch berechnen
    if (tankfuellungenGleicherZaehler.length >= 2) {
      const neueste = tankfuellungenGleicherZaehler[tankfuellungenGleicherZaehler.length - 1];
      const vorherige = tankfuellungenGleicherZaehler[tankfuellungenGleicherZaehler.length - 2];
      
      const stundenDifferenz = neueste.zaehlerstand - vorherige.zaehlerstand;
      if (stundenDifferenz > 0) {
        const neuerVerbrauchProStunde = neueste.liter / stundenDifferenz;
        
        console.log(`🔥 VERBRAUCH BERECHNET (Zähler ${aktiverZaehler.id}): ${neueste.liter}L ÷ ${stundenDifferenz}h = ${neuerVerbrauchProStunde.toFixed(3)} L/h`);
        
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
              uebernachtungMitglied: 5.0,
              uebernachtungGast: 10.0,
              verbrauchProStunde: neuerVerbrauchProStunde,
              istBerechnet: true,
            },
          });
        }
      }
    }

    return new Response(JSON.stringify({
      ...tankfuellung,
      verbrauchBerechnet: tankfuellungenGleicherZaehler.length >= 2,
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
