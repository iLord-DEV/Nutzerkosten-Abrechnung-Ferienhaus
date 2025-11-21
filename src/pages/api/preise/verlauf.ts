import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../utils/auth';

const prisma = new PrismaClient();

/**
 * GET /api/preise/verlauf
 * Gibt Preis- und Verbrauchsdaten für Kostenberechnungen zurück
 * Alle authentifizierten User haben Zugriff
 */
export const GET: APIRoute = async (context) => {
  try {
    await requireAuth(context);

    const tankfuellungen = await prisma.tankfuellung.findMany({
      orderBy: {
        zaehlerstand: 'asc',
      },
      select: {
        zaehlerstand: true,
        liter: true,
        preisProLiter: true,
      },
    });

    // Nur notwendige Felder zurückgeben (inkl. liter für Kostenberechnung)
    const preisVerlauf = tankfuellungen.map((tf) => ({
      zaehlerstand: tf.zaehlerstand,
      liter: tf.liter,
      preisProLiter: tf.preisProLiter,
    }));

    return new Response(JSON.stringify(preisVerlauf), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden des Preisverlaufs:', error);
    return new Response(JSON.stringify({
      error: 'Fehler beim Laden des Preisverlaufs'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
