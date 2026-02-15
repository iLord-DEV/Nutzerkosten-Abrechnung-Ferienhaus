// Wrapper around Astro's server entry that registers cron jobs in production.
// Usage: NODE_ENV=production node server.mjs

import './dist/server/entry.mjs';

if (process.env.NODE_ENV === 'production') {
  const { schedule } = await import('node-cron');

  const cronToken = process.env.CRON_ADMIN_TOKEN;
  const port = process.env.PORT || 3002;
  const baseUrl = `http://localhost:${port}`;

  if (!cronToken) {
    console.warn('[cron] CRON_ADMIN_TOKEN is not set — Jahresabschluss cron job will fail to authenticate!');
  }

  // Send yearly cost summary emails on February 1st at 09:00 Europe/Berlin
  schedule('0 9 1 2 *', async () => {
    const vorjahr = new Date().getFullYear() - 1;
    console.log(`[cron] Jahresabschluss: sending emails for year ${vorjahr}...`);

    try {
      const res = await fetch(`${baseUrl}/api/admin/send-jahresabschluss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cron-Token': cronToken || '',
        },
        body: JSON.stringify({ jahr: vorjahr }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log(`[cron] Jahresabschluss ${vorjahr}: ${data.gesendet} sent, ${data.fehlgeschlagen} failed, ${data.uebersprungen} skipped`);
      } else {
        console.error(`[cron] Jahresabschluss ${vorjahr}: API error ${res.status}`, data);
      }
    } catch (err) {
      console.error(`[cron] Jahresabschluss ${vorjahr}: request failed`, err);
    }
  }, {
    timezone: 'Europe/Berlin',
  });

  console.log('[cron] Jahresabschluss scheduled: 09:00 on February 1st (Europe/Berlin)');
}
