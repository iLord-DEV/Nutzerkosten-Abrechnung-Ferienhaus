import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../utils/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        beguenstigt: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return new Response(JSON.stringify(users), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden der Benutzer:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const POST: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;
    
    const body = await request.json();
    const { name, email, role, password } = body;

    if (!name || !email || !role || !password) {
      return new Response(JSON.stringify({ error: 'Alle Felder sind erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prüfen, ob E-Mail bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new Response(JSON.stringify({ error: 'E-Mail-Adresse bereits vergeben' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Benutzer erstellen
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        // Hier würde normalerweise das Passwort gehashed werden
        // Für den Moment speichern wir es als Plaintext (nicht empfohlen für Produktion)
      },
    });

    return new Response(JSON.stringify(user), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Benutzers:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;

    const body = await request.json();
    const { id, name, email, role, beguenstigt } = body;

    if (!id || !name || !email || !role) {
      return new Response(JSON.stringify({ error: 'Alle Felder sind erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Benutzer aktualisieren
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { name, email, role, beguenstigt: beguenstigt === true },
    });

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;
    
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Benutzer löschen
    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
