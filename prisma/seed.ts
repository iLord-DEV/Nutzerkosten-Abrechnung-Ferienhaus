import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Datenbank-Seeding...');

  // Alle bestehenden Daten löschen
  await prisma.jahresAbschluss.deleteMany();
  await prisma.aufenthalt.deleteMany();
  await prisma.tankfuellung.deleteMany();
  await prisma.preise.deleteMany();
  await prisma.user.deleteMany();

  // 1. Benutzer erstellen
  const admin = await prisma.user.create({
    data: {
      email: 'admin@wuestenstein.de',
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  const anna = await prisma.user.create({
    data: {
      email: 'anna.weber@example.com',
      name: 'Anna Weber',
      role: 'USER',
    },
  });

  const hans = await prisma.user.create({
    data: {
      email: 'hans.mueller@example.com',
      name: 'Hans Müller',
      role: 'USER',
    },
  });

  const lisa = await prisma.user.create({
    data: {
      email: 'lisa.schmidt@example.com',
      name: 'Lisa Schmidt',
      role: 'USER',
    },
  });

  const peter = await prisma.user.create({
    data: {
      email: 'peter.klein@example.com',
      name: 'Peter Klein',
      role: 'USER',
    },
  });

  console.log('✅ Benutzer erstellt:', { admin, anna, hans, lisa, peter });

  // 2. Preise erstellen
  const preise2022 = await prisma.preise.create({
    data: {
      jahr: 2022,
      oelpreisProLiter: 1.1,
      uebernachtungMitglied: 12,
      uebernachtungGast: 20,
      verbrauchProStunde: 5.5, // Fallback
      istBerechnet: false,
    },
  });

  const preise2023 = await prisma.preise.create({
    data: {
      jahr: 2023,
      oelpreisProLiter: 1.15,
      uebernachtungMitglied: 13,
      uebernachtungGast: 22,
      verbrauchProStunde: 5.5, // Fallback
      istBerechnet: false,
    },
  });

  const preise2024 = await prisma.preise.create({
    data: {
      jahr: 2024,
              oelpreisProLiter: 1.01,
      uebernachtungMitglied: 15,
      uebernachtungGast: 25,
      verbrauchProStunde: 5.5, // Fallback
      istBerechnet: false,
    },
  });

  console.log('✅ Preise erstellt:', { preise2022, preise2023, preise2024 });

  // 3. Tankfüllungen erstellen
  console.log('📊 Erstelle Tankfüllungen...');
  
  const tankfuellung2022 = await prisma.tankfuellung.create({
    data: {
      datum: new Date('2022-03-15T12:00:00Z'),
      liter: 250,
      preisProLiter: 1.05,
      zaehlerstand: 800,
    },
  });

  const tankfuellung2024 = await prisma.tankfuellung.create({
    data: {
      datum: new Date('2024-04-20T12:00:00Z'),
      liter: 280,
      preisProLiter: 1.35,
      zaehlerstand: 1350,
    },
  });

  console.log('✅ Tankfüllungen erstellt:', { tankfuellung2022, tankfuellung2024 });

  // 4. Aufenthalte mit KORREKTEN, nicht-überlappenden Zählerständen pro Person
  console.log('📊 Erstelle Aufenthalte mit korrekten Zählerständen...');

  // 2022: Aufenthalte VOR der ersten Tankfüllung (Fallback-Verbrauch)
  const aufenthalte2022 = await Promise.all([
    // Anna: 4 Aufenthalte - SEQUENZIELL, keine Überlappungen mit sich selbst
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
        ankunft: new Date('2022-03-20T15:00:00Z'),
        abreise: new Date('2022-03-22T11:00:00Z'),
        zaehlerAnkunft: 770.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 785.0,
        userId: anna.id,
        jahr: 2022,
        anzahlMitglieder: 1,
        anzahlGaeste: 2,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2022-06-10T16:00:00Z'),
        abreise: new Date('2022-06-12T10:00:00Z'),
        zaehlerAnkunft: 785.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 800.0,
        userId: anna.id,
        jahr: 2022,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2022-09-05T14:00:00Z'),
        abreise: new Date('2022-09-07T12:00:00Z'),
        zaehlerAnkunft: 800.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 815.0,
        userId: anna.id,
        jahr: 2022,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    
    // Hans: 4 Aufenthalte - SEQUENZIELL, keine Überlappungen mit sich selbst
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2022-02-10T16:00:00Z'),
        abreise: new Date('2022-02-12T11:00:00Z'),
        zaehlerAnkunft: 760.0, // Parallel zu Anna, aber andere Zeitspanne
        zaehlerAbreise: 775.0,
        userId: hans.id,
        jahr: 2022,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2022-04-15T14:00:00Z'),
        abreise: new Date('2022-04-17T10:00:00Z'),
        zaehlerAnkunft: 775.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 790.0,
        userId: hans.id,
        jahr: 2022,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2022-07-15T15:00:00Z'),
        abreise: new Date('2022-07-17T11:00:00Z'),
        zaehlerAnkunft: 790.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 805.0,
        userId: hans.id,
        jahr: 2022,
        anzahlMitglieder: 1,
        anzahlGaeste: 2,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2022-11-20T16:00:00Z'),
        abreise: new Date('2022-11-22T12:00:00Z'),
        zaehlerAnkunft: 805.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 820.0,
        userId: hans.id,
        jahr: 2022,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
  ]);

  // 2023: Aufenthalte NACH der ersten Tankfüllung (noch Fallback, da nur 1 Tankfüllung)
  const aufenthalte2023 = await Promise.all([
    // Anna: 4 Aufenthalte - SEQUENZIELL, keine Überlappungen mit sich selbst
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-01-20T15:00:00Z'),
        abreise: new Date('2023-01-22T10:00:00Z'),
        zaehlerAnkunft: 820.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 834.0, // KORRIGIERT: Endet bei 834h, nicht 835h
        userId: anna.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-04-10T14:00:00Z'),
        abreise: new Date('2023-04-12T11:00:00Z'),
        zaehlerAnkunft: 835.0, // KORRIGIERT: Beginnt bei 835h, nach 834h
        zaehlerAbreise: 850.0,
        userId: anna.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-07-05T16:00:00Z'),
        abreise: new Date('2023-07-07T12:00:00Z'),
        zaehlerAnkunft: 850.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 865.0,
        userId: anna.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-10-15T15:00:00Z'),
        abreise: new Date('2023-10-17T10:00:00Z'),
        zaehlerAnkunft: 865.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 880.0,
        userId: anna.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 2,
      },
    }),
    
    // Lisa: 4 Aufenthalte - SEQUENZIELL, keine Überlappungen mit sich selbst
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-01-21T14:00:00Z'), // Überlappung mit Anna (realistisch!)
        abreise: new Date('2023-01-23T11:00:00Z'),
        zaehlerAnkunft: 825.0, // Parallel zu Anna, aber andere Zeitspanne
        zaehlerAbreise: 840.0,
        userId: lisa.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-03-10T15:00:00Z'),
        abreise: new Date('2023-03-12T11:00:00Z'),
        zaehlerAnkunft: 840.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 855.0,
        userId: lisa.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-06-20T16:00:00Z'),
        abreise: new Date('2023-06-22T12:00:00Z'),
        zaehlerAnkunft: 855.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 870.0,
        userId: lisa.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-09-25T14:00:00Z'),
        abreise: new Date('2023-09-27T10:00:00Z'),
        zaehlerAnkunft: 870.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 885.0,
        userId: lisa.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    
    // Hans: 4 Aufenthalte - SEQUENZIELL, keine Überlappungen mit sich selbst
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-03-15T16:00:00Z'),
        abreise: new Date('2023-03-17T12:00:00Z'),
        zaehlerAnkunft: 845.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 860.0,
        userId: hans.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-05-12T15:00:00Z'),
        abreise: new Date('2023-05-14T11:00:00Z'),
        zaehlerAnkunft: 860.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 875.0,
        userId: hans.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-08-08T16:00:00Z'),
        abreise: new Date('2023-08-10T12:00:00Z'),
        zaehlerAnkunft: 875.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 890.0,
        userId: hans.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2023-11-30T14:00:00Z'),
        abreise: new Date('2023-12-02T10:00:00Z'),
        zaehlerAnkunft: 890.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 905.0,
        userId: hans.id,
        jahr: 2023,
        anzahlMitglieder: 1,
        anzahlGaeste: 2,
      },
    }),
  ]);

  // 2024: Aufenthalte VOR der zweiten Tankfüllung (noch Fallback)
  const aufenthalte2024_vor_tanken = await Promise.all([
    // Anna: 4 Aufenthalte - SEQUENZIELL, keine Überlappungen mit sich selbst
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-01-05T14:00:00Z'),
        abreise: new Date('2024-01-07T10:00:00Z'),
        zaehlerAnkunft: 880.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 895.0,
        userId: anna.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-01-20T15:00:00Z'),
        abreise: new Date('2024-01-22T11:00:00Z'),
        zaehlerAnkunft: 895.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 910.0,
        userId: anna.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-02-10T16:00:00Z'),
        abreise: new Date('2024-02-12T12:00:00Z'),
        zaehlerAnkunft: 910.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 925.0,
        userId: anna.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-03-15T14:00:00Z'),
        abreise: new Date('2024-03-17T10:00:00Z'),
        zaehlerAnkunft: 925.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 940.0,
        userId: anna.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 2,
      },
    }),
    
    // Lisa: 4 Aufenthalte - SEQUENZIELL, keine Überlappungen mit sich selbst
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-01-06T16:00:00Z'), // Überlappung mit Anna (realistisch!)
        abreise: new Date('2024-01-08T11:00:00Z'),
        zaehlerAnkunft: 885.0, // Parallel zu Anna, aber andere Zeitspanne
        zaehlerAbreise: 900.0,
        userId: lisa.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-02-05T15:00:00Z'),
        abreise: new Date('2024-02-07T11:00:00Z'),
        zaehlerAnkunft: 900.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 915.0,
        userId: lisa.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-03-10T16:00:00Z'),
        abreise: new Date('2024-03-12T12:00:00Z'),
        zaehlerAnkunft: 915.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 930.0,
        userId: lisa.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-03-25T14:00:00Z'),
        abreise: new Date('2024-03-27T10:00:00Z'),
        zaehlerAnkunft: 930.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 945.0,
        userId: lisa.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    
    // Hans: 4 Aufenthalte - SEQUENZIELL, keine Überlappungen mit sich selbst
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-01-07T12:00:00Z'), // Überlappung mit Anna und Lisa
        abreise: new Date('2024-01-09T10:00:00Z'),
        zaehlerAnkunft: 890.0, // Parallel zu Anna und Lisa, aber andere Zeitspanne
        zaehlerAbreise: 905.0,
        userId: hans.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-01-25T15:00:00Z'),
        abreise: new Date('2024-01-27T11:00:00Z'),
        zaehlerAnkunft: 905.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 920.0,
        userId: hans.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-02-20T16:00:00Z'),
        abreise: new Date('2024-02-22T12:00:00Z'),
        zaehlerAnkunft: 920.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 935.0,
        userId: hans.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-03-20T14:00:00Z'),
        abreise: new Date('2024-03-22T10:00:00Z'),
        zaehlerAnkunft: 935.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 950.0,
        userId: hans.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 2,
      },
    }),
  ]);

  // 2024: Aufenthalte NACH der zweiten Tankfüllung (neuer berechneter Verbrauch!)
  const aufenthalte2024_nach_tanken = await Promise.all([
    // Peter: 4 Aufenthalte nach der Tankfüllung - SEQUENZIELL
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-05-10T15:00:00Z'),
        abreise: new Date('2024-05-12T11:00:00Z'),
        zaehlerAnkunft: 1350.0, // Nach Tankfüllung
        zaehlerAbreise: 1365.0,
        userId: peter.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 2,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-06-15T16:00:00Z'),
        abreise: new Date('2024-06-17T12:00:00Z'),
        zaehlerAnkunft: 1365.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 1380.0,
        userId: peter.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-08-20T14:00:00Z'),
        abreise: new Date('2024-08-22T10:00:00Z'),
        zaehlerAnkunft: 1380.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 1395.0,
        userId: peter.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 1,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-10-25T15:00:00Z'),
        abreise: new Date('2024-10-27T11:00:00Z'),
        zaehlerAnkunft: 1395.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 1410.0,
        userId: peter.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    
    // Anna: 4 Aufenthalte nach der Tankfüllung - SEQUENZIELL
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-05-11T14:00:00Z'), // Überlappung mit Peter (realistisch!)
        abreise: new Date('2024-05-13T10:00:00Z'),
        zaehlerAnkunft: 1355.0, // Parallel zu Peter, aber andere Zeitspanne
        zaehlerAbreise: 1370.0,
        userId: anna.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-06-20T15:00:00Z'),
        abreise: new Date('2024-06-22T11:00:00Z'),
        zaehlerAnkunft: 1370.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 1385.0,
        userId: anna.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-08-25T16:00:00Z'),
        abreise: new Date('2024-08-27T12:00:00Z'),
        zaehlerAnkunft: 1385.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 1400.0,
        userId: anna.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 0,
      },
    }),
    prisma.aufenthalt.create({
      data: {
        ankunft: new Date('2024-11-30T14:00:00Z'),
        abreise: new Date('2024-12-02T10:00:00Z'),
        zaehlerAnkunft: 1400.0, // Nach vorherigem Aufenthalt
        zaehlerAbreise: 1415.0,
        userId: anna.id,
        jahr: 2024,
        anzahlMitglieder: 1,
        anzahlGaeste: 2,
      },
    }),
  ]);

  console.log('✅ Aufenthalte erstellt:', {
    aufenthalte2022,
    aufenthalte2023,
    aufenthalte2024_vor_tanken,
    aufenthalte2024_nach_tanken
  });

  // 5. Jahresabschlüsse erstellen
  const jahresAbschluss2022 = await prisma.jahresAbschluss.create({
    data: {
      jahr: 2022,
      zaehlerstand: 820, // Höchster Zählerstand des Jahres
      gesamtKosten: 299.75,
      anzahlAufenthalte: 8,
      verbrauchProStunde: 5.5, // Fallback
    },
  });

  const jahresAbschluss2023 = await prisma.jahresAbschluss.create({
    data: {
      jahr: 2023,
      zaehlerstand: 905, // Höchster Zählerstand des Jahres
      gesamtKosten: 469.87,
      anzahlAufenthalte: 12,
      verbrauchProStunde: 5.5, // Fallback
    },
  });

  const jahresAbschluss2024 = await prisma.jahresAbschluss.create({
    data: {
      jahr: 2024,
      zaehlerstand: 1415, // Höchster Zählerstand des Jahres
      gesamtKosten: 311.12,
      anzahlAufenthalte: 20,
      verbrauchProStunde: 5.5, // Fallback
    },
  });

  console.log('✅ Jahresabschlüsse erstellt:', {
    jahresAbschluss2022,
    jahresAbschluss2023,
    jahresAbschluss2024
  });

  console.log('🎉 Datenbank-Seeding erfolgreich abgeschlossen!');
  console.log('');
  console.log('📊 KORREKTE SZENARIEN:');
  console.log('A) 2022 VOR Tanken: Aufenthalte bei Zählerstand 750-815 → Fallback 5.5 L/h');
  console.log('B) März 2022: Erste Tankfüllung bei Zählerstand 800 (250L zu €1.05/L)');
  console.log('C) 2023: Aufenthalte bei Zählerstand 820-905 → Fallback 5.5 L/h (nur 1 Tankfüllung)');
  console.log('D) April 2024: Zweite Tankfüllung bei Zählerstand 1350 (280L zu €1.35/L)');
  console.log('   → Berechnung: 280L ÷ (1350-800) Stunden = 0.51 L/h neuer Verbrauch!');
  console.log('E) 2024 NACH Tanken: Aufenthalte mit neuem Verbrauchswert 0.51 L/h');
  console.log('');
  console.log('🔑 WICHTIG: Jede Person hat SEQUENZIELLE, nicht-überlappende Zählerstände!');
  console.log('✅ Überlappungen nur zwischen verschiedenen Personen (realistisch)');
  console.log('❌ KEINE Überlappungen einer Person mit sich selbst (unmöglich)');
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
