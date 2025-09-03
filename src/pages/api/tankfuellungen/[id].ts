import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../utils/auth';

const prisma = new PrismaClient();

export const PUT: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { params, request } = context;
    
    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID ist erforderlich' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const body = await request.json();
    
    // Tankfüllung aktualisieren
    const updatedTankfuellung = await prisma.tankfuellung.update({
      where: { id: parseInt(id) },
      data: {
        datum: new Date(body.datum + 'T12:00:00Z'),
        zaehlerstand: parseFloat(body.zaehlerstand),
        liter: parseFloat(body.liter),
        preisProLiter: parseFloat(body.preisProLiter),
        notizen: body.notizen || null,
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

    // Verbrauchsberechnung neu durchführen für den betroffenen Zähler
    const tankfuellungenGleicherZaehler = await prisma.tankfuellung.findMany({
      where: { zaehlerId: updatedTankfuellung.zaehlerId },
      orderBy: { datum: 'asc' },
    });

    if (tankfuellungenGleicherZaehler.length >= 2) {
      const neueste = tankfuellungenGleicherZaehler[tankfuellungenGleicherZaehler.length - 1];
      const vorherige = tankfuellungenGleicherZaehler[tankfuellungenGleicherZaehler.length - 2];
      
      const stundenDifferenz = neueste.zaehlerstand - vorherige.zaehlerstand;
      if (stundenDifferenz > 0) {
        const neuerVerbrauchProStunde = neueste.liter / stundenDifferenz;
        
        console.log(`🔥 VERBRAUCH NEU BERECHNET (Zähler ${updatedTankfuellung.zaehlerId}): ${neueste.liter}L ÷ ${stundenDifferenz}h = ${neuerVerbrauchProStunde.toFixed(3)} L/h`);
        
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

    return new Response(JSON.stringify(updatedTankfuellung), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Tankfüllung:', error);
    return new Response(JSON.stringify({ 
      error: 'Fehler beim Aktualisieren der Tankfüllung',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { params } = context;
    
    const id = params.id;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID ist erforderlich' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Tankfüllung löschen
    await prisma.tankfuellung.delete({
      where: {
        id: parseInt(id),
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Tankfüllung:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
