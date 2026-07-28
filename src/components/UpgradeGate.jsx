import { useEffect, useState } from 'react';
import { onUpgradeNeeded } from '../lib/api.js';
import { track } from '../lib/subscription.js';
import { PAGO, PLANO_NOME } from '../lib/plan.js';
import { PaywallSheet } from '../ui/kit.jsx';

// Quando o servidor barra por limite do plano grátis (402), a resposta vira
// convite, não erro: mesma folha do paywall, com a frase do servidor.
export default function UpgradeGate() {
  const [info, setInfo] = useState(null);

  useEffect(() => onUpgradeNeeded((detail) => {
    track('paywall_visto', `limite-${detail.limite || 'desconhecido'}`);
    setInfo(detail);
  }), []);

  if (!info) return null;
  return (
    <PaywallSheet
      title={PLANO_NOME}
      perks={[info.message, ...PAGO.filter((p) => !info.message?.includes(p.split(' ')[0]))].slice(0, 5)}
      origem={`limite-${info.limite || ''}`}
      onClose={() => setInfo(null)}
    />
  );
}
