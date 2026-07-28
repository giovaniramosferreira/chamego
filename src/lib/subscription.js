import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Assinatura do Espaço do Casal. `has(entitlement)` decide o que está liberado.
// Nada aqui concede acesso: quem concede é o servidor (teste grátis vigente ou
// pagamento confirmado pelo webhook). O front só lê e leva ao checkout.
export function useSubscription() {
  const [data, setData] = useState(null);

  const reload = useCallback(() => api('/api/subscription')
    .then(setData)
    .catch(() => setData({ subscription: { plan: 'free', entitlements: ['free'] }, usage: {}, limits: {} })), []);

  useEffect(() => { reload(); }, [reload]);

  const sub = data?.subscription;
  return {
    plan: sub?.plan || 'free',
    status: sub?.status || 'free',
    entitlements: sub?.entitlements || ['free'],
    trialing: !!sub?.trialing,
    trialEndsAt: sub?.trialEndsAt || null,
    trialUsed: !!sub?.trialUsed,
    cancelAtPeriodEnd: !!sub?.cancelAtPeriodEnd,
    currentPeriodEnd: sub?.currentPeriodEnd || null,
    managed: !!sub?.managed,
    usage: data?.usage || {},
    limits: data?.limits || {},
    plans: data?.plans || [],
    billingEnabled: !!data?.billingEnabled,
    trialDays: data?.trialDays || 14,
    loading: data === null,
    has: (e) => (sub?.entitlements || []).includes(e),
    reload,
  };
}

// Eventos do funil de venda. Falha em silêncio: métrica nunca atrapalha o uso.
export function track(name, origem) {
  api('/api/track', { method: 'POST', body: { name, origem } }).catch(() => {});
}
