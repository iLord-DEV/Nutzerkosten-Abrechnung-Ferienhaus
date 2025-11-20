import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Datenbank-Seeding...');

  // Alle bestehenden Daten löschen (in korrekter Reihenfolge wegen Foreign Keys)
  await prisma.magicLinkToken.deleteMany();
  await prisma.jahresAbschluss.deleteMany();
  await prisma.aufenthalt.deleteMany();
  await prisma.tankfuellung.deleteMany();
  await prisma.zaehler.deleteMany();
  await prisma.preise.deleteMany();
  // Alle Termin-bezogenen Tabellen löschen
  await prisma.terminKommentar.deleteMany();
  await prisma.terminAenderung.deleteMany();
  await prisma.terminAbstimmung.deleteMany();
  await prisma.terminPlanung.deleteMany();
  // User zuletzt löschen wegen Foreign Key Constraints
  await prisma.user.deleteMany();

  // 1. Echte Benutzer erstellen (ohne Passwort, mit Magic-Link-Login)
  const christoph = await prisma.user.create({
    data: {
      email: 'post@christoph-heim.de',
      username: 'christoph',
      name: 'Christoph Heim',
      role: 'ADMIN',
    },
  });

  const ulrich = await prisma.user.create({
    data: {
      email: 'usheim@t-online.de',
      username: 'ulrich',
      name: 'Ulrich Heim',
      role: 'USER',
    },
  });

  const markus = await prisma.user.create({
    data: {
      email: 'markus.wilson-zwilling@gmx.de',
      username: 'markus',
      name: 'Markus Wilson-Zwilling',
      role: 'USER',
    },
  });

  const andreas = await prisma.user.create({
    data: {
      email: 'okatomi.wilson@googlemail.com',
      username: 'andreas',
      name: 'Andreas Wilson',
      role: 'USER',
    },
  });

  const astrid = await prisma.user.create({
    data: {
      email: 'mail@tanzinbewegung.de',
      username: 'astrid',
      name: 'Astrid Tiedemann',
      role: 'USER',
    },
  });

  const alexandra = await prisma.user.create({
    data: {
      email: 'andra.heim@gmx.de',
      username: 'alexandra',
      name: 'Alexandra Heim',
      role: 'USER',
    },
  });

  console.log('✅ Benutzer erstellt:', { christoph, ulrich, markus, andreas, astrid, alexandra });

  // 2. Keinen Zähler erstellen - wird über die Anwendung eingegeben
  console.log('✅ Keinen Zähler erstellt - wird über die Anwendung eingegeben');

  // 3. Keine Preise erstellen - Fallback-Werte werden im Code verwendet
  console.log('✅ Keine Preise erstellt - Fallback-Werte werden im Code verwendet');

  console.log('🎉 Datenbank-Seeding erfolgreich abgeschlossen!');
  console.log('');
  console.log('📊 ERSTELLT:');
  console.log('✅ 6 echte Benutzer (1 Admin, 5 User)');
  console.log('');
  console.log('🚫 NICHT ERSTELLT (für echte Daten):');
  console.log('❌ Keine Zähler (wird über Anwendung eingegeben)');
  console.log('❌ Keine Preise (Fallback-Werte im Code)');
  console.log('❌ Keine Test-Aufenthalte');
  console.log('❌ Keine Test-Tankfüllungen');
  console.log('❌ Keine Test-Zählerwechsel');
  console.log('❌ Keine Test-Jahresabschlüsse');
  console.log('');
  console.log('🔑 LOGIN (Magic-Link):');
  console.log('Admin: post@christoph-heim.de oder username: christoph');
  console.log('User: usheim@t-online.de (ulrich), markus.wilson-zwilling@gmx.de (markus), etc.');
  console.log('');
  console.log('✨ Magic-Link-Login:');
  console.log('1. E-Mail oder Username eingeben');
  console.log('2. Magic-Link wird in Console geloggt (Development-Mode)');
  console.log('3. Link im Browser öffnen → automatischer Login');
  console.log('');
  console.log('💡 NÄCHSTE SCHRITTE:');
  console.log('1. Zähler über die Admin-Oberfläche anlegen');
  console.log('2. Preise über die Admin-Oberfläche konfigurieren (oder Fallback-Werte im Code verwenden)');
  console.log('3. Echte Aufenthalte über die Anwendung erfassen');
  console.log('4. Echte Tankfüllungen über die Anwendung erfassen');
  console.log('5. Zählerwechsel bei Bedarf über die Anwendung erfassen');
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });