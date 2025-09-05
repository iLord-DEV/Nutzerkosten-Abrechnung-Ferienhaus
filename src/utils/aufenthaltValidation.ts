import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AufenthaltData {
  userId: number;
  ankunft: string;
  abreise: string;
  zaehlerStart: number;
  zaehlerEnde: number;
  uebernachtungenMitglieder: number;
  uebernachtungenGaeste: number;
}

export interface ValidationError {
  field?: string;
  message: string;
}

// Grundlegende Validierung
export function validateBasicData(data: AufenthaltData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Zählerstand-Validierung
  if (isNaN(data.zaehlerStart) || isNaN(data.zaehlerEnde)) {
    errors.push({
      field: 'zaehlerStart',
      message: 'Ungültige Zählerstände. Bitte geben Sie gültige Zahlen ein.'
    });
  }

  // Zählerstände müssen ganze Zahlen sein
  if (!Number.isInteger(data.zaehlerStart) || !Number.isInteger(data.zaehlerEnde)) {
    errors.push({
      field: 'zaehlerStart',
      message: 'Zählerstände müssen ganze Zahlen sein (z.B. 1350, nicht 1350.5).'
    });
  }

  // Zählerstände dürfen nicht negativ sein
  if (data.zaehlerStart < 0 || data.zaehlerEnde < 0) {
    errors.push({
      field: 'zaehlerStart',
      message: 'Zählerstände können nicht negativ sein.'
    });
  }

  if (data.zaehlerEnde <= data.zaehlerStart) {
    errors.push({
      field: 'zaehlerEnde',
      message: 'Endzählerstand muss größer als Ankunftszählerstand sein.'
    });
  }

  // Datum-Validierung
  const ankunftDate = new Date(data.ankunft + 'T00:00:00');
  const abreiseDate = new Date(data.abreise + 'T00:00:00');

  if (abreiseDate <= ankunftDate) {
    errors.push({
      field: 'abreise',
      message: 'Das Abreisedatum muss nach dem Ankunftsdatum liegen.'
    });
  }

  // Zukunfts-Datum-Validierung
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  if (ankunftDate > heute) {
    errors.push({
      field: 'ankunft',
      message: 'Ankunft kann nicht in der Zukunft liegen. Bitte wählen Sie ein Datum von heute oder früher.'
    });
  }

  // Übernachtungs-Validierung
  if (data.uebernachtungenMitglieder < 1) {
    errors.push({
      field: 'uebernachtungenMitglieder',
      message: 'Es muss mindestens eine Übernachtung für Mitglieder angegeben werden.'
    });
  }

  const anzahlNaechte = Math.ceil((abreiseDate.getTime() - ankunftDate.getTime()) / (1000 * 60 * 60 * 24));
  if (data.uebernachtungenMitglieder < anzahlNaechte) {
    errors.push({
      field: 'uebernachtungenMitglieder',
      message: `Die Übernachtungen für Mitglieder (${data.uebernachtungenMitglieder}) können nicht weniger als die Anzahl der Nächte (${anzahlNaechte}) betragen, da immer mindestens ein Mitglied anwesend sein muss.`
    });
  }

  return errors;
}

// Zählerstand-Kontinuität prüfen
export async function validateZaehlerKontinuitaet(data: AufenthaltData, excludeId?: number): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  const eigeneAufenthalte = await prisma.aufenthalt.findMany({
    where: {
      userId: data.userId,
      ...(excludeId && { id: { not: excludeId } })
    },
    orderBy: {
      zaehlerAbreise: 'desc'
    }
  });

  // Prüfe rückwärtslaufende Zähler
  const problematischeAufenthalte = eigeneAufenthalte.filter(a =>
    a.zaehlerAbreise !== null && a.zaehlerAbreise > data.zaehlerStart
  );

  if (problematischeAufenthalte.length > 0) {
    const problematischerAufenthalt = problematischeAufenthalte[0];
    errors.push({
      field: 'zaehlerStart',
      message: `Zählerstand ${data.zaehlerStart} ist kleiner als der Endstand ${problematischerAufenthalt.zaehlerAbreise} vom ${problematischerAufenthalt.abreise.toISOString().split('T')[0]}. Zähler können nicht rückwärts laufen. Bitte wählen Sie einen Zählerstand größer als ${problematischerAufenthalt.zaehlerAbreise}.`
    });
  }

  return errors;
}

// Zeitliche Konsistenz prüfen
export async function validateZeitlicheKonsistenz(data: AufenthaltData, excludeId?: number): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  const alleAufenthalte = await prisma.aufenthalt.findMany({
    where: {
      ...(excludeId && { id: { not: excludeId } })
    },
    orderBy: {
      zaehlerAbreise: 'desc'
    }
  });

  const ankunftDate = new Date(data.ankunft + 'T00:00:00');

  // Prüfe zeitlich unmögliche Zählerstände
  const zeitlichVorherigeAufenthalte = alleAufenthalte.filter(a => {
    const aAbreise = new Date(a.abreise);
    return aAbreise < ankunftDate && a.zaehlerAbreise !== null &&
           data.zaehlerStart >= a.zaehlerAnkunft && data.zaehlerStart <= a.zaehlerAbreise;
  });

  if (zeitlichVorherigeAufenthalte.length > 0) {
    const problematischerAufenthalt = zeitlichVorherigeAufenthalte[0];
    errors.push({
      field: 'zaehlerStart',
      message: `Zählerstand ${data.zaehlerStart} liegt im Bereich des vorherigen Aufenthalts (${problematischerAufenthalt.zaehlerAnkunft}-${problematischerAufenthalt.zaehlerAbreise}) vom ${problematischerAufenthalt.abreise.toISOString().split('T')[0]}. Das ist zeitlich unmöglich. Bitte wählen Sie einen Zählerstand außerhalb des Bereichs ${problematischerAufenthalt.zaehlerAnkunft}-${problematischerAufenthalt.zaehlerAbreise}.`
    });
  }

  return errors;
}

// Hauptvalidierungsfunktion
export async function validateAufenthaltData(data: AufenthaltData, excludeId?: number): Promise<ValidationError[]> {
  // Grundlegende Validierung (synchron)
  const basicErrors = validateBasicData(data);
  
  // Komplexe Validierungen (asynchron, parallel)
  const [kontinuitaetErrors, konsistenzErrors] = await Promise.all([
    validateZaehlerKontinuitaet(data, excludeId),
    validateZeitlicheKonsistenz(data, excludeId)
  ]);

  return [...basicErrors, ...kontinuitaetErrors, ...konsistenzErrors];
}
