import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Generiert ein Thumbnail-Bild aus einem Video mit ffmpeg
 * @param videoPath - Pfad zur Video-Datei
 * @param outputPath - Pfad für das Thumbnail-Bild (z.B. thumb-xxx.jpg)
 * @param timeOffset - Zeit in Sekunden, ab der das Frame extrahiert wird (Standard: 0)
 */
export async function generateVideoThumbnail(
  videoPath: string,
  outputPath: string,
  timeOffset: number = 0
): Promise<void> {
  // Validate timeOffset to ensure it's a non-negative number
  const safeTimeOffset = Math.max(0, Math.floor(timeOffset));

  try {
    // Use execFile instead of exec to prevent command injection
    // Arguments are passed as array, no shell parsing
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', videoPath,
      '-ss', safeTimeOffset.toString(),
      '-vframes', '1',
      '-q:v', '2',
      outputPath
    ]);
  } catch (error) {
    console.error('Fehler bei Thumbnail-Generierung:', error);
    throw new Error('Thumbnail konnte nicht erstellt werden. Ist ffmpeg installiert?');
  }
}

/**
 * Prüft ob ffmpeg verfügbar ist
 */
export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}
