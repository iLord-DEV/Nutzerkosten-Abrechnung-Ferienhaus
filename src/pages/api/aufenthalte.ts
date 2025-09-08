import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth';
import { validateAufenthaltData, type AufenthaltData } from '../../utils/aufenthaltValidation';

const prisma = new PrismaClient();

export const GET: APIRoute = async (context) => {
  try {
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    
    // URL-Parameter auslesen
    const { url } = context;
    const searchParams = url.searchParams;
    const jahr = searchParams.get('jahr');
    const userId = searchParams.get('userId');
    
    // Basis-Query
    let whereClause: any = {};
    
    // Jahr-Filter hinzufügen
    if (jahr) {
      whereClause.jahr = parseInt(jahr);
    }
    
    // Benutzer-Filter (nur für Admins)
    if (user.role === 'ADMIN' && userId) {
      whereClause.userId = parseInt(userId);
    } else if (user.role !== 'ADMIN') {
      // Normale Benutzer sehen nur ihre eigenen Aufenthalte
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

    // Zählerstände validieren bevor Konvertierung
    const zaehlerStartRaw = parseFloat(body.zaehlerStart);
    const zaehlerEndeRaw = parseFloat(body.zaehlerEnde);
    
    // Prüfe ob Dezimalzahlen eingegeben wurden
    if (zaehlerStartRaw % 1 !== 0 || zaehlerEndeRaw % 1 !== 0) {
      return new Response(JSON.stringify({
        error: 'Zählerstände müssen ganze Zahlen sein (z.B. 1350, nicht 1350.5).'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validierung mit neuer Validierungslogik
    const aufenthaltData: AufenthaltData = {
      userId: body.userId,
      ankunft: body.ankunft,
      abreise: body.abreise,
      zaehlerStart: parseInt(body.zaehlerStart),
      zaehlerEnde: parseInt(body.zaehlerEnde),
      uebernachtungenMitglieder: parseInt(body.uebernachtungenMitglieder),
      uebernachtungenGaeste: parseInt(body.uebernachtungenGaeste)
    };

    const validationErrors = await validateAufenthaltData(aufenthaltData);
    
    if (validationErrors.length > 0) {
      const firstError = validationErrors[0];
      return new Response(JSON.stringify({
        error: firstError.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Zählerstand-Variablen für nachfolgende Verwendung
    const zaehlerStart = aufenthaltData.zaehlerStart;
    const zaehlerEnde = aufenthaltData.zaehlerEnde;

    // Alle Validierungen wurden bereits in validateAufenthaltData durchgeführt

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
