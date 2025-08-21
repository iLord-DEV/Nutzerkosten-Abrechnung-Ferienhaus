import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Datenbank-Seeding...');

  // Benutzer erstellen
  const admin = await prisma.user.upsert({
    where: { email: 'admin@wuestenstein.de' },
    update: {},
    create: {
      email: 'admin@wuestenstein.de',
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  const anna = await prisma.user.upsert({
    where: { email: 'anna.weber@example.com' },
    update: {},
    create: {
      email: 'anna.weber@example.com',
      name: 'Anna Weber',
      role: 'USER',
    },
  });

  const hans = await prisma.user.upsert({
    where: { email: 'hans.mueller@example.com' },
    update: {},
    create: {
      email: 'hans.mueller@example.com',
      name: 'Hans Müller',
      role: 'USER',
    },
  });

  const lisa = await prisma.user.upsert({
    where: { email: 'lisa.schmidt@example.com' },
    update: {},
    create: {
      email: 'lisa.schmidt@example.com',
      name: 'Lisa Schmidt',
      role: 'USER',
    },
  });

  const peter = await prisma.user.upsert({
    where: { email: 'peter.klein@example.com' },
    update: {},
    create: {
      email: 'peter.klein@example.com',
      name: 'Peter Klein',
      role: 'USER',
    },
  });

  console.log('✅ Benutzer erstellt:', { admin, anna, hans, lisa, peter });

  // Preise für verschiedene Jahre
  const preise2022 = await prisma.preise.upsert({
    where: { jahr: 2022 },
    update: {},
    create: {
      jahr: 2022,
      oelpreisProLiter: 1.10,
      uebernachtungMitglied: 12.0,
      uebernachtungGast: 20.0,
      verbrauchProStunde: 5.5, // Fallback-Wert
      istBerechnet: false,
    },
  });

  const preise2023 = await prisma.preise.upsert({
    where: { jahr: 2023 },
    update: {},
    create: {
      jahr: 2023,
      oelpreisProLiter: 1.15,
      uebernachtungMitglied: 13.0,
      uebernachtungGast: 22.0,
      verbrauchProStunde: 5.5, // Fallback-Wert
      istBerechnet: false,
    },
  });

  const preise2024 = await prisma.preise.upsert({
    where: { jahr: 2024 },
    update: {},
    create: {
      jahr: 2024,
      oelpreisProLiter: 1.25,
      uebernachtungMitglied: 15.0,
      uebernachtungGast: 25.0,
      verbrauchProStunde: 5.5, // Fallback-Wert
      istBerechnet: false,
    },
  });

  console.log('✅ Preise erstellt:', { preise2022, preise2023, preise2024 });

  // SZENARIO A: 2022 - Abgeschlossenes Jahr OHNE Tanken (nur Fallback-Wert)
  console.log('📊 Erstelle Szenario A: 2022 ohne Tankfüllungen (nur Fallback 5.5 L/h)');

  // SZENARIO B: 2022 - Erste Tankfüllung (Referenz-Zählerstand)
  console.log('📊 Erstelle Szenario B: 2022 - Erste Tankfüllung als Referenz');
  const tankfuellung2022 = await prisma.tankfuellung.create({
    data: {
      datum: new Date('2022-03-15T12:00:00Z'), // Frühjahr 2022
      liter: 250,
      preisProLiter: 1.05,
      zaehlerstand: 800.0, // Startpunkt
    },
  });

  // SZENARIO C: 2024 - Zweite Tankfüllung nach 2 Jahren (neuer Verbrauchswert wird berechnet)
  console.log('📊 Erstelle Szenario C: 2024 - Zweite Tankfüllung nach 2 Jahren');
  const tankfuellung2024 = await prisma.tankfuellung.create({
    data: {
      datum: new Date('2024-04-20T12:00:00Z'), // Frühjahr 2024, 2 Jahre später
      liter: 280,
      preisProLiter: 1.35,
      zaehlerstand: 1350.0, // 550 Brennerstunden in 2 Jahren
    },
  });

  console.log('✅ Tankfüllungen erstellt:', { tankfuellung2022, tankfuellung2024 });

  // Aufenthalte mit Überlappungen für verschiedene Szenarien
  console.log('📊 Erstelle Aufenthalte mit Überlappungen...');

  // 2022: Aufenthalte VOR der ersten Tankfüllung (Fallback-Verbrauch)
  const aufenthalte2022 = await Promise.all([
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2022-01-15T14:00:00Z'),
        abreise: new Date('2022-01-17T10:00:00Z'),
        zaehlerAnkunft: 750.0,
        zaehlerAbreise: 770.0,
        userId: anna.id,
        jahr: 2022,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2022-02-10T16:00:00Z'),
        abreise: new Date('2022-02-12T11:00:00Z'),
        zaehlerAnkunft: 770.0,
        zaehlerAbreise: 785.0,
        userId: hans.id,
        jahr: 2022,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    // Tankfüllung passiert im März bei Zählerstand 800
  ]);

  // 2023: Aufenthalte NACH der ersten Tankfüllung (noch Fallback, da nur 1 Tankfüllung)
  const aufenthalte2023 = await Promise.all([
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-01-20T15:00:00Z'),
        abreise: new Date('2023-01-22T10:00:00Z'),
        zaehlerAnkunft: 950.0,
        zaehlerAbreise: 970.0,
        userId: anna.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-01-21T14:00:00Z'), // Überlappung mit Anna
        abreise: new Date('2023-01-23T11:00:00Z'),
        zaehlerAnkunft: 970.0,
        zaehlerAbreise: 990.0,
        userId: lisa.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-03-15T16:00:00Z'),
        abreise: new Date('2023-03-17T12:00:00Z'),
        zaehlerAnkunft: 1050.0,
        zaehlerAbreise: 1065.0,
        userId: hans.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
  ]);

  // 2024: Aufenthalte VOR der zweiten Tankfüllung (noch Fallback)
  const aufenthalte2024_vor_tanken = await Promise.all([
    // Anna: Aufenthalt im Januar
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-01-05T14:00:00Z'),
        abreise: new Date('2024-01-07T10:00:00Z'),
        zaehlerAnkunft: 1200.0,
        zaehlerAbreise: 1220.0,
        userId: anna.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    // Lisa: Überlappt mit Anna (1 Tag)
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-01-06T16:00:00Z'), // Überlappung mit Anna
        abreise: new Date('2024-01-08T11:00:00Z'),
        zaehlerAnkunft: 1220.0,
        zaehlerAbreise: 1235.0,
        userId: lisa.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    // Hans: Überlappt mit beiden (komplexe Überlappung)
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-01-07T12:00:00Z'), // Überlappung mit beiden
        abreise: new Date('2024-01-09T10:00:00Z'),
        zaehlerAnkunft: 1235.0,
        zaehlerAbreise: 1250.0,
        userId: hans.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
  ]);

  // 2024: Aufenthalte NACH der zweiten Tankfüllung (neuer berechneter Verbrauch!)
  const aufenthalte2024_nach_tanken = await Promise.all([
    // Peter: Nach der Tankfüllung im April
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-05-10T15:00:00Z'),
        abreise: new Date('2024-05-12T11:00:00Z'),
        zaehlerAnkunft: 1360.0, // 10 Stunden nach Tankfüllung
        zaehlerAbreise: 1375.0,
        userId: peter.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 2,
      },
    }),
    // Anna: Überlappung mit Peter
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-05-11T14:00:00Z'), // Überlappung mit Peter
        abreise: new Date('2024-05-13T10:00:00Z'),
        zaehlerAnkunft: 1375.0,
        zaehlerAbreise: 1390.0,
        userId: anna.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
  ]);

  const aufenthalte2024 = [...aufenthalte2024_vor_tanken, ...aufenthalte2024_nach_tanken];

  console.log('✅ Aufenthalte erstellt:', { aufenthalte2022, aufenthalte2023, aufenthalte2024 });

  // Jahresabschlüsse
  const jahresAbschluss2022 = await prisma.jahresAbschluss.upsert({
    where: { jahr: 2022 },
    update: {},
    create: {
      jahr: 2022,
      zaehlerstand: 200.0,
      gesamtKosten: 220.0,
      anzahlAufenthalte: 2,
      verbrauchProStunde: 5.5, // Fallback-Wert
    },
  });

  const jahresAbschluss2023 = await prisma.jahresAbschluss.upsert({
    where: { jahr: 2023 },
    update: {},
    create: {
      jahr: 2023,
      zaehlerstand: 350.0,
      gesamtKosten: 385.0,
      anzahlAufenthalte: 3,
      verbrauchProStunde: 5.5, // Fallback-Wert (nur 1 Tankfüllung)
    },
  });

  const jahresAbschluss2024 = await prisma.jahresAbschluss.upsert({
    where: { jahr: 2024 },
    update: {},
    create: {
      jahr: 2024,
      zaehlerstand: 1580.0,
      gesamtKosten: 1185.0,
      anzahlAufenthalte: 6,
      verbrauchProStunde: 5.5, // Wird nach 2. Tankfüllung aktualisiert
    },
  });

  console.log('✅ Jahresabschlüsse erstellt:', { jahresAbschluss2022, jahresAbschluss2023, jahresAbschluss2024 });

  console.log('🎉 Datenbank-Seeding erfolgreich abgeschlossen!');
  console.log('');
  console.log('📊 REALISTISCHE SZENARIEN:');
  console.log('A) 2022 VOR Tanken: Aufenthalte bei Zählerstand 750-785 → Fallback 5.5 L/h');
  console.log('B) März 2022: Erste Tankfüllung bei Zählerstand 800 (250L zu €1.05/L)');
  console.log('C) 2023: Aufenthalte bei Zählerstand 950-1065 → Fallback 5.5 L/h (nur 1 Tankfüllung)');
  console.log('D) April 2024: Zweite Tankfüllung bei Zählerstand 1350 (280L zu €1.35/L)');
  console.log('   → Berechnung: 280L ÷ (1350-800) Stunden = 0.51 L/h neuer Verbrauch!');
  console.log('E) 2024 NACH Tanken: Aufenthalte mit neuem Verbrauchswert 0.51 L/h');
  console.log('F) Überlappungen: Anna/Lisa/Hans (Jan 2024), Anna/Peter (Mai 2024)');
  console.log('');
  console.log('🔑 LOGIN-DATEN:');
  console.log('Admin: admin@wuestenstein.de');
  console.log('User: anna.weber@example.com, hans.mueller@example.com, lisa.schmidt@example.com, peter.klein@example.com');
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
