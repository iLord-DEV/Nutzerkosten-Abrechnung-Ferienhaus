import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../utils/auth';

const prisma = new PrismaClient();

// Alle Zähler abrufen
export const GET: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    
    const zaehler = await prisma.zaehler.findMany({
      orderBy: {
        einbauDatum: 'desc',
      },
      include: {
        tankfuellungen: {
          orderBy: {
            datum: 'desc',
          },
          take: 5, // Nur die letzten 5 Tankfüllungen
        },
        _count: {
          select: {
            aufenthalte: true,
            tankfuellungen: true,
          },
        },
      },
    });

    return new Response(JSON.stringify(zaehler), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden der Zähler:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Laden der Daten' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

// Neuen Zähler erstellen
export const POST: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;

    const body = await request.json();
    
    // Prüfen ob bereits ein aktiver Zähler existiert
    const aktiverZaehler = await prisma.zaehler.findFirst({
      where: { istAktiv: true },
    });

    if (aktiverZaehler && !body.ersetzeAktiven) {
      return new Response(JSON.stringify({ 
        error: 'Es existiert bereits ein aktiver Zähler. Setzen Sie "ersetzeAktiven" auf true, um den aktuellen Zähler zu ersetzen.' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Wenn ein aktiver Zähler ersetzt wird, diesen deaktivieren
    if (aktiverZaehler && body.ersetzeAktiven) {
      const wechselDatum = new Date(body.einbauDatum + 'T12:00:00Z');
      
      await prisma.zaehler.update({
        where: { id: aktiverZaehler.id },
        data: {
          istAktiv: false,
          ausbauDatum: wechselDatum, // Ausbaudatum = Einbaudatum des neuen Zählers
          letzterStand: parseFloat(body.letzterStandAlterZaehler || '0'),
        },
      });

      // Alle laufenden Aufenthalte aktualisieren, die noch den alten Zähler verwenden
      await prisma.aufenthalt.updateMany({
        where: {
          zaehlerAbreiseId: aktiverZaehler.id, // Aufenthalte die noch den alten Zähler als Abreise-Zähler haben
          abreise: { gte: wechselDatum }, // Und die nach dem Wechseldatum enden
        },
        data: {
          zaehlerAbreiseId: null, // Temporär auf null setzen, wird beim Speichern des Aufenthalts korrigiert
        },
      });
    }

    // Neuen Zähler erstellen
    const neuerZaehler = await prisma.zaehler.create({
      data: {
        einbauDatum: new Date(body.einbauDatum + 'T12:00:00Z'),
        letzterStand: 0, // Neuer Zähler startet bei 0
        notizen: body.notizen || null,
        istAktiv: true,
      },
    });

    return new Response(JSON.stringify(neuerZaehler), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Zählers:', error);
    return new Response(JSON.stringify({ 
      error: 'Fehler beim Erstellen des Zählers',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
