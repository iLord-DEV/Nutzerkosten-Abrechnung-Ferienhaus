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

    // Alle Aufenthalte laden - die Überlappungslogik erfolgt im Frontend
    // Nur gültige Aufenthalte: mit existierenden Usern und korrekten Zählerständen
    const alleAufenthalteRaw = await prisma.aufenthalt.findMany({
      where: {
        // Alle Aufenthalte für das Jahr (falls jahr angegeben)
        ...(jahr && { jahr: parseInt(jahr) })
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
      orderBy: {
        ankunft: 'desc'
      }
    });

    // Filtere fehlerhafte Aufenthalte heraus:
    // 1. Aufenthalte ohne User (sollte durch FK verhindert sein, aber sicher ist sicher)
    // 2. Aufenthalte mit vertauschten/fehlerhaften Zählerständen
    const alleAufenthalte = alleAufenthalteRaw.filter(aufenthalt => {
      // User muss existieren
      if (!aufenthalt.user) {
        console.warn(`⚠️ Aufenthalt ${aufenthalt.id} hat keinen User - wird ausgeschlossen`);
        return false;
      }

      // Zählerstände müssen valide sein (Abreise > Ankunft)
      if (aufenthalt.zaehlerAbreise <= aufenthalt.zaehlerAnkunft) {
        console.warn(`⚠️ Aufenthalt ${aufenthalt.id} (${aufenthalt.user.name}) hat fehlerhafte Zählerstände: ${aufenthalt.zaehlerAnkunft} → ${aufenthalt.zaehlerAbreise} - wird ausgeschlossen`);
        return false;
      }

      return true;
    });

    console.log(`📊 Aufenthalte geladen: ${alleAufenthalteRaw.length} total, ${alleAufenthalte.length} gültig, ${alleAufenthalteRaw.length - alleAufenthalte.length} fehlerhaft`);

    return new Response(JSON.stringify(alleAufenthalte), {
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
