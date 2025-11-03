/**
 * Datenbank-Bereinigung: Fehlerhafte Aufenthalte löschen
 *
 * Dieses Script identifiziert und löscht:
 * 1. Aufenthalte ohne existierenden User (orphaned records)
 * 2. Aufenthalte mit fehlerhaften Zählerständen (zaehlerAbreise <= zaehlerAnkunft)
 *
 * WARNUNG: Dieses Script löscht Daten permanent!
 *
 * Ausführung:
 * npx tsx scripts/cleanup-aufenthalte.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Starte Datenbank-Bereinigung...\n');

  // 1. Fehlerhafte Zählerstände identifizieren
  console.log('📋 Suche nach Aufenthalten mit fehlerhaften Zählerständen...');
  const fehlerhafteZaehler = await prisma.aufenthalt.findMany({
    where: {
      zaehlerAbreise: {
        lte: prisma.aufenthalt.fields.zaehlerAnkunft as any // Prisma unterstützt keinen direkten Field-Vergleich
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  // Alternative: Raw SQL für Field-Vergleich
  const fehlerhafteZaehlerRaw: any[] = await prisma.$queryRaw`
    SELECT
      a.id,
      a.userId,
      a.zaehlerAnkunft,
      a.zaehlerAbreise,
      u.name as userName,
      u.email as userEmail
    FROM Aufenthalt a
    LEFT JOIN User u ON a.userId = u.id
    WHERE a.zaehlerAbreise <= a.zaehlerAnkunft
  `;

  console.log(`\n⚠️ Gefundene Aufenthalte mit fehlerhaften Zählerständen: ${fehlerhafteZaehlerRaw.length}`);

  if (fehlerhafteZaehlerRaw.length > 0) {
    console.log('\nDetails:');
    fehlerhafteZaehlerRaw.forEach(a => {
      console.log(`  - ID ${a.id}: ${a.userName || 'KEIN USER'} (${a.zaehlerAnkunft}h → ${a.zaehlerAbreise}h)`);
    });
  }

  // 2. Orphaned Records identifizieren (Aufenthalte ohne User)
  console.log('\n📋 Suche nach Aufenthalten ohne User...');
  const orphanedRecords: any[] = await prisma.$queryRaw`
    SELECT
      a.id,
      a.userId,
      a.ankunft,
      a.abreise,
      a.zaehlerAnkunft,
      a.zaehlerAbreise
    FROM Aufenthalt a
    LEFT JOIN User u ON a.userId = u.id
    WHERE u.id IS NULL
  `;

  console.log(`\n⚠️ Gefundene Aufenthalte ohne User: ${orphanedRecords.length}`);

  if (orphanedRecords.length > 0) {
    console.log('\nDetails:');
    orphanedRecords.forEach(a => {
      console.log(`  - ID ${a.id}: UserID ${a.userId} (existiert nicht) - ${a.zaehlerAnkunft}h → ${a.zaehlerAbreise}h`);
    });
  }

  // 3. Zusammenfassung
  const gesamtZuLoeschen = fehlerhafteZaehlerRaw.length + orphanedRecords.length;

  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   - Fehlerhafte Zählerstände: ${fehlerhafteZaehlerRaw.length}`);
  console.log(`   - Orphaned Records: ${orphanedRecords.length}`);
  console.log(`   - Gesamt zu löschen: ${gesamtZuLoeschen}\n`);

  if (gesamtZuLoeschen === 0) {
    console.log('✅ Keine fehlerhaften Daten gefunden!');
    return;
  }

  // 4. Bestätigung einholen
  console.log('⚠️  WARNUNG: Die folgenden Operationen löschen Daten PERMANENT!\n');
  console.log('Möchten Sie fortfahren? (Bitte Code anpassen und DRY_RUN auf false setzen)\n');

  const DRY_RUN = true; // Auf false setzen um tatsächlich zu löschen

  if (DRY_RUN) {
    console.log('🔒 DRY_RUN Modus - keine Daten werden gelöscht');
    console.log('💡 Setze DRY_RUN auf false um die Bereinigung durchzuführen');
    return;
  }

  // 5. Löschen
  console.log('\n🗑️  Starte Bereinigung...\n');

  // Fehlerhafte Zählerstände löschen
  if (fehlerhafteZaehlerRaw.length > 0) {
    const ids = fehlerhafteZaehlerRaw.map(a => a.id);
    const deleted = await prisma.aufenthalt.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });
    console.log(`✅ ${deleted.count} Aufenthalte mit fehlerhaften Zählerständen gelöscht`);
  }

  // Orphaned Records löschen
  if (orphanedRecords.length > 0) {
    const ids = orphanedRecords.map(a => a.id);
    const deleted = await prisma.aufenthalt.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });
    console.log(`✅ ${deleted.count} Orphaned Records gelöscht`);
  }

  console.log('\n✅ Bereinigung abgeschlossen!');
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
