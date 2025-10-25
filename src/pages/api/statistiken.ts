import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth';

const prisma = new PrismaClient();

// Hilfsfunktion: Verbrauch zwischen zwei Zählerständen berechnen
function calculateConsumptionBetweenReadings(startReading: number, endReading: number, zaehlerId: number, zaehlerAbreiseId: number | null, verbrauchProStunde: number = 5.5): number {
  const brennerstunden = endReading - startReading;
  if (zaehlerId !== zaehlerAbreiseId) {
    // Zählerwechsel - vereinfachte Berechnung
    // In der Praxis sollte hier der letzte Stand des alten Zählers ermittelt werden
    return brennerstunden * verbrauchProStunde;
  }
  return brennerstunden * verbrauchProStunde;
}

// Hilfsfunktion: Alle Abwesenheitsverbräuche berechnen (alle Nutzer)
async function calculateAllAbsenceConsumption(jahr: number, tankfuellungen: any[], preise: any, prismaClient: PrismaClient) {
  // Alle Aufenthalte aller Nutzer für das Jahr laden
  const allAufenthalte = await prismaClient.aufenthalt.findMany({
    where: { jahr: jahr },
    include: {
      user: { select: { name: true } }
    },
    orderBy: { ankunft: 'asc' }
  });
  
  const absenceConsumption = [];
  let gesamtAbwesenheitsKosten = 0;
  let gesamtAbwesenheitsLiter = 0;
  
  // Alle Aufenthalte nach Ankunft-Datum sortieren (für korrekte Abwesenheitsberechnung)
  const sortedAufenthalte = allAufenthalte.sort((a, b) => new Date(a.ankunft).getTime() - new Date(b.ankunft).getTime());
  
  // Abwesenheitsperioden zwischen allen Aufenthalten finden
  for (let i = 0; i < sortedAufenthalte.length; i++) {
    const currentAufenthalt = sortedAufenthalte[i];
    
    // Suche den nächsten Aufenthalt nach der aktuellen Abreise
    const currentEnd = new Date(currentAufenthalt.abreise);
    const nextAufenthalt = sortedAufenthalte.find(aufenthalt => 
      new Date(aufenthalt.ankunft) > currentEnd
    );
    
    if (!nextAufenthalt) continue; // Kein nächster Aufenthalt gefunden
    
    const nextStart = new Date(nextAufenthalt.ankunft);
    
    // Debug: Log für die Berechnung
    console.log(`🔍 Abwesenheit: ${currentAufenthalt.abreise} → ${nextAufenthalt.ankunft}`);
    
    // Prüfen ob es eine Lücke zwischen den Aufenthalten gibt
    // Datum auf Mitternacht setzen für korrekte Tagesberechnung
    const currentEndMidnight = new Date(currentEnd);
    currentEndMidnight.setHours(0, 0, 0, 0);
    const nextStartMidnight = new Date(nextStart);
    nextStartMidnight.setHours(0, 0, 0, 0);
    
    // Anzahl der Abwesenheitstage berechnen (Tage zwischen Abreise und Ankunft)
    const tageZwischen = Math.floor((nextStartMidnight.getTime() - currentEndMidnight.getTime()) / (1000 * 60 * 60 * 24));
    
    if (tageZwischen > 0) {
      // Abwesenheitsverbrauch basierend auf Zählerständen berechnen
      const abwesenheitsStunden = nextAufenthalt.zaehlerAnkunft - currentAufenthalt.zaehlerAbreise;
      const verbrauchProStunde = preise?.verbrauchProStunde || 5.5;
      const abwesenheitsLiter = abwesenheitsStunden * verbrauchProStunde;
      
      // Nur Abwesenheitsperioden mit Verbrauch > 0 anzeigen
      if (abwesenheitsLiter > 0) {
        const preisProLiter = preise?.oelpreisProLiter || 1.01;
        const totalCost = abwesenheitsLiter * preisProLiter;
      
      // Monat der Abwesenheit für Gruppierung
      const monat = currentEnd.getMonth();
      const monatName = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][monat];
      
      absenceConsumption.push({
        periode: `${currentEnd.toISOString().split('T')[0]} - ${nextStart.toISOString().split('T')[0]}`,
        brennerstunden: abwesenheitsStunden,
        liter: abwesenheitsLiter,
        kosten: totalCost,
        tage: tageZwischen,
        monat: monatName,
        letzterNutzer: currentAufenthalt.user.name,
        naechsterNutzer: nextAufenthalt.user.name,
        literProTag: tageZwischen > 0 ? abwesenheitsLiter / tageZwischen : 0
      });
      
        gesamtAbwesenheitsKosten += totalCost;
        gesamtAbwesenheitsLiter += abwesenheitsLiter;
      }
    }
  }
  
  // Monatliche Gruppierung für bessere Übersicht
  const monatlicheAbwesenheit = Array(12).fill(0).map((_, index) => ({
    monat: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][index],
    liter: 0,
    kosten: 0,
    tage: 0,
    perioden: 0
  }));
  
  absenceConsumption.forEach(periode => {
    const monatIndex = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'].indexOf(periode.monat);
    if (monatIndex >= 0) {
      monatlicheAbwesenheit[monatIndex].liter += periode.liter;
      monatlicheAbwesenheit[monatIndex].kosten += periode.kosten;
      monatlicheAbwesenheit[monatIndex].tage += periode.tage;
      monatlicheAbwesenheit[monatIndex].perioden += 1;
    }
  });
  
  return {
    perioden: absenceConsumption,
    gesamtKosten: gesamtAbwesenheitsKosten,
    gesamtLiter: gesamtAbwesenheitsLiter,
    monatlicheAbwesenheit: monatlicheAbwesenheit
  };
}

// Hilfsfunktion: Durchschnittswerte aller anderen User berechnen
async function calculateReferenceValues(userId: number, jahr: number) {
  const otherUsersAufenthalte = await prisma.aufenthalt.findMany({
    where: {
      jahr: jahr,
      userId: { not: userId }
    },
    include: {
      user: { select: { name: true } }
    }
  });
  
  const preise = await prisma.preise.findUnique({
    where: { jahr: jahr }
  });
  
  if (otherUsersAufenthalte.length === 0) {
    return {
      durchschnittVerbrauchProTag: 0,
      durchschnittVerbrauchProAufenthalt: 0,
      durchschnittKostenProAufenthalt: 0,
      anzahlAndereUser: 0
    };
  }
  
  let totalVerbrauch = 0;
  let totalKosten = 0;
  let totalTage = 0;
  
  otherUsersAufenthalte.forEach(aufenthalt => {
    const verbrauchteLiter = calculateConsumptionBetweenReadings(
      aufenthalt.zaehlerAnkunft,
      aufenthalt.zaehlerAbreise,
      aufenthalt.zaehlerId || 0,
      aufenthalt.zaehlerAbreiseId,
      preise?.verbrauchProStunde || 5.5
    );
    
    const tage = Math.ceil((new Date(aufenthalt.abreise).getTime() - new Date(aufenthalt.ankunft).getTime()) / (1000 * 60 * 60 * 24));
    
    const oelKosten = verbrauchteLiter * (preise?.oelpreisProLiter || 1.01);
    const uebernachtungKosten = (
      aufenthalt.uebernachtungenMitglieder * (preise?.uebernachtungMitglied || 5) +
      aufenthalt.uebernachtungenGaeste * (preise?.uebernachtungGast || 10)
    );
    
    totalVerbrauch += verbrauchteLiter;
    totalKosten += oelKosten + uebernachtungKosten;
    totalTage += tage;
  });
  
  const uniqueUsers = new Set(otherUsersAufenthalte.map(a => a.userId)).size;
  
  return {
    durchschnittVerbrauchProTag: totalTage > 0 ? totalVerbrauch / totalTage : 0,
    durchschnittVerbrauchProAufenthalt: otherUsersAufenthalte.length > 0 ? totalVerbrauch / otherUsersAufenthalte.length : 0,
    durchschnittKostenProAufenthalt: otherUsersAufenthalte.length > 0 ? totalKosten / otherUsersAufenthalte.length : 0,
    anzahlAndereUser: uniqueUsers
  };
}

export const GET: APIRoute = async (context) => {
  try {
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    const { url } = context;
    const searchParams = new URL(url).searchParams;
    const jahr = searchParams.get('jahr') || '2024';
    let personId = searchParams.get('personId');
    const personName = searchParams.get('person'); // Neuer Parameter für Person-Filter

    // Standardmäßig sehen alle Benutzer (auch Admins) nur ihre eigenen Daten
    const showGesamtuebersicht = searchParams.get('gesamt') === 'true';
    const showAlleUser = searchParams.get('alle') === 'true';
    
    // Basis-Query für Aufenthalte
    const whereClause: any = { jahr: parseInt(jahr) };
    
    // Person-Filter
    if (showAlleUser && user.role === 'ADMIN') {
      // Admin möchte alle User sehen - keine userId Einschränkung
      if (personName && personName !== '') {
        // Spezifischer User-Filter
        const users = await prisma.user.findMany({
          where: { name: personName },
          select: { id: true }
        });
        
        if (users.length > 0) {
          whereClause.userId = users[0].id;
        }
      } else if (personId) {
        // Spezifische personId
        whereClause.userId = parseInt(personId);
      }
      // Wenn weder personName noch personId gesetzt, werden alle User geladen (keine userId Einschränkung)
    } else {
      // Standard: Alle Benutzer sehen nur ihre eigenen Daten
      whereClause.userId = user.id;
    }

    console.log('🔍 Filter-Debug:', { 
      jahr, 
      personName, 
      showAlleUser, 
      showGesamtuebersicht, 
      whereClause, 
      userRole: user.role, 
      userId: user.id 
    });

    // Aufenthalte laden
    const aufenthalte = await prisma.aufenthalt.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            beguenstigt: true,
          },
        },
      },
      orderBy: {
        ankunft: 'asc'
      }
    });

    console.log('📊 Gefundene Aufenthalte:', aufenthalte.length);
    console.log('🔍 Aufenthalte Details:', aufenthalte.map(a => ({
      user: a.user.name,
      datum: `${new Date(a.ankunft).toLocaleDateString()} - ${new Date(a.abreise).toLocaleDateString()}`,
      naechteBerechnen: a.naechteBerechnen,
      uebernachtungen: `${a.uebernachtungenMitglieder}M + ${a.uebernachtungenGaeste}G`
    })));

    // Tankfüllungen laden
    const tankfuellungen = await prisma.tankfuellung.findMany({
      where: {
        datum: {
          gte: new Date(`${jahr}-01-01`),
          lt: new Date(`${parseInt(jahr) + 1}-01-01`),
        },
      },
      orderBy: {
        datum: 'asc',
      },
    });

    // Preise laden
    const preise = await prisma.preise.findUnique({
      where: { jahr: parseInt(jahr) },
    });

    // Referenzwerte berechnen (nur wenn User seine eigenen Daten sieht)
    const referenceValues = showAlleUser ? {
      durchschnittVerbrauchProTag: 0,
      durchschnittVerbrauchProAufenthalt: 0,
      durchschnittKostenProAufenthalt: 0,
      anzahlAndereUser: 0
    } : await calculateReferenceValues(user.id, parseInt(jahr));

    // Abwesenheitsverbrauch berechnen (alle Nutzer)
    console.log('🚀 Starte Abwesenheitsberechnung für Jahr:', jahr);
    const absenceData = await calculateAllAbsenceConsumption(parseInt(jahr), tankfuellungen, preise, prisma);
    console.log('✅ Abwesenheitsberechnung abgeschlossen:', absenceData);

    // Detaillierte Aufenthaltsstatistiken berechnen
    const aufenthaltsDetails = aufenthalte.map(aufenthalt => {
      const verbrauchteLiter = calculateConsumptionBetweenReadings(
        aufenthalt.zaehlerAnkunft,
        aufenthalt.zaehlerAbreise,
        aufenthalt.zaehlerId || 0,
        aufenthalt.zaehlerAbreiseId,
        preise?.verbrauchProStunde || 5.5
      );
      
      const tage = Math.ceil((new Date(aufenthalt.abreise).getTime() - new Date(aufenthalt.ankunft).getTime()) / (1000 * 60 * 60 * 24));
      const verbrauchProTag = tage > 0 ? verbrauchteLiter / tage : 0;
      
      // Brennerstunden berechnen (Zählerstand Ende - Zählerstand Anfang)
      const brennerstunden = aufenthalt.zaehlerAbreise - aufenthalt.zaehlerAnkunft;
      
      const oelKosten = verbrauchteLiter * (preise?.oelpreisProLiter || 1.01);

      // Übernachtungskosten nur berechnen wenn naechteBerechnen true ist
      // null = User-Status entscheidet (begünstigt=false, normal=true)
      const naechteBerechnen = aufenthalt.naechteBerechnen ?? !aufenthalt.user.beguenstigt;
      const istBeguenstigt = aufenthalt.user.beguenstigt;

      const uebernachtungKosten = naechteBerechnen ? (
        aufenthalt.uebernachtungenMitglieder * (preise?.uebernachtungMitglied || 5) +
        aufenthalt.uebernachtungenGaeste * (preise?.uebernachtungGast || 10)
      ) : 0;

      // Berechnet: Alle die tatsächlich zahlen (normale + begünstigte die berechnen lassen)
      const uebernachtungKostenBerechnet = naechteBerechnen ? uebernachtungKosten : 0;

      // Begünstigte NICHT berechnet: Was hätten sie zahlen müssen (nur zur Info, nicht in Gesamtkosten)
      const uebernachtungKostenBeguenstigtNichtBerechnet = (istBeguenstigt && !naechteBerechnen) ? (
        aufenthalt.uebernachtungenMitglieder * (preise?.uebernachtungMitglied || 5) +
        aufenthalt.uebernachtungenGaeste * (preise?.uebernachtungGast || 10)
      ) : 0;

      return {
        id: aufenthalt.id,
        user: aufenthalt.user.name,
        ankunft: aufenthalt.ankunft,
        abreise: aufenthalt.abreise,
        tage: tage,
        verbrauchteLiter: verbrauchteLiter,
        verbrauchProTag: verbrauchProTag,
        brennerstunden: brennerstunden,
        oelKosten: oelKosten,
        uebernachtungKosten: uebernachtungKosten,
        uebernachtungKostenBerechnet: uebernachtungKostenBerechnet,
        uebernachtungKostenBeguenstigtNichtBerechnet: uebernachtungKostenBeguenstigtNichtBerechnet,
        gesamtKosten: oelKosten + uebernachtungKosten
      };
    });

    // Gesamtstatistiken berechnen
    const gesamtVerbrauch = aufenthaltsDetails.reduce((sum, a) => sum + a.verbrauchteLiter, 0);
    const gesamtKosten = aufenthaltsDetails.reduce((sum, a) => sum + a.gesamtKosten, 0);
    const gesamtTage = aufenthaltsDetails.reduce((sum, a) => sum + a.tage, 0);
    const durchschnittVerbrauchProTag = gesamtTage > 0 ? gesamtVerbrauch / gesamtTage : 0;

    // Monatliche Verbrauchsdaten
    const monatlicheVerbrauch = Array(12).fill(0);
    aufenthaltsDetails.forEach(aufenthalt => {
      const monat = new Date(aufenthalt.ankunft).getMonth();
      monatlicheVerbrauch[monat] += aufenthalt.verbrauchteLiter;
    });

    // Kosten pro Person (nur für Admins)
    const kostenProPerson: { [key: string]: any } = {};
    if (user.role === 'ADMIN') {
      aufenthaltsDetails.forEach(aufenthalt => {
        if (!kostenProPerson[aufenthalt.user]) {
          kostenProPerson[aufenthalt.user] = {
            aufenthalte: 0,
            tage: 0,
            verbrauchteLiter: 0,
            oelKosten: 0,
            uebernachtungKosten: 0,
            gesamtKosten: 0
          };
        }
        kostenProPerson[aufenthalt.user].aufenthalte++;
        kostenProPerson[aufenthalt.user].tage += aufenthalt.tage;
        kostenProPerson[aufenthalt.user].verbrauchteLiter += aufenthalt.verbrauchteLiter;
        kostenProPerson[aufenthalt.user].oelKosten += aufenthalt.oelKosten;
        kostenProPerson[aufenthalt.user].uebernachtungKosten += aufenthalt.uebernachtungKosten;
        kostenProPerson[aufenthalt.user].gesamtKosten += aufenthalt.gesamtKosten;
      });
    }

    const statistiken = {
      jahr: parseInt(jahr),
      gesamtVerbrauch: gesamtVerbrauch,
      gesamtKosten: gesamtKosten,
      anzahlAufenthalte: aufenthalte.length,
      anzahlTankfuellungen: tankfuellungen.length,
      durchschnittVerbrauchProStunde: preise?.verbrauchProStunde || 5.5,
      durchschnittVerbrauchProTag: durchschnittVerbrauchProTag,
      gesamtTage: gesamtTage,
      monatlicheVerbrauch: monatlicheVerbrauch,
      kostenProPerson: kostenProPerson,
      aufenthaltsDetails: aufenthaltsDetails,
      referenceValues: referenceValues,
      absenceConsumption: absenceData.perioden,
      absenceTotals: {
        gesamtKosten: absenceData.gesamtKosten,
        gesamtLiter: absenceData.gesamtLiter,
        anzahlPerioden: absenceData.perioden.length
      },
      monatlicheAbwesenheit: absenceData.monatlicheAbwesenheit,
      oelKosten: aufenthaltsDetails.reduce((sum, a) => sum + a.oelKosten, 0),
      uebernachtungKosten: aufenthaltsDetails.reduce((sum, a) => sum + a.uebernachtungKosten, 0),
      uebernachtungKostenBerechnet: aufenthaltsDetails.reduce((sum, a) => sum + a.uebernachtungKostenBerechnet, 0),
      uebernachtungKostenBeguenstigtNichtBerechnet: aufenthaltsDetails.reduce((sum, a) => sum + a.uebernachtungKostenBeguenstigtNichtBerechnet, 0)
    };

    console.log('📈 Finale Statistiken:', {
      jahr: statistiken.jahr,
      gesamtVerbrauch: statistiken.gesamtVerbrauch,
      gesamtKosten: statistiken.gesamtKosten,
      durchschnittVerbrauchProTag: statistiken.durchschnittVerbrauchProTag,
      anzahlAufenthalte: statistiken.anzahlAufenthalte,
      aufenthalteOhneNaechteBerechnung: aufenthalte.filter(a => !a.naechteBerechnen).length,
      oelKosten: statistiken.oelKosten,
      uebernachtungKosten: statistiken.uebernachtungKosten,
      uebernachtungKostenBerechnet: statistiken.uebernachtungKostenBerechnet,
      uebernachtungKostenBeguenstigtNichtBerechnet: statistiken.uebernachtungKostenBeguenstigtNichtBerechnet,
      referenceValues: statistiken.referenceValues
    });

    return new Response(JSON.stringify(statistiken), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden der Statistiken:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Laden der Statistiken' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
