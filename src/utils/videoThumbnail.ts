import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  try {
    // ffmpeg: Extrahiere ein Frame als JPEG
    // -ss: Zeitoffset
    // -vframes 1: Nur ein Frame
    // -q:v 2: Gute Qualität (1-31, niedriger = besser)
    await execAsync(
      `ffmpeg -y -i "${videoPath}" -ss ${timeOffset} -vframes 1 -q:v 2 "${outputPath}"`
    );
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
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}
