import QRCode from 'qrcode';

/**
 * GiroCode / EPC QR Code Generator
 * Generiert einen QR-Code nach dem European Payment Council Standard
 * für SEPA-Überweisungen, der von deutschen Banking-Apps gescannt werden kann.
 */

export interface GiroCodeData {
  /** IBAN des Empfängers */
  iban: string;
  /** BIC des Empfängers (optional bei SEPA, aber empfohlen) */
  bic: string;
  /** Name des Empfängers (max. 70 Zeichen) */
  name: string;
  /** Betrag in Euro */
  amount: number;
  /** Verwendungszweck / Referenz (max. 140 Zeichen) */
  reference: string;
}

/**
 * Generiert einen GiroCode-String nach EPC QR Code Standard
 * Format: Zeilenweise durch \n getrennt
 *
 * Specification: https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
 */
export function generateGiroCodeString(data: GiroCodeData): string {
  // Betrag formatieren: EUR + 2 Dezimalstellen
  const formattedAmount = `EUR${data.amount.toFixed(2)}`;

  // IBAN normalisieren (Leerzeichen entfernen)
  const cleanIban = data.iban.replace(/\s/g, '');

  // BIC normalisieren
  const cleanBic = data.bic.replace(/\s/g, '');

  // Name auf max. 70 Zeichen kürzen
  const truncatedName = data.name.substring(0, 70);

  // Referenz auf max. 140 Zeichen kürzen
  const truncatedReference = data.reference.substring(0, 140);

  // GiroCode String aufbauen (Zeilen durch \n getrennt)
  const lines = [
    'BCD',                    // Service Tag (immer "BCD")
    '002',                    // Version (001 oder 002)
    '1',                      // Character Set (1 = UTF-8)
    'SCT',                    // Identification (SCT = SEPA Credit Transfer)
    cleanBic,                 // BIC des Empfängers
    truncatedName,            // Name des Empfängers
    cleanIban,                // IBAN des Empfängers
    formattedAmount,          // Betrag mit EUR-Präfix
    '',                       // Purpose Code (optional, leer lassen)
    truncatedReference,       // Remittance Reference (Verwendungszweck)
    ''                        // Remittance Information (optional, leer lassen)
  ];

  return lines.join('\n');
}

/**
 * Generiert einen QR-Code als Data URL (PNG Base64)
 * Kann direkt in einem <img src="..."> Tag verwendet werden
 */
export async function generateGiroCodeQR(data: GiroCodeData): Promise<string> {
  const giroCodeString = generateGiroCodeString(data);

  try {
    const dataURL = await QRCode.toDataURL(giroCodeString, {
      errorCorrectionLevel: 'M',  // Medium error correction (15% recovery)
      type: 'image/png',           // PNG format
      width: 300,                  // 300x300 pixels (optimal für Banking-Apps)
      margin: 2,                   // 2 module margin (Standard)
      color: {
        dark: '#000000',           // Schwarze QR-Code-Punkte
        light: '#FFFFFF'           // Weißer Hintergrund
      }
    });

    return dataURL;
  } catch (error) {
    console.error('Fehler beim Generieren des QR-Codes:', error);
    throw new Error('QR-Code konnte nicht generiert werden');
  }
}

/**
 * Validiert die GiroCode-Daten
 * Gibt true zurück wenn alle Daten valide sind
 */
export function validateGiroCodeData(data: GiroCodeData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // IBAN prüfen (vereinfachte Prüfung)
  const cleanIban = data.iban.replace(/\s/g, '');
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleanIban)) {
    errors.push('IBAN hat ungültiges Format');
  }
  if (cleanIban.length < 15 || cleanIban.length > 34) {
    errors.push('IBAN hat ungültige Länge');
  }

  // BIC prüfen (vereinfachte Prüfung)
  const cleanBic = data.bic.replace(/\s/g, '');
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanBic)) {
    errors.push('BIC hat ungültiges Format');
  }

  // Betrag prüfen
  if (data.amount <= 0) {
    errors.push('Betrag muss größer als 0 sein');
  }
  if (data.amount > 999999999.99) {
    errors.push('Betrag ist zu hoch (max. 999.999.999,99 EUR)');
  }

  // Name prüfen
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Empfängername fehlt');
  }

  // Referenz prüfen
  if (!data.reference || data.reference.trim().length === 0) {
    errors.push('Verwendungszweck fehlt');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
