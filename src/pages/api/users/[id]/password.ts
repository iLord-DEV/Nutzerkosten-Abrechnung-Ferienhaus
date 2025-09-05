import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { requireAuth, requireAdmin } from '../../../../utils/auth';
import { validatePassword } from '../../../../utils/passwordValidation';

const prisma = new PrismaClient();

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const userId = parseInt(params.id as string);
    const { newPassword, currentPassword } = await request.json();

    // Starke Passwort-Validierung
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return new Response(JSON.stringify({ 
        error: 'Passwort-Anforderungen nicht erfüllt',
        details: passwordValidation.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aktuellen Benutzer abrufen
    const currentUser = await requireAuth({ cookies } as any);
    
    // Prüfen ob der Benutzer existiert
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'Benutzer nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Berechtigung prüfen
    const isAdmin = currentUser.role === 'ADMIN';
    const isOwnAccount = currentUser.id === userId;

    if (!isAdmin && !isOwnAccount) {
      return new Response(JSON.stringify({ 
        error: 'Keine Berechtigung, dieses Passwort zu ändern' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Für normale Benutzer: aktuelles Passwort prüfen
    if (!isAdmin && isOwnAccount) {
      if (!currentPassword) {
        return new Response(JSON.stringify({ 
          error: 'Aktuelles Passwort ist erforderlich' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Aktuelles Passwort validieren
      const userWithPassword = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });

      if (!userWithPassword) {
        return new Response(JSON.stringify({ error: 'Benutzer nicht gefunden' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password);
      if (!isCurrentPasswordValid) {
        return new Response(JSON.stringify({ 
          error: 'Aktuelles Passwort ist falsch' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Neues Passwort hashen und speichern
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Passwort erfolgreich geändert' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fehler beim Ändern des Passworts:', error);
    return new Response(JSON.stringify({ 
      error: 'Interner Server-Fehler' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
