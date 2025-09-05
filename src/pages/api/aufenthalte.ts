import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async (context) => {
  try {
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    
    // URL-Parameter auslesen
    const { url } = context;
    const searchParams = url.searchParams;
    const jahr = searchParams.get('jahr');
    
    // Basis-Query
    let whereClause: any = {};
    
    // Jahr-Filter hinzufügen
    if (jahr) {
      whereClause.jahr = parseInt(jahr);
    }
    
    // Normale Benutzer sehen nur ihre eigenen Aufenthalte
    if (user.role !== 'ADMIN') {
      whereClause.userId = user.id;
    }

    const aufenthalte = await prisma.aufenthalt.findMany({
      where: whereClause,
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
        ankunft: 'desc',
      },
    });

    return new Response(JSON.stringify(aufenthalte), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden der Aufenthalte:', error);
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
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    const { request } = context;
    const body = await request.json();
    
    // Normale Benutzer können nur Aufenthalte für sich selbst erstellen
    if (user.role !== 'ADMIN') {
      body.userId = user.id;
    } else if (!body.userId) {
      // Für Admins: userId aus personName finden
      const targetUser = await prisma.user.findFirst({
        where: { name: body.personName }
      });
      if (targetUser) {
        body.userId = targetUser.id;
      } else {
        return new Response(JSON.stringify({ error: 'Benutzer nicht gefunden' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Aktiven Zähler für Ankunft finden
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

    // Datumsvalidierung
    const ankunftDate = new Date(body.ankunft);
    const abreiseDate = new Date(body.abreise);
    
    if (isNaN(ankunftDate.getTime()) || isNaN(abreiseDate.getTime())) {
      return new Response(JSON.stringify({ 
        error: 'Ungültige Datumsangaben. Bitte verwenden Sie das Format YYYY-MM-DD.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Zählerstand-Validierung
    const zaehlerStart = parseFloat(body.zaehlerStart);
    const zaehlerEnde = parseFloat(body.zaehlerEnde);
    
    if (isNaN(zaehlerStart) || isNaN(zaehlerEnde)) {
      return new Response(JSON.stringify({ 
        error: 'Ungültige Zählerstände. Bitte geben Sie gültige Zahlen ein.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Zählerstand-Kontinuität prüfen: Keine rückwärtslaufenden Zähler
    const eigeneAufenthalte = await prisma.aufenthalt.findMany({
      where: {
        userId: body.userId
      },
      orderBy: {
        zaehlerAbreise: 'desc'
      }
    });

    // Alle Aufenthalte für zeitliche Validierung
    const alleAufenthalte = await prisma.aufenthalt.findMany({
      orderBy: {
        zaehlerAbreise: 'desc'
      }
    });

    // Prüfe rückwärtslaufende Zähler: Finde eigene Aufenthalte, die nach dem neuen Startstand enden
    const problematischeAufenthalte = eigeneAufenthalte.filter(a => 
      a.zaehlerAbreise !== null && a.zaehlerAbreise > zaehlerStart
    );
    
    if (problematischeAufenthalte.length > 0) {
      const problematischerAufenthalt = problematischeAufenthalte[0];
      return new Response(JSON.stringify({
        error: `Zählerstand ${zaehlerStart} ist kleiner als der Endstand ${problematischerAufenthalt.zaehlerAbreise} vom ${problematischerAufenthalt.abreise.toISOString().split('T')[0]}. Zähler können nicht rückwärts laufen.`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prüfe zeitlich unmögliche Zählerstände: 
    // Wenn jemand zeitlich nach einem anderen kommt, darf sein Zählerstart nicht im Bereich des Vorherigen liegen
    const zeitlichVorherigeAufenthalte = alleAufenthalte.filter(a => {
      const aAbreise = new Date(a.abreise);
      return aAbreise < ankunftDate && a.zaehlerAbreise !== null && 
             zaehlerStart >= a.zaehlerAnkunft && zaehlerStart <= a.zaehlerAbreise;
    });
    
    if (zeitlichVorherigeAufenthalte.length > 0) {
      const problematischerAufenthalt = zeitlichVorherigeAufenthalte[0];
      return new Response(JSON.stringify({
        error: `Zählerstand ${zaehlerStart} liegt im Bereich des vorherigen Aufenthalts (${problematischerAufenthalt.zaehlerAnkunft}-${problematischerAufenthalt.zaehlerAbreise}) vom ${problematischerAufenthalt.abreise.toISOString().split('T')[0]}. Das ist zeitlich unmöglich.`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prüfe nachfolgende Aufenthalte
    const nachfolgenderAufenthalt = alleAufenthalte.find(a => 
      a.zaehlerAnkunft !== null && a.zaehlerAnkunft >= zaehlerEnde
    );

    if (nachfolgenderAufenthalt && zaehlerEnde > nachfolgenderAufenthalt.zaehlerAnkunft) {
      return new Response(JSON.stringify({
        error: `Zählerstand ${zaehlerEnde} ist größer als der nächste Startstand ${nachfolgenderAufenthalt.zaehlerAnkunft} vom ${nachfolgenderAufenthalt.ankunft.toISOString().split('T')[0]}. Zähler können nicht rückwärts laufen.`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Überlappungsprüfung: Nur für denselben Benutzer UND zeitliche Überschneidung
    const existingAufenthalte = await prisma.aufenthalt.findMany({
      where: {
        userId: body.userId,
        // Zeitliche Überschneidung prüfen
        AND: [
          { ankunft: { lt: abreiseDate } },
          { abreise: { gt: ankunftDate } }
        ]
      }
    });

    if (existingAufenthalte.length > 0) {
      const overlapping = existingAufenthalte[0];
      return new Response(JSON.stringify({
        error: `Sie haben bereits einen Aufenthalt in diesem Zeitraum (${overlapping.ankunft.toISOString().split('T')[0]} - ${overlapping.abreise.toISOString().split('T')[0]}). Bitte wählen Sie andere Daten.`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const aufenthalt = await prisma.aufenthalt.create({
      data: {
        userId: body.userId,
        ankunft: ankunftDate,
        abreise: abreiseDate,
        zaehlerAnkunft: zaehlerStart,
        zaehlerAbreise: zaehlerEnde,
        uebernachtungenMitglieder: parseInt(body.uebernachtungenMitglieder) || 0,
        uebernachtungenGaeste: parseInt(body.uebernachtungenGaeste) || 0,
        jahr: ankunftDate.getFullYear(),
        zaehlerId: aktiverZaehler.id, // Zähler bei Ankunft
        zaehlerAbreiseId: aktiverZaehler.id, // Zähler bei Abreise (kann später geändert werden)
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return new Response(JSON.stringify(aufenthalt), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Aufenthalts:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({ 
      error: 'Fehler beim Erstellen des Aufenthalts',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
