import nodemailer from 'nodemailer';

// Envio via Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD). Sem credenciais o
// link é logado no console — modo dev/teste, nada quebra.
function transporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

function magicLinkHtml(link) {
  return `
  <div style="background:#FAF7F2;padding:40px 16px;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:440px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:40px 32px;text-align:center;border:1px solid rgba(26,23,20,0.08);">
      <p style="font-style:italic;font-size:26px;color:#7B2D43;margin:0 0 8px;">Chamego</p>
      <h1 style="font-size:22px;color:#1A1714;font-weight:normal;margin:0 0 16px;">Seu link de acesso 💌</h1>
      <p style="font-size:15px;color:#5C554D;line-height:1.6;margin:0 0 28px;">
        Clique no botão abaixo para entrar e gerenciar a página de vocês.
        O link vale por 15 minutos e só funciona uma vez.
      </p>
      <a href="${link}"
         style="display:inline-block;background:#7B2D43;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:16px;">
        Entrar no Chamego
      </a>
      <p style="font-size:12px;color:#A39B90;margin:28px 0 0;line-height:1.5;">
        Se você não pediu este email, pode ignorá-lo com carinho.
      </p>
    </div>
    <p style="text-align:center;font-size:11px;color:#A39B90;margin:24px 0 0;">© 2026 Chamego</p>
  </div>`;
}

export async function sendMagicLink(email, link) {
  const t = transporter();
  if (!t) {
    console.log(`[mailer] GMAIL_USER/GMAIL_APP_PASSWORD ausentes — link mágico para ${email}: ${link}`);
    return;
  }
  await t.sendMail({
    from: `"Chamego" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Seu link de acesso ao Chamego 💌',
    text: `Entre no Chamego pelo link (vale 15 minutos, uso único): ${link}`,
    html: magicLinkHtml(link),
  });
}
