import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth';

const prisma = new PrismaClient();

// Hilfsfunktion: Verbrauch zwischen zwei Zählerständen berechnen
function calculateConsumptionBetweenReadings(startReading: number, endReading: number, zaehlerId: number, zaehlerAbreiseId: number | null): number {
  if (zaehlerId !== zaehlerAbreiseId) {
    // Zählerwechsel - vereinfachte Berechnung
    // In der Praxis sollte hier der letzte Stand des alten Zählers ermittelt werden
    return endReading - startReading;
  }
  return endReading - startReading;
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
  
  // Alle Aufenthalte nach Datum sortieren
  const sortedAufenthalte = allAufenthalte.sort((a, b) => new Date(a.ankunft).getTime() - new Date(b.ankunft).getTime());
  
  // Abwesenheitsperioden zwischen allen Aufenthalten finden
  for (let i = 0; i < sortedAufenthalte.length - 1; i++) {
    const currentAufenthalt = sortedAufenthalte[i];
    const nextAufenthalt = sortedAufenthalte[i + 1];
    
    const currentEnd = new Date(currentAufenthalt.abreise);
    const nextStart = new Date(nextAufenthalt.ankunft);
    
    // Prüfen ob es eine Lücke zwischen den Aufenthalten gibt
    const tageZwischen = Math.ceil((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
    
    if (tageZwischen > 0) {
      // Abwesenheitsverbrauch basierend auf Zählerständen berechnen
      const abwesenheitsLiter = nextAufenthalt.zaehlerAnkunft - currentAufenthalt.zaehlerAbreise;
      const preisProLiter = preise?.oelpreisProLiter || 1.01;
      const totalCost = abwesenheitsLiter * preisProLiter;
      
      // Monat der Abwesenheit für Gruppierung
      const monat = currentEnd.getMonth();
      const monatName = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][monat];
      
      absenceConsumption.push({
        periode: `${currentEnd.toISOString().split('T')[0]} - ${nextStart.toISOString().split('T')[0]}`,
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
      aufenthalt.zaehlerAbreiseId
    );
    
    const tage = Math.ceil((new Date(aufenthalt.abreise).getTime() - new Date(aufenthalt.ankunft).getTime()) / (1000 * 60 * 60 * 24));
    
    const oelKosten = verbrauchteLiter * (preise?.oelpreisProLiter || 1.01);
    const uebernachtungKosten = (
      aufenthalt.uebernachtungenMitglieder * (preise?.uebernachtungMitglied || 15) +
      aufenthalt.uebernachtungenGaeste * (preise?.uebernachtungGast || 25)
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

    // Normale Benutzer können nur ihre eigenen Daten sehen (außer bei Gesamtübersicht)
    const showGesamtuebersicht = searchParams.get('gesamt') === 'true';
    if (user.role !== 'ADMIN' && !showGesamtuebersicht) {
      personId = user.id.toString();
    }

    // Basis-Query für Aufenthalte
    const whereClause: any = { jahr: parseInt(jahr) };
    
    // Person-Filter nur für Admins oder bei Gesamtübersicht
    if (personName && personName !== '') {
      if (user.role === 'ADMIN' || showGesamtuebersicht) {
        // Admins können nach Namen filtern, normale Benutzer nur bei Gesamtübersicht
        const users = await prisma.user.findMany({
          where: { name: personName },
          select: { id: true }
        });
        
        if (users.length > 0) {
          whereClause.userId = users[0].id;
        }
      } else {
        // Normale Benutzer können nicht nach anderen Nutzern filtern
        // Sie sehen immer nur ihre eigenen Daten
        whereClause.userId = user.id;
      }
    } else if (personId && !showGesamtuebersicht) {
      // Fallback auf personId wenn kein personName gesetzt ist
      whereClause.userId = parseInt(personId);
    }

    console.log('🔍 Filter-Debug:', { jahr, personName, whereClause, userRole: user.role, userId: user.id });

    // Aufenthalte laden
    const aufenthalte = await prisma.aufenthalt.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        ankunft: 'asc'
      }
    });

    console.log('📊 Gefundene Aufenthalte:', aufenthalte.length);

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

    // Referenzwerte berechnen (Durchschnitt aller anderen User)
    const referenceValues = await calculateReferenceValues(user.id, parseInt(jahr));

    // Abwesenheitsverbrauch berechnen (alle Nutzer)
    const absenceData = await calculateAllAbsenceConsumption(parseInt(jahr), tankfuellungen, preise, prisma);

    // Detaillierte Aufenthaltsstatistiken berechnen
    const aufenthaltsDetails = aufenthalte.map(aufenthalt => {
      const verbrauchteLiter = calculateConsumptionBetweenReadings(
        aufenthalt.zaehlerAnkunft,
        aufenthalt.zaehlerAbreise,
        aufenthalt.zaehlerId || 0,
        aufenthalt.zaehlerAbreiseId
      );
      
      const tage = Math.ceil((new Date(aufenthalt.abreise).getTime() - new Date(aufenthalt.ankunft).getTime()) / (1000 * 60 * 60 * 24));
      const verbrauchProTag = tage > 0 ? verbrauchteLiter / tage : 0;
      
      const oelKosten = verbrauchteLiter * (preise?.oelpreisProLiter || 1.01);
      const uebernachtungKosten = (
        aufenthalt.uebernachtungenMitglieder * (preise?.uebernachtungMitglied || 15) +
        aufenthalt.uebernachtungenGaeste * (preise?.uebernachtungGast || 25)
      );
      
      return {
        id: aufenthalt.id,
        user: aufenthalt.user.name,
        ankunft: aufenthalt.ankunft,
        abreise: aufenthalt.abreise,
        tage: tage,
        verbrauchteLiter: verbrauchteLiter,
        verbrauchProTag: verbrauchProTag,
        oelKosten: oelKosten,
        uebernachtungKosten: uebernachtungKosten,
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
      uebernachtungKosten: aufenthaltsDetails.reduce((sum, a) => sum + a.uebernachtungKosten, 0)
    };

    console.log('📈 Finale Statistiken:', {
      jahr: statistiken.jahr,
      gesamtVerbrauch: statistiken.gesamtVerbrauch,
      gesamtKosten: statistiken.gesamtKosten,
      durchschnittVerbrauchProTag: statistiken.durchschnittVerbrauchProTag,
      anzahlAufenthalte: statistiken.anzahlAufenthalte,
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
