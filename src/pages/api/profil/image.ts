import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../utils/auth';
import { validateCsrf, CsrfError, csrfErrorResponse } from '../../../utils/csrf';

const prisma = new PrismaClient();
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// In Production: dist/client, in Development: public
const IS_PROD = import.meta.env.PROD;
const UPLOAD_DIR = IS_PROD ? 'dist/client/uploads/profiles' : 'public/uploads/profiles';
const PUBLIC_PATH = '/uploads/profiles';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];

export const POST: APIRoute = async (context) => {
  try {
    await validateCsrf(context);
    const user = await requireAuth(context);

    // FormData parsen
    const formData = await context.request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Kein Bild hochgeladen' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Dateityp prüfen
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Ungültiger Dateityp. Erlaubt: JPEG, PNG, GIF, WebP, AVIF' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Dateigröße prüfen
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Datei zu groß. Maximum: 5 MB' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upload-Verzeichnis erstellen falls nicht vorhanden
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Altes Profilbild löschen falls vorhanden
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profileImage: true }
    });

    if (currentUser?.profileImage) {
      const baseDir = IS_PROD ? 'dist/client' : 'public';
      const oldFilePath = path.join(baseDir, currentUser.profileImage);
      if (existsSync(oldFilePath)) {
        try {
          await unlink(oldFilePath);
        } catch {
          // Ignorieren wenn Datei nicht gelöscht werden kann
        }
      }
    }

    // Eindeutigen Dateinamen generieren
    const ext = path.extname(file.name) || `.${file.type.split('/')[1]}`;
    const filename = `profile-${user.id}-${Date.now()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const publicUrl = `${PUBLIC_PATH}/${filename}`;

    // Datei speichern
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Datenbank aktualisieren
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { profileImage: publicUrl },
      select: {
        id: true,
        name: true,
        profileImage: true,
      }
    });

    return new Response(JSON.stringify(updatedUser), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fehler beim Hochladen des Profilbilds:', error);

    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }

    if (error instanceof Error && error.name === 'AuthenticationError') {
      return new Response(
        JSON.stringify({ error: 'Nicht authentifiziert' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    await validateCsrf(context);
    const user = await requireAuth(context);

    // Aktuelles Profilbild holen
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profileImage: true }
    });

    // Datei löschen falls vorhanden
    if (currentUser?.profileImage) {
      const baseDir = IS_PROD ? 'dist/client' : 'public';
      const filePath = path.join(baseDir, currentUser.profileImage);
      if (existsSync(filePath)) {
        try {
          await unlink(filePath);
        } catch {
          // Ignorieren wenn Datei nicht gelöscht werden kann
        }
      }
    }

    // Datenbank aktualisieren
    await prisma.user.update({
      where: { id: user.id },
      data: { profileImage: null }
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fehler beim Löschen des Profilbilds:', error);

    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }

    if (error instanceof Error && error.name === 'AuthenticationError') {
      return new Response(
        JSON.stringify({ error: 'Nicht authentifiziert' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
