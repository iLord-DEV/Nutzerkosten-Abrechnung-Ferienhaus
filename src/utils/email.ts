import nodemailer from 'nodemailer';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// SMTP-Transporter (nur in Production)
let transporter: nodemailer.Transporter | null = null;

if (IS_PRODUCTION) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sendet einen Magic-Link per Email
 * - In Development: Loggt Link in Console
 * - In Production: Sendet Email via SMTP
 *
 * @param to - Empfänger Email-Adresse
 * @param userName - Name des Users
 * @param magicLink - Der vollständige Magic-Link
 * @param expiresAt - Ablaufzeit des Links
 */
export async function sendMagicLinkEmail(
  to: string,
  userName: string,
  magicLink: string,
  expiresAt: Date
): Promise<void> {
  const expiryMinutes = Math.round((expiresAt.getTime() - Date.now()) / 60000);

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 Wüstenstein - Anmeldung</h1>
          </div>
          <div class="content">
            <p>Hallo ${userName},</p>
            <p>Sie haben eine Anmeldung bei der Nutzerkosten-Abrechnung angefordert.</p>
            <p>Klicken Sie auf den folgenden Button, um sich anzumelden:</p>
            <div style="text-align: center;">
              <a href="${magicLink}" class="button">Jetzt anmelden</a>
            </div>
            <div class="warning">
              <strong>⚠️ Wichtig:</strong>
              <ul>
                <li>Dieser Link ist nur ${expiryMinutes} Minuten gültig</li>
                <li>Der Link kann nur einmal verwendet werden</li>
                <li>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese Email</li>
              </ul>
            </div>
            <p style="font-size: 12px; color: #666;">
              Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
              <a href="${magicLink}">${magicLink}</a>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Wüstenstein Nutzerkosten-Abrechnung</p>
            <p>Diese Email wurde automatisch generiert.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const emailText = `
Hallo ${userName},

Sie haben eine Anmeldung bei der Nutzerkosten-Abrechnung angefordert.

Klicken Sie auf den folgenden Link, um sich anzumelden:
${magicLink}

WICHTIG:
- Dieser Link ist nur ${expiryMinutes} Minuten gültig
- Der Link kann nur einmal verwendet werden
- Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese Email

Mit freundlichen Grüßen,
Wüstenstein Nutzerkosten-Abrechnung
  `;

  if (IS_PRODUCTION && transporter) {
    // PRODUCTION: Email via SMTP senden
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@wuestenstein.de',
      to,
      subject: `🔐 Ihr Anmelde-Link für Wüstenstein (${expiryMinutes} Min. gültig)`,
      text: emailText,
      html: emailHtml,
    });
    console.log(`📧 Magic-Link Email gesendet an: ${to}`);
  } else {
    // DEVELOPMENT: In Console loggen
    console.log('\n' + '='.repeat(80));
    console.log('📧 DEVELOPMENT MODE - Magic-Link Email (würde gesendet werden)');
    console.log('='.repeat(80));
    console.log(`An: ${to}`);
    console.log(`Betreff: 🔐 Ihr Anmelde-Link für Wüstenstein (${expiryMinutes} Min. gültig)`);
    console.log('\n--- EMAIL-INHALT ---\n');
    console.log(emailText);
    console.log('\n--- MAGIC-LINK ---');
    console.log(`🔗 ${magicLink}`);
    console.log('='.repeat(80) + '\n');
  }
}
