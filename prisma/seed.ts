import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Datenbank-Seeding...');

  // Alle bestehenden Daten löschen (in korrekter Reihenfolge wegen Foreign Keys)
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

  // 1. Echte Benutzer erstellen
  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const hashedUserPassword = await bcrypt.hash('user123', 10);

  const christoph = await prisma.user.create({
    data: {
      email: 'post@christoph-heim.de',
      name: 'Christoph Heim',
      role: 'ADMIN',
      password: hashedAdminPassword,
    },
  });

  const ulrich = await prisma.user.create({
    data: {
      email: 'usheim@t-online.de',
      name: 'Ulrich Heim',
      role: 'USER',
      password: hashedUserPassword,
    },
  });

  const markus = await prisma.user.create({
    data: {
      email: 'markus.wilson-zwilling@gmx.de',
      name: 'Markus Wilson-Zwilling',
      role: 'USER',
      password: hashedUserPassword,
    },
  });

  const andreas = await prisma.user.create({
    data: {
      email: 'okatomi.wilson@googlemail.com',
      name: 'Andreas Wilson',
      role: 'USER',
      password: hashedUserPassword,
    },
  });

  const astrid = await prisma.user.create({
    data: {
      email: 'mail@tanzinbewegung.de',
      name: 'Astrid Tiedemann',
      role: 'USER',
      password: hashedUserPassword,
    },
  });

  const alexandra = await prisma.user.create({
    data: {
      email: 'andra.heim@gmx.de',
      name: 'Alexandra Heim',
      role: 'USER',
      password: hashedUserPassword,
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
  console.log('🔑 LOGIN-DATEN:');
  console.log('Admin: post@christoph-heim.de');
  console.log('User: usheim@t-online.de, markus.wilson-zwilling@gmx.de, okatomi.wilson@googlemail.com, mail@tanzinbewegung.de, andra.heim@gmx.de');
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