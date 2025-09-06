import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../utils/auth';

const prisma = new PrismaClient();

// GET: Alle Übernachtungspreise abrufen
export const GET: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;
    
    const url = new URL(request.url);
    const datum = url.searchParams.get('datum');

    if (datum) {
      // Hole den gültigen Preis für ein bestimmtes Datum
      const preis = await prisma.uebernachtungspreise.findFirst({
        where: {
          gueltigAb: {
            lte: new Date(datum)
          }
        },
        orderBy: {
          gueltigAb: 'desc'
        }
      });

      if (!preis) {
        // Fallback-Preise wenn keine konfiguriert sind
        return new Response(JSON.stringify({
          uebernachtungMitglied: 5,
          uebernachtungGast: 10
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(preis), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hole alle Übernachtungspreise
    const preise = await prisma.uebernachtungspreise.findMany({
      orderBy: {
        gueltigAb: 'desc'
      }
    });

    return new Response(JSON.stringify(preise), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Übernachtungspreise:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Abrufen der Übernachtungspreise' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Neuen Übernachtungspreis erstellen
export const POST: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;
    
    const body = await request.json();
    const { gueltigAb, uebernachtungMitglied, uebernachtungGast } = body;

    if (!gueltigAb || uebernachtungMitglied === undefined || uebernachtungGast === undefined) {
      return new Response(JSON.stringify({ error: 'Alle Felder sind erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const neuerPreis = await prisma.uebernachtungspreise.create({
      data: {
        gueltigAb: new Date(gueltigAb),
        uebernachtungMitglied,
        uebernachtungGast
      }
    });

    return new Response(JSON.stringify(neuerPreis), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Übernachtungspreises:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Erstellen des Übernachtungspreises' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT: Übernachtungspreis aktualisieren
export const PUT: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;
    
    const body = await request.json();
    const { id, gueltigAb, uebernachtungMitglied, uebernachtungGast } = body;

    if (!id || !gueltigAb || uebernachtungMitglied === undefined || uebernachtungGast === undefined) {
      return new Response(JSON.stringify({ error: 'Alle Felder sind erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const aktualisierterPreis = await prisma.uebernachtungspreise.update({
      where: { id: parseInt(id) },
      data: {
        gueltigAb: new Date(gueltigAb),
        uebernachtungMitglied,
        uebernachtungGast
      }
    });

    return new Response(JSON.stringify(aktualisierterPreis), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Übernachtungspreises:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Aktualisieren des Übernachtungspreises' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Übernachtungspreis löschen
export const DELETE: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;
    
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Preis-ID ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prüfe ob der Preis existiert
    const preis = await prisma.uebernachtungspreise.findUnique({
      where: { id: parseInt(id) }
    });

    if (!preis) {
      return new Response(JSON.stringify({ error: 'Übernachtungspreis nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await prisma.uebernachtungspreise.delete({
      where: { id: parseInt(id) }
    });

    return new Response(JSON.stringify({ message: 'Übernachtungspreis erfolgreich gelöscht' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Übernachtungspreises:', error);
    
    if (error.code === 'P2025') {
      return new Response(JSON.stringify({ error: 'Übernachtungspreis nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Fehler beim Löschen des Übernachtungspreises' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
