import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ url }) => {
  try {
    const jahr = url.searchParams.get('jahr');
    
    if (!jahr) {
      return new Response(JSON.stringify({ error: 'Jahr ist erforderlich' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const preise = await prisma.preise.findFirst({
      where: {
        jahr: parseInt(jahr),
      },
    });

    if (!preise) {
      // Fallback-Preise wenn keine in der DB
      return new Response(JSON.stringify({
        oelpreisProLiter: 1.25,
        uebernachtungMitglied: 15,
        uebernachtungGast: 25,
        verbrauchProStunde: 5.5,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify(preise), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden der Preise:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
