import crypto from 'crypto';

const MP = 'https://api.mercadopago.com';
const headers = () => ({
  Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
});

export const PRICE = 19.9;

// Desconto configurável via env DISCOUNT_PERCENT (inteiro 0–100).
// Mudar a env no Render altera preço exibido e cobrado, sem deploy.
export function getPricing() {
  let desconto = parseInt(process.env.DISCOUNT_PERCENT || '0', 10);
  if (isNaN(desconto) || desconto < 0) desconto = 0;
  if (desconto > 100) desconto = 100;
  const precoFinal = Math.round(PRICE * (100 - desconto)) / 100;
  return { precoCheio: PRICE, descontoPercent: desconto, precoFinal };
}

export async function createPixPayment({ slug, email }) {
  const res = await fetch(`${MP}/v1/payments`, {
    method: 'POST',
    headers: { ...headers(), 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      transaction_amount: getPricing().precoFinal,
      payment_method_id: 'pix',
      description: `Chamego — Página do Casal (${slug})`,
      external_reference: slug,
      payer: { email: email || 'pagador@chamego.app' },
      notification_url: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/api/webhooks/mercadopago` : undefined,
    }),
  });
  if (!res.ok) throw new Error(`MP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getPayment(id) {
  const res = await fetch(`${MP}/v1/payments/${id}`, { headers: headers() });
  if (!res.ok) throw new Error(`MP ${res.status}`);
  return res.json();
}
