// Cobrança. Um provedor por vez, atrás desta fachada — hoje Stripe (cartão
// recorrente + Pix no anual). Trocar por Mercado Pago/Asaas significa
// reimplementar só as quatro funções exportadas aqui.
//
// Regra de ouro: o servidor nunca acredita no cliente sobre pagamento. Quem
// escreve o estado da assinatura é o webhook assinado (`handleWebhook`).
import Stripe from 'stripe';
import { db } from './db.js';

export const PLANS = {
  mensal: { id: 'mensal', label: 'Mensal', priceEnv: 'STRIPE_PRICE_MENSAL', amount: 'R$ 14,90/mês' },
  anual: { id: 'anual', label: 'Anual', priceEnv: 'STRIPE_PRICE_ANUAL', amount: 'R$ 89/ano' },
};

export const TRIAL_DAYS = 14;

// Presente: cobrança única, sem renovar. Cartão sempre; Pix quando habilitado
// (presente é compra avulsa — é onde o Pix brasileiro faz mais sentido).
export const GIFTS = {
  3: { months: 3, label: '3 meses', priceEnv: 'STRIPE_PRICE_PRESENTE_3M', amount: 'R$ 39' },
  6: { months: 6, label: '6 meses', priceEnv: 'STRIPE_PRICE_PRESENTE_6M', amount: 'R$ 69' },
  12: { months: 12, label: '1 ano', priceEnv: 'STRIPE_PRICE_PRESENTE_12M', amount: 'R$ 119' },
};

let cached = null;
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!cached) cached = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  return cached;
}

// Sem chave configurada o app roda inteiro — só não vende. A tela de plano
// mostra "em breve" em vez de quebrar.
export function billingEnabled() {
  return !!(process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_PRICE_MENSAL || process.env.STRIPE_PRICE_ANUAL));
}

export function availablePlans() {
  return Object.values(PLANS)
    .filter((p) => !!process.env[p.priceEnv])
    .map(({ id, label, amount }) => ({ id, label, amount }));
}

function baseUrl() {
  return process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
}

// Cria a sessão de checkout hospedada do Stripe. O couple_id vai nos metadados
// e é o que amarra o pagamento ao Espaço do Casal na volta do webhook.
export async function createCheckout({ coupleId, email, plan = 'mensal' }) {
  const s = stripe();
  const chosen = PLANS[plan] || PLANS.mensal;
  const price = process.env[chosen.priceEnv];
  if (!s || !price) throw Object.assign(new Error('Pagamento ainda não está configurado'), { status: 503 });

  const current = db.getSubscription(coupleId);
  // Pix só faz sentido no anual: cobrança única, sem renovação automática.
  const methods = chosen.id === 'anual' && process.env.STRIPE_PIX === '1'
    ? ['card', 'pix'] : ['card'];

  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    payment_method_types: methods,
    locale: 'pt-BR',
    customer: current.customer_id || undefined,
    customer_email: current.customer_id ? undefined : email,
    client_reference_id: String(coupleId),
    subscription_data: { metadata: { couple_id: String(coupleId) } },
    metadata: { couple_id: String(coupleId), plan: chosen.id },
    allow_promotion_codes: true,
    success_url: `${baseUrl()}/app/plano?checkout=ok`,
    cancel_url: `${baseUrl()}/app/plano?checkout=cancelado`,
  });
  return { url: session.url };
}

export function availableGifts() {
  return Object.values(GIFTS)
    .filter((g) => !!process.env[g.priceEnv])
    .map(({ months, label, amount }) => ({ months, label, amount }));
}

// Compra de presente: não exige conta. Quem paga informa o email no próprio
// checkout e recebe o código para entregar ao casal.
export async function createGiftCheckout({ months = 12, buyerName = '', message = '' } = {}) {
  const s = stripe();
  const chosen = GIFTS[months] || GIFTS[12];
  const price = process.env[chosen.priceEnv];
  if (!s || !price) throw Object.assign(new Error('Presente ainda não está disponível'), { status: 503 });

  const methods = process.env.STRIPE_PIX === '1' ? ['card', 'pix'] : ['card'];
  const session = await s.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price, quantity: 1 }],
    payment_method_types: methods,
    locale: 'pt-BR',
    metadata: {
      gift: '1',
      months: String(chosen.months),
      buyer_name: String(buyerName).slice(0, 80),
      gift_message: String(message).slice(0, 300),
    },
    success_url: `${baseUrl()}/presente?compra=ok&sessao={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/presente?compra=cancelado`,
  });
  return { url: session.url };
}

// Portal do cliente: trocar cartão, ver recibos e cancelar em dois toques —
// cancelamento tem que ser tão fácil quanto assinar.
export async function createPortal({ coupleId }) {
  const s = stripe();
  const { customer_id: customerId } = db.getSubscription(coupleId);
  if (!s || !customerId) throw Object.assign(new Error('Nenhuma assinatura para gerenciar'), { status: 404 });
  const session = await s.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl()}/app/plano`,
  });
  return { url: session.url };
}

const isoFromUnix = (secs) => (secs ? new Date(secs * 1000).toISOString() : null);

// Descobre o casal pelo metadado (checkout) ou pelo customer já gravado.
function resolveCouple(object) {
  const meta = object?.metadata?.couple_id || object?.client_reference_id;
  if (meta) return Number(meta);
  const customer = typeof object?.customer === 'string' ? object.customer : object?.customer?.id;
  return customer ? db.coupleByCustomerId(customer) : null;
}

// Verifica a assinatura do webhook e aplica o estado. Chamado com o corpo
// cru (Buffer) — assinatura não fecha sobre JSON reserializado.
export async function handleWebhook(rawBody, signature) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) throw Object.assign(new Error('Webhook não configurado'), { status: 503 });

  const event = s.webhooks.constructEvent(rawBody, signature, secret);
  const object = event.data.object;

  // Presente pago: gera o código e manda pra quem comprou. Não há casal
  // envolvido ainda — o vínculo acontece no resgate.
  if (event.type === 'checkout.session.completed' && object.metadata?.gift === '1') {
    const existing = db.giftBySession(object.id);
    if (existing) return { ok: true, type: event.type, code: existing.code };
    const gift = db.createGiftCode({
      months: Number(object.metadata.months) || 12,
      origin: 'compra',
      buyerEmail: object.customer_details?.email || null,
      buyerName: object.metadata.buyer_name || null,
      message: object.metadata.gift_message || '',
      session: object.id,
    });
    db.track('presente_comprado', { props: { months: gift.months } });
    if (gift.buyer_email) {
      const { sendGiftCode } = await import('./mailer.js');
      await sendGiftCode({
        to: gift.buyer_email,
        code: gift.code,
        months: gift.months,
        url: `${baseUrl()}/presente/${gift.code}`,
      }).catch((e) => console.error('gift email error', e));
    }
    return { ok: true, type: event.type, code: gift.code };
  }

  const coupleId = resolveCouple(object);
  if (!coupleId) return { ignored: true, type: event.type };

  switch (event.type) {
    case 'checkout.session.completed': {
      const subId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id;
      const sub = subId ? await s.subscriptions.retrieve(subId) : null;
      db.saveSubscription(coupleId, {
        provider: 'stripe',
        status: sub?.status || 'active',
        customerId: typeof object.customer === 'string' ? object.customer : object.customer?.id,
        subscriptionId: subId || null,
        currentPeriodEnd: isoFromUnix(sub?.current_period_end),
        cancelAtPeriodEnd: !!sub?.cancel_at_period_end,
      });
      db.track('assinou', { coupleId, props: { plan: object.metadata?.plan || 'mensal' } });
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      db.saveSubscription(coupleId, {
        provider: 'stripe',
        status: object.status,
        customerId: typeof object.customer === 'string' ? object.customer : object.customer?.id,
        subscriptionId: object.id,
        currentPeriodEnd: isoFromUnix(object.current_period_end),
        cancelAtPeriodEnd: !!object.cancel_at_period_end,
      });
      if (object.cancel_at_period_end) db.track('cancelou', { coupleId });
      break;
    }
    case 'customer.subscription.deleted': {
      // Fim de período: volta pro grátis sem apagar nada do casal.
      db.saveSubscription(coupleId, { status: 'free', currentPeriodEnd: null, cancelAtPeriodEnd: false });
      db.track('assinatura_encerrada', { coupleId });
      break;
    }
    case 'invoice.payment_failed': {
      db.saveSubscription(coupleId, { status: 'past_due' });
      db.track('pagamento_falhou', { coupleId });
      break;
    }
    default:
      return { ignored: true, type: event.type };
  }
  return { ok: true, type: event.type, coupleId };
}
