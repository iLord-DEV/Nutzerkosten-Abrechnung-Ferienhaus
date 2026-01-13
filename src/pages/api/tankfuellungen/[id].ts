import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../utils/auth';
import { validateCsrf, CsrfError, csrfErrorResponse } from '../../../utils/csrf';

const prisma = new PrismaClient();

export const PUT: APIRoute = async (context) => {
  try {
    console.log('🔍 PUT /api/tankfuellungen/[id] - Start');

    // CSRF-Validierung
    await validateCsrf(context);
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { params, request } = context;

    const id = params.id;
    console.log('📋 Tankfüllung ID:', id);

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID ist erforderlich' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const body = await request.json();
    console.log('📦 Request Body:', body);

    // Tankfüllung aktualisieren
    console.log('💾 Aktualisiere Tankfüllung...');
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
    console.log('✅ Tankfüllung aktualisiert:', updatedTankfuellung);

    // Verbrauchsberechnung neu durchführen für den betroffenen Zähler
    console.log('🔢 Starte Verbrauchsberechnung für Zähler:', updatedTankfuellung.zaehlerId);
    const tankfuellungenGleicherZaehler = await prisma.tankfuellung.findMany({
      where: { zaehlerId: updatedTankfuellung.zaehlerId },
      orderBy: { datum: 'asc' },
    });
    console.log('📊 Anzahl Tankfüllungen für diesen Zähler:', tankfuellungenGleicherZaehler.length);

    if (tankfuellungenGleicherZaehler.length >= 2) {
      const neueste = tankfuellungenGleicherZaehler[tankfuellungenGleicherZaehler.length - 1];
      const vorherige = tankfuellungenGleicherZaehler[tankfuellungenGleicherZaehler.length - 2];

      console.log('📈 Neueste Tankfüllung:', { liter: neueste.liter, zaehlerstand: neueste.zaehlerstand });
      console.log('📉 Vorherige Tankfüllung:', { liter: vorherige.liter, zaehlerstand: vorherige.zaehlerstand });

      const stundenDifferenz = neueste.zaehlerstand - vorherige.zaehlerstand;
      console.log('⏱️ Stundendifferenz:', stundenDifferenz);

      if (stundenDifferenz > 0) {
        const neuerVerbrauchProStunde = neueste.liter / stundenDifferenz;

        console.log(`🔥 VERBRAUCH NEU BERECHNET (Zähler ${updatedTankfuellung.zaehlerId}): ${neueste.liter}L ÷ ${stundenDifferenz}h = ${neuerVerbrauchProStunde.toFixed(3)} L/h`);

        // Aktualisiere alle Jahre ab dem Jahr der 2. Tankfüllung
        const startJahr = new Date(neueste.datum).getFullYear();
        const currentYear = new Date().getFullYear();

        console.log(`📅 Aktualisiere Preise von ${startJahr} bis ${currentYear}`);

        for (let year = startJahr; year <= currentYear; year++) {
          console.log(`💰 Upsert Preise für Jahr ${year}...`);
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
        console.log('✅ Preise aktualisiert');
      }
    }

    return new Response(JSON.stringify(updatedTankfuellung), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }
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
    // CSRF-Validierung
    await validateCsrf(context);
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
    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }
    console.error('Fehler beim Löschen der Tankfüllung:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
