// Kostenberechnungs-Utilities für Ölkosten nach Zählerstand

export interface Tankfuellung {
  id: number;
  zaehlerstand: number;
  liter: number;
  preisProLiter: number;
  datum: string | Date;
}

export interface KostenSegment {
  start: number;
  ende: number;
  stunden: number;
  preis: number;
  verbrauch: number;
}

/**
 * Berechnet die Ölkosten für einen Aufenthalt basierend auf Zählerständen
 * mit Segmentierung nach Tankfüllungen.
 *
 * Die Berechnung erfolgt in Segmenten:
 * - Jedes Segment hat einen eigenen Preis (von vorheriger Tankfüllung)
 * - Jedes Segment hat einen eigenen Verbrauch (berechnet aus Differenz zweier Tankfüllungen)
 * - Fallback-Werte: 1.01€/L Preis, 5.5L/h Verbrauch
 *
 * @param zaehlerStart - Zählerstand bei Ankunft
 * @param zaehlerEnde - Zählerstand bei Abreise
 * @param tankfuellungen - Alle Tankfüllungen (sortiert nach Zählerstand aufsteigend)
 * @returns Gesamtkosten in Euro
 */
export function berechneOelkostenNachZaehlerstand(
  zaehlerStart: number,
  zaehlerEnde: number,
  tankfuellungen: Tankfuellung[]
): number {
  if (zaehlerEnde <= zaehlerStart) {
    console.warn(`⚠️ Ungültige Zählerstände: Start=${zaehlerStart}, Ende=${zaehlerEnde}`);
    return 0;
  }

  const verbrauchteStunden = zaehlerEnde - zaehlerStart;

  // Tankfüllungen in der Spanne finden (Zählerstand > start UND <= ende)
  const tfInSpanne = tankfuellungen.filter(
    tf => tf.zaehlerstand > zaehlerStart && tf.zaehlerstand <= zaehlerEnde
  );

  // Segmente erstellen
  const segmente: KostenSegment[] = [];

  if (tfInSpanne.length === 0) {
    // Keine Tankfüllung in der Spanne - ein Segment
    const tfVorStart = tankfuellungen.filter(tf => tf.zaehlerstand <= zaehlerStart);
    const letzteVorStart = tfVorStart.length > 0 ? tfVorStart[tfVorStart.length - 1] : null;
    const vorletzteVorStart = tfVorStart.length > 1 ? tfVorStart[tfVorStart.length - 2] : null;

    const preis = letzteVorStart?.preisProLiter || 1.01;
    const verbrauch = (letzteVorStart && vorletzteVorStart)
      ? letzteVorStart.liter / (letzteVorStart.zaehlerstand - vorletzteVorStart.zaehlerstand)
      : 5.5;

    segmente.push({
      start: zaehlerStart,
      ende: zaehlerEnde,
      stunden: verbrauchteStunden,
      preis,
      verbrauch
    });
  } else {
    // Tankfüllungen in der Spanne - mehrere Segmente
    let aktuellerStart = zaehlerStart;

    for (let i = 0; i < tfInSpanne.length; i++) {
      const tf = tfInSpanne[i];

      // Segment bis zu dieser Tankfüllung
      const segmentEnde = tf.zaehlerstand;
      const stunden = segmentEnde - aktuellerStart;

      // Preis und Verbrauch für dieses Segment ermitteln
      const alleTfBisHier = tankfuellungen.filter(t => t.zaehlerstand <= aktuellerStart);
      const letzteVor = alleTfBisHier.length > 0 ? alleTfBisHier[alleTfBisHier.length - 1] : null;
      const vorletzteVor = alleTfBisHier.length > 1 ? alleTfBisHier[alleTfBisHier.length - 2] : null;

      const preis = letzteVor?.preisProLiter || 1.01;
      const verbrauch = (letzteVor && vorletzteVor)
        ? letzteVor.liter / (letzteVor.zaehlerstand - vorletzteVor.zaehlerstand)
        : 5.5;

      segmente.push({
        start: aktuellerStart,
        ende: segmentEnde,
        stunden,
        preis,
        verbrauch
      });

      aktuellerStart = segmentEnde;
    }

    // Letztes Segment: Von letzter TF bis zaehlerEnde
    if (aktuellerStart < zaehlerEnde) {
      const stunden = zaehlerEnde - aktuellerStart;
      const letzteTF = tfInSpanne[tfInSpanne.length - 1];

      // Verbrauch der letzten TF berechnen
      const alleTfBisLetzte = tankfuellungen.filter(t => t.zaehlerstand <= letzteTF.zaehlerstand);
      const vorletzte = alleTfBisLetzte.length > 1 ? alleTfBisLetzte[alleTfBisLetzte.length - 2] : null;

      const preis = letzteTF.preisProLiter;
      const verbrauch = vorletzte
        ? letzteTF.liter / (letzteTF.zaehlerstand - vorletzte.zaehlerstand)
        : 5.5;

      segmente.push({
        start: aktuellerStart,
        ende: zaehlerEnde,
        stunden,
        preis,
        verbrauch
      });
    }
  }

  // Kosten aller Segmente summieren
  const gesamtKosten = segmente.reduce((sum, seg) => {
    const kosten = seg.stunden * seg.verbrauch * seg.preis;
    // console.log(`💰 Segment ${seg.start}-${seg.ende}h: ${seg.stunden}h × ${seg.verbrauch.toFixed(2)}L/h × €${seg.preis.toFixed(2)} = €${kosten.toFixed(2)}`);
    return sum + kosten;
  }, 0);

  // Auf 2 Dezimalstellen runden, um Rundungsfehler bei Summenbildung zu vermeiden
  return Math.round(gesamtKosten * 100) / 100;
}
