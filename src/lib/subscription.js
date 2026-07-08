import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Assinatura do Espaço do Casal. `has(entitlement)` decide o que está liberado.
export function useSubscription() {
  const [sub, setSub] = useState(null);

  const reload = useCallback(() => {
    api('/api/subscription').then((d) => setSub(d.subscription)).catch(() => setSub({ plan: 'free', entitlements: ['free'] }));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const activatePremium = useCallback(async () => {
    const { subscription } = await api('/api/subscription', { method: 'PATCH', body: { plan: 'premium' } });
    setSub(subscription);
    return subscription;
  }, []);

  return {
    plan: sub?.plan || 'free',
    entitlements: sub?.entitlements || ['free'],
    loading: sub === null,
    has: (e) => (sub?.entitlements || []).includes(e),
    activatePremium,
    reload,
  };
}
