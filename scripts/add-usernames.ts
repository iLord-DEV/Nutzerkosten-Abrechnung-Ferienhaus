import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Füge Usernamen zu bestehenden Benutzern hinzu...\n');

  // Username-Mapping basierend auf E-Mails
  const usernameMapping = {
    'post@christoph-heim.de': 'christoph',
    'usheim@t-online.de': 'ulrich',
    'markus.wilson-zwilling@gmx.de': 'markus',
    'okatomi.wilson@googlemail.com': 'andreas',
    'mail@tanzinbewegung.de': 'astrid',
    'andra.heim@gmx.de': 'alexandra',
  };

  for (const [email, username] of Object.entries(usernameMapping)) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        await prisma.user.update({
          where: { email },
          data: { username },
        });
        console.log(`✅ ${user.name}: username = '${username}'`);
      } else {
        console.log(`⚠️  User mit E-Mail ${email} nicht gefunden`);
      }
    } catch (error) {
      console.error(`❌ Fehler bei ${email}:`, error);
    }
  }

  console.log('\n🎉 Fertig!');
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
