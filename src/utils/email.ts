import nodemailer from 'nodemailer';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const APP_URL = process.env.APP_URL || 'http://localhost:4321';

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
 * Basis-Email-Template
 */
function wrapInTemplate(title: string, content: string): string {
  return `
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
          .info-box { background: #e0f2fe; border-left: 4px solid #0ea5e9; padding: 12px; margin: 15px 0; }
          .quote { background: #f3f4f6; border-left: 4px solid #6b7280; padding: 12px; margin: 15px 0; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Wüstenstein Nutzerkosten-Abrechnung</p>
            <p>Diese Email wurde automatisch generiert.</p>
            <p style="font-size: 10px; color: #999;">
              <a href="${APP_URL}/profil">Email-Benachrichtigungen verwalten</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generische Email-Versand-Funktion
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<void> {
  if (IS_PRODUCTION && transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@wuestenstein.de',
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });
    console.log(`📧 Email gesendet an: ${to} - ${subject}`);
  } else {
    console.log('\n' + '='.repeat(80));
    console.log('📧 DEVELOPMENT MODE - Email (würde gesendet werden)');
    console.log('='.repeat(80));
    console.log(`An: ${to}`);
    console.log(`Betreff: ${subject}`);
    console.log('\n--- EMAIL-INHALT ---\n');
    console.log(textContent);
    console.log('='.repeat(80) + '\n');
  }
}

/**
 * Sendet Email bei neuem Kommentar zur Terminplanung
 */
export async function sendNewCommentEmail(
  to: string,
  recipientName: string,
  authorName: string,
  terminTitel: string,
  terminId: number,
  kommentarInhalt: string
): Promise<void> {
  const terminUrl = `${APP_URL}/terminplanung/${terminId}`;

  const htmlContent = wrapInTemplate(
    '💬 Neuer Kommentar',
    `
      <p>Hallo ${recipientName},</p>
      <p><strong>${authorName}</strong> hat einen neuen Kommentar zum Termin geschrieben:</p>
      <div class="info-box">
        <strong>📅 ${terminTitel}</strong>
      </div>
      <div class="quote">
        ${kommentarInhalt}
      </div>
      <div style="text-align: center;">
        <a href="${terminUrl}" class="button">Termin ansehen</a>
      </div>
    `
  );

  const textContent = `
Hallo ${recipientName},

${authorName} hat einen neuen Kommentar zum Termin "${terminTitel}" geschrieben:

"${kommentarInhalt}"

Termin ansehen: ${terminUrl}

---
Diese Benachrichtigung können Sie in Ihrem Profil deaktivieren: ${APP_URL}/profil
  `.trim();

  await sendEmail(to, `💬 Neuer Kommentar zu "${terminTitel}"`, htmlContent, textContent);
}

/**
 * Sendet Email bei neuem Termin
 */
export async function sendNewTerminEmail(
  to: string,
  recipientName: string,
  authorName: string,
  terminTitel: string,
  terminId: number,
  startDatum: Date,
  endDatum: Date,
  beschreibung?: string
): Promise<void> {
  const terminUrl = `${APP_URL}/terminplanung/${terminId}`;
  const formatDate = (d: Date) => d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const htmlContent = wrapInTemplate(
    '📅 Neuer Termin',
    `
      <p>Hallo ${recipientName},</p>
      <p><strong>${authorName}</strong> hat einen neuen Termin erstellt:</p>
      <div class="info-box">
        <strong>${terminTitel}</strong><br>
        📆 ${formatDate(startDatum)} - ${formatDate(endDatum)}
        ${beschreibung ? `<br><br>${beschreibung}` : ''}
      </div>
      <p>Bitte stimme ab, ob der Termin für dich passt.</p>
      <div style="text-align: center;">
        <a href="${terminUrl}" class="button">Zur Abstimmung</a>
      </div>
    `
  );

  const textContent = `
Hallo ${recipientName},

${authorName} hat einen neuen Termin erstellt:

${terminTitel}
${formatDate(startDatum)} - ${formatDate(endDatum)}
${beschreibung ? `\n${beschreibung}\n` : ''}

Bitte stimme ab, ob der Termin für dich passt: ${terminUrl}

---
Diese Benachrichtigung können Sie in Ihrem Profil deaktivieren: ${APP_URL}/profil
  `.trim();

  await sendEmail(to, `📅 Neuer Termin: ${terminTitel}`, htmlContent, textContent);
}

/**
 * Sendet Jahresabschluss-Email mit Kostenübersicht
 */
export async function sendJahresabschlussEmail(
  to: string,
  recipientName: string,
  jahr: number,
  statistiken: {
    gesamtKosten: number;
    oelKosten: number;
    uebernachtungKosten: number;
    anzahlAufenthalte: number;
    gesamtTage: number;
    gesamtVerbrauch: number;
  }
): Promise<void> {
  const formatCurrency = (n: number) => n.toFixed(2).replace('.', ',') + ' €';
  const formatNumber = (n: number) => n.toFixed(1).replace('.', ',');

  const htmlContent = wrapInTemplate(
    `📊 Jahresabschluss ${jahr}`,
    `
      <p>Hallo ${recipientName},</p>
      <p>Hier ist deine Kostenübersicht für das Jahr <strong>${jahr}</strong>:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f3f4f6;">
          <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Ölkosten</strong></td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(statistiken.oelKosten)}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Übernachtungskosten</strong></td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(statistiken.uebernachtungKosten)}</td>
        </tr>
        <tr style="background: #dbeafe; font-weight: bold;">
          <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Gesamtkosten</strong></td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-size: 1.2em;">${formatCurrency(statistiken.gesamtKosten)}</td>
        </tr>
      </table>

      <div class="info-box">
        <strong>Deine Nutzung in ${jahr}:</strong><br>
        📅 ${statistiken.anzahlAufenthalte} Aufenthalt${statistiken.anzahlAufenthalte !== 1 ? 'e' : ''}<br>
        🌙 ${statistiken.gesamtTage} Tag${statistiken.gesamtTage !== 1 ? 'e' : ''}<br>
        🛢️ ${formatNumber(statistiken.gesamtVerbrauch)} Liter Heizöl
      </div>

      <p style="margin-top: 20px;">
        Bitte überweise den Betrag auf das bekannte Konto mit dem Verwendungszweck:<br>
        <strong>"Wüstenstein ${jahr} - ${recipientName}"</strong>
      </p>

      <div style="text-align: center; margin-top: 20px;">
        <a href="${APP_URL}/statistiken" class="button">Zur Detailübersicht</a>
      </div>
    `
  );

  const textContent = `
Hallo ${recipientName},

Hier ist deine Kostenübersicht für das Jahr ${jahr}:

KOSTENÜBERSICHT
===============
Ölkosten:              ${formatCurrency(statistiken.oelKosten)}
Übernachtungskosten:   ${formatCurrency(statistiken.uebernachtungKosten)}
-------------------------------
GESAMTKOSTEN:          ${formatCurrency(statistiken.gesamtKosten)}

DEINE NUTZUNG IN ${jahr}
========================
Aufenthalte: ${statistiken.anzahlAufenthalte}
Tage: ${statistiken.gesamtTage}
Heizölverbrauch: ${formatNumber(statistiken.gesamtVerbrauch)} Liter

Bitte überweise den Betrag auf das bekannte Konto mit dem Verwendungszweck:
"Wüstenstein ${jahr} - ${recipientName}"

Detailübersicht: ${APP_URL}/statistiken
  `.trim();

  await sendEmail(
    to,
    `📊 Deine Wüstenstein-Abrechnung für ${jahr}: ${formatCurrency(statistiken.gesamtKosten)}`,
    htmlContent,
    textContent
  );
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
