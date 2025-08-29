import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../utils/auth';

const prisma = new PrismaClient();

export const POST: APIRoute = async (context) => {
  try {
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    const { request } = context;
    const body = await request.json();
    const { eigeneAufenthalte, jahr } = body;

    if (!eigeneAufenthalte || !Array.isArray(eigeneAufenthalte)) {
      return new Response(JSON.stringify({ error: 'Ungültige Anfrage' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Für jeden eigenen Aufenthalt die überlappenden Aufenthalte anderer Benutzer finden
    const relevanteAufenthalte = [];
    
    for (const eigenerAufenthalt of eigeneAufenthalte) {
      const zaehlerStart = eigenerAufenthalt.zaehlerAnkunft || 0;
      const zaehlerEnde = eigenerAufenthalt.zaehlerAbreise || 0;
      
      // Suche nach Aufenthalten anderer Benutzer, die überlappen
      const ueberlappendeAufenthalte = await prisma.aufenthalt.findMany({
        where: {
          userId: { not: user.id }, // Nicht der eigene Benutzer
          jahr: jahr ? parseInt(jahr) : undefined,
          // Überlappungs-Bedingung: zaehlerAbreise > eigenerStart UND zaehlerAnkunft < eigenerEnde
          AND: [
            { zaehlerAbreise: { gt: zaehlerStart } },
            { zaehlerAnkunft: { lt: zaehlerEnde } }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
      
      relevanteAufenthalte.push(...ueberlappendeAufenthalte);
    }

    // Duplikate entfernen (ein Aufenthalt kann mit mehreren eigenen überlappen)
    const uniqueRelevanteAufenthalte = relevanteAufenthalte.filter((aufenthalt, index, self) => 
      index === self.findIndex(a => a.id === aufenthalt.id)
    );

    return new Response(JSON.stringify(uniqueRelevanteAufenthalte), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden der Überlappungen:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Laden der Überlappungen' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
