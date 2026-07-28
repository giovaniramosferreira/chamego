// Lembretes que saem do app: sem isso o Chamego só funciona se a pessoa
// lembrar de abrir o Chamego. Dois envios, ambos idempotentes:
//   • véspera (a partir das 18h): a agenda de amanhã
//   • domingo (a partir das 19h): o resumo da semana
// Roda no próprio processo (volume baixo não justifica worker separado) e
// só quando há SMTP configurado.
import { db } from './db.js';
import { sendEventReminder, sendWeeklyDigest } from './mailer.js';

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

const localDate = (d = new Date()) => d.toLocaleDateString('en-CA');
const tomorrowISO = () => localDate(new Date(Date.now() + 86_400_000));

export function smtpConfigured() {
  return !!((process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD));
}

export async function runNotifications(now = new Date()) {
  const base = process.env.PUBLIC_URL || 'http://localhost:3001';
  const hour = now.getHours();
  const sent = { eventEve: 0, weekly: 0 };

  for (const couple of db.allCouples()) {
    const emails = couple.members.map((m) => m.email).filter(Boolean);
    if (!emails.length) continue;
    const prefs = db.reminderPrefs(couple.id);

    // Véspera: manda uma vez por dia-alvo, mesmo que o processo reinicie.
    if (prefs.email?.eventEve && hour >= 18) {
      const date = tomorrowISO();
      const events = db.eventsOnDate(couple.id, date);
      if (events.length && !db.wasNotified(couple.id, 'event-eve', date)) {
        db.markNotified(couple.id, 'event-eve', date);
        for (const to of emails) {
          await sendEventReminder({ to, coupleName: couple.name, events, url: `${base}/app/agenda` });
        }
        sent.eventEve++;
      }
    }

    // Resumo: domingo à noite, uma vez por semana.
    if (prefs.email?.weekly && now.getDay() === 0 && hour >= 19) {
      const key = localDate(now);
      if (!db.wasNotified(couple.id, 'weekly', key)) {
        const report = db.weeklyReport(couple.id, 0);
        db.markNotified(couple.id, 'weekly', key);
        for (const to of emails) {
          await sendWeeklyDigest({ to, coupleName: couple.name, report, url: `${base}/app/resumo` });
        }
        sent.weekly++;
      }
    }
  }
  return sent;
}

export function startNotifier() {
  if (!smtpConfigured()) {
    console.log('[notifier] SMTP ausente — lembretes por email desligados');
    return null;
  }
  const tick = () => runNotifications().catch((e) => console.error('[notifier]', e));
  tick();
  const timer = setInterval(tick, CHECK_INTERVAL_MS);
  timer.unref?.();
  return timer;
}
