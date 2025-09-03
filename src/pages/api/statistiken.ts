import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth';

const prisma = new PrismaClient();

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
    });

    console.log('📊 Gefundene Aufenthalte:', aufenthalte.length);
    if (aufenthalte.length > 0) {
      console.log('📋 Erster Aufenthalt:', {
        user: aufenthalte[0].user.name,
        ankunft: aufenthalte[0].ankunft,
        zaehlerAnkunft: aufenthalte[0].zaehlerAnkunft,
        zaehlerAbreise: aufenthalte[0].zaehlerAbreise,
        anzahlMitglieder: aufenthalte[0].anzahlMitglieder,
        anzahlGaeste: aufenthalte[0].anzahlGaeste
      });
    }

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

    console.log('⛽ Gefundene Tankfüllungen:', tankfuellungen.length);
    if (tankfuellungen.length > 0) {
      console.log('📊 Erste Tankfüllung:', {
        datum: tankfuellungen[0].datum,
        liter: tankfuellungen[0].liter,
        zaehlerstand: tankfuellungen[0].zaehlerstand
      });
    }

    // Preise laden
    const preise = await prisma.preise.findUnique({
      where: { jahr: parseInt(jahr) },
    });

    console.log('💰 Gefundene Preise für Jahr', jahr, ':', preise ? 'Ja' : 'Nein');
    if (preise) {
      console.log('📋 Preis-Details:', {
        oelpreisProLiter: preise.oelpreisProLiter,
        uebernachtungMitglied: preise.uebernachtungMitglied,
        uebernachtungGast: preise.uebernachtungGast,
        verbrauchProStunde: preise.verbrauchProStunde
      });
    }

    // Statistiken berechnen
    const statistiken = {
      jahr: parseInt(jahr),
      gesamtVerbrauch: 0,
      gesamtKosten: 0,
      anzahlAufenthalte: aufenthalte.length,
      anzahlTankfuellungen: tankfuellungen.length,
      durchschnittVerbrauchProStunde: preise?.verbrauchProStunde || 5.5,
      monatlicheVerbrauch: Array(12).fill(0),
      kostenProPerson: {},
      aufenthalte: aufenthalte,
      tankfuellungen: tankfuellungen,
    };

    // Verbrauch und Kosten pro Aufenthalt berechnen
    let gesamtVerbrauch = 0;
    const kostenProPerson: { [key: string]: number } = {};

    aufenthalte.forEach((aufenthalt) => {
      let verbrauchteStunden = 0;
      
      // Prüfen ob Zählerwechsel während des Aufenthalts stattgefunden hat
      if (aufenthalt.zaehlerId && aufenthalt.zaehlerAbreiseId && aufenthalt.zaehlerId !== aufenthalt.zaehlerAbreiseId) {
        // Zählerwechsel erkannt - Berechnung anpassen
        // TODO: Hier müsste der letzte Stand des alten Zählers ermittelt werden
        // Für jetzt: Vereinfachte Berechnung (sollte in der Praxis erweitert werden)
        console.log(`⚠️ Zählerwechsel während Aufenthalt ${aufenthalt.id} erkannt!`);
        console.log(`   Ankunft: Zähler ${aufenthalt.zaehlerId} bei ${aufenthalt.zaehlerAnkunft}h`);
        console.log(`   Abreise: Zähler ${aufenthalt.zaehlerAbreiseId} bei ${aufenthalt.zaehlerAbreise}h`);
        
        // Vereinfachte Berechnung: Nur der Abreise-Zählerstand wird verwendet
        // In der Praxis sollte hier der letzte Stand des alten Zählers ermittelt werden
        verbrauchteStunden = aufenthalt.zaehlerAbreise;
      } else {
        // Normaler Fall: Gleicher Zähler oder noch keine Zähler-IDs gesetzt
        verbrauchteStunden = aufenthalt.zaehlerAbreise - aufenthalt.zaehlerAnkunft;
      }
      
      gesamtVerbrauch += verbrauchteStunden;

      // Ölkosten
      const oelKosten = verbrauchteStunden * (preise?.verbrauchProStunde || 5.5) * (preise?.oelpreisProLiter || 1.01);
      
      // Übernachtungskosten
      const anzahlNaechte = Math.ceil((new Date(aufenthalt.abreise).getTime() - new Date(aufenthalt.ankunft).getTime()) / (1000 * 60 * 60 * 24));
      const uebernachtungKosten = anzahlNaechte * (
        aufenthalt.anzahlMitglieder * (preise?.uebernachtungMitglied || 15) +
        aufenthalt.anzahlGaeste * (preise?.uebernachtungGast || 25)
      );

      const gesamtKosten = oelKosten + uebernachtungKosten;
      statistiken.gesamtKosten += gesamtKosten;

      console.log(`💰 Kosten für ${aufenthalt.user.name}:`, {
        verbrauchteStunden,
        oelKosten: oelKosten.toFixed(2),
        uebernachtungKosten: uebernachtungKosten.toFixed(2),
        gesamtKosten: gesamtKosten.toFixed(2)
      });

      // Kosten pro Person sammeln
      const personName = aufenthalt.user.name;
      if (!kostenProPerson[personName]) {
        kostenProPerson[personName] = 0;
      }
      kostenProPerson[personName] += gesamtKosten;

      // Monatlichen Verbrauch sammeln (nur für gefilterte Aufenthalte)
      const monat = new Date(aufenthalt.ankunft).getMonth();
      statistiken.monatlicheVerbrauch[monat] += verbrauchteStunden;
    });

    statistiken.gesamtVerbrauch = gesamtVerbrauch;
    
    // Nur Admins sehen personenspezifische Kosten
    if (user.role === 'ADMIN') {
      statistiken.kostenProPerson = kostenProPerson;
    } else {
      // Normale Benutzer sehen nur Gesamtkosten
      statistiken.kostenProPerson = {};
    }

    console.log('📈 Finale Statistiken:', {
      jahr: statistiken.jahr,
      gesamtVerbrauch: statistiken.gesamtVerbrauch,
      gesamtKosten: statistiken.gesamtKosten,
      anzahlAufenthalte: statistiken.anzahlAufenthalte,
      anzahlTankfuellungen: statistiken.anzahlTankfuellungen,
      durchschnittVerbrauchProStunde: statistiken.durchschnittVerbrauchProStunde
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
