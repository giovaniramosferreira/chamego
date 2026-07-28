import nodemailer from 'nodemailer';

// Envio por SMTP. Prioridade: SMTP genérico (Resend, domínio próprio, etc.)
// via SMTP_HOST/PORT/USER/PASS; senão cai no Gmail legado
// (GMAIL_USER + GMAIL_APP_PASSWORD). Sem nenhuma credencial o link é logado
// no console — modo dev/teste, nada quebra.
function transporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 465;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS implícito; 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return null;
}

// Remetente exibido. MAIL_FROM vence; senão usa o Gmail legado; senão um
// padrão no domínio próprio.
function fromAddress() {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM;
  if (process.env.GMAIL_USER) return `"Chamego" <${process.env.GMAIL_USER}>`;
  return '"Chamego" <ola@chamego.online>';
}

// Molde único de email da marca: título, corpo e (opcional) botão.
function layout({ title, body, cta, footer = 'Você recebe este email porque tem um espaço no Chamego. Dá pra desligar os avisos nas Configurações.' }) {
  return `
  <div style="background:#FAF7F2;padding:40px 16px;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:440px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:40px 32px;text-align:center;border:1px solid rgba(26,23,20,0.08);">
      <p style="font-style:italic;font-size:26px;color:#7B2D43;margin:0 0 8px;">Chamego</p>
      <h1 style="font-size:22px;color:#1A1714;font-weight:normal;margin:0 0 16px;">${title}</h1>
      <div style="font-size:15px;color:#5C554D;line-height:1.6;margin:0 0 28px;">${body}</div>
      ${cta ? `<a href="${cta.href}" style="display:inline-block;background:#7B2D43;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:16px;">${cta.label}</a>` : ''}
      <p style="font-size:12px;color:#A39B90;margin:28px 0 0;line-height:1.5;">${footer}</p>
    </div>
    <p style="text-align:center;font-size:11px;color:#A39B90;margin:24px 0 0;">© 2026 Chamego</p>
  </div>`;
}

// Sem SMTP configurado nada quebra: o email vira log (modo dev).
async function send({ to, subject, text, html }) {
  const t = transporter();
  if (!t) {
    console.log(`[mailer] SMTP não configurado — email para ${to}: ${subject} — ${text}`);
    return false;
  }
  await t.sendMail({ from: fromAddress(), to, subject, text, html });
  return true;
}

export async function sendMagicLink(email, link) {
  return send({
    to: email,
    subject: 'Seu link de acesso ao Chamego 💌',
    text: `Entre no Chamego pelo link (vale 15 minutos, uso único): ${link}`,
    html: layout({
      title: 'Seu link de acesso 💌',
      body: 'Clique no botão abaixo para entrar no espaço de vocês. O link vale por 15 minutos e só funciona uma vez.',
      cta: { href: link, label: 'Entrar no Chamego' },
      footer: 'Se você não pediu este email, pode ignorá-lo com carinho.',
    }),
  });
}

export async function sendInvite({ to, fromName, coupleName, url, code }) {
  return send({
    to,
    subject: `${fromName} te convidou pro espaço de vocês no Chamego 💛`,
    text: `${fromName} criou o espaço "${coupleName}" no Chamego e quer você lá. Entre por ${url} (ou use o código ${code}).`,
    html: layout({
      title: `${fromName} te convidou 💛`,
      body: `Um espaço privado só de vocês dois — agenda, listas e memórias no mesmo lugar.<br><br>Espaço: <strong>${coupleName}</strong><br>Código de pareamento: <strong>${code}</strong>`,
      cta: { href: url, label: 'Aceitar convite' },
      footer: 'Se você não esperava este convite, é só ignorar.',
    }),
  });
}

export async function sendPartnerJoined({ to, partnerName, coupleName, url }) {
  return send({
    to,
    subject: `${partnerName} entrou no espaço de vocês 💛`,
    text: `${partnerName} aceitou seu convite e já está em "${coupleName}". Abra o Chamego: ${url}`,
    html: layout({
      title: `${partnerName} entrou 💛`,
      body: `Agora o espaço <strong>${coupleName}</strong> é dos dois: chat, check-in e tudo o mais já estão liberados.`,
      cta: { href: url, label: 'Abrir o Chamego' },
    }),
  });
}

export async function sendEventReminder({ to, coupleName, events, url }) {
  const lines = events.map((e) => `• ${e.time ? `${e.time} — ` : ''}${e.title}${e.location ? ` (${e.location})` : ''}`);
  return send({
    to,
    subject: events.length === 1 ? `Amanhã: ${events[0].title}` : `Amanhã vocês têm ${events.length} compromissos`,
    text: `Agenda de amanhã em ${coupleName}:\n${lines.join('\n')}\n\n${url}`,
    html: layout({
      title: 'A agenda de amanhã 📅',
      body: lines.map((l) => `<div style="margin:4px 0;">${l}</div>`).join(''),
      cta: { href: url, label: 'Ver na agenda' },
    }),
  });
}

export async function sendWeeklyDigest({ to, coupleName, report, url }) {
  const highlights = (report.highlights || []).map((h) => `• ${h.text}`);
  return send({
    to,
    subject: `A semana de vocês em ${coupleName} 💛`,
    text: `${highlights.join('\n')}\n\nEventos: ${report.events} · Momentos: ${report.moments} · Check-ins: ${report.checkins}\n\n${url}`,
    html: layout({
      title: 'A semana de vocês 💛',
      body: `${highlights.map((h) => `<div style="margin:4px 0;">${h}</div>`).join('')}
        <div style="margin-top:16px;color:#A39B90;font-size:13px;">${report.events} eventos · ${report.moments} momentos · ${report.checkins} check-ins</div>`,
      cta: { href: url, label: 'Ver o resumo completo' },
    }),
  });
}
