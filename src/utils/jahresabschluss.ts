/**
 * Hilfsfunktionen für Jahresabschluss-Logik
 *
 * Business-Regel: Ab 1. Februar des Folgejahres ist das Vorjahr "abgeschlossen"
 * und normale User können keine Aufenthalte mehr bearbeiten/löschen.
 */

/**
 * Prüft, ob ein Jahr für normale User abgeschlossen ist
 *
 * @param jahr - Das zu prüfende Jahr (z.B. 2024)
 * @returns true wenn das Jahr abgeschlossen ist (nicht mehr editierbar für normale User)
 *
 * @example
 * // Heute ist 15.01.2025
 * isJahrAbgeschlossen(2024) // false - noch bis 31.01.2025 editierbar
 *
 * // Heute ist 01.02.2025
 * isJahrAbgeschlossen(2024) // true - ab jetzt abgeschlossen
 * isJahrAbgeschlossen(2025) // false - aktuelles Jahr ist immer editierbar
 */
export function isJahrAbgeschlossen(jahr: number): boolean {
  const heute = new Date();
  const aktuellesJahr = heute.getFullYear();
  const aktuellerMonat = heute.getMonth() + 1; // getMonth() ist 0-basiert

  // Jahr in der Zukunft ist nie abgeschlossen
  if (jahr > aktuellesJahr) {
    return false;
  }

  // Aktuelles Jahr ist nie abgeschlossen
  if (jahr === aktuellesJahr) {
    return false;
  }

  // Vorjahr ist ab 1. Februar abgeschlossen
  if (jahr === aktuellesJahr - 1) {
    return aktuellerMonat >= 2; // Ab Februar (Monat 2) ist geschlossen
  }

  // Alle älteren Jahre sind immer abgeschlossen
  return true;
}

/**
 * Prüft, ob ein User einen Aufenthalt bearbeiten/löschen darf
 *
 * @param jahr - Das Jahr des Aufenthalts
 * @param isAdmin - Ist der User ein Admin?
 * @returns true wenn der User den Aufenthalt bearbeiten darf
 *
 * @example
 * canEditJahr(2024, false) // false (wenn Jahr abgeschlossen)
 * canEditJahr(2024, true)  // true (Admin darf immer)
 */
export function canEditJahr(jahr: number, isAdmin: boolean): boolean {
  // Admins dürfen immer bearbeiten
  if (isAdmin) {
    return true;
  }

  // Normale User nur wenn Jahr nicht abgeschlossen
  return !isJahrAbgeschlossen(jahr);
}

/**
 * Gibt einen formatierten Jahr-String zurück mit ✓ für abgeschlossene Jahre
 *
 * @param jahr - Das Jahr
 * @returns Jahr als String, z.B. "2024 ✓" oder "2025"
 *
 * @example
 * formatJahrMitStatus(2024) // "2024 ✓" (wenn abgeschlossen)
 * formatJahrMitStatus(2025) // "2025"
 */
export function formatJahrMitStatus(jahr: number): string {
  if (isJahrAbgeschlossen(jahr)) {
    return `${jahr} ✓`;
  }
  return jahr.toString();
}
