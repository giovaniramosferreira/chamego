import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSubscription } from '../../../lib/subscription.js';
import { AppHeader, Card, Sheet, Btn, Spinner, PaywallSheet } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

function Medal({ icon, locked }) {
  return (
    <span className={`w-14 h-14 rounded-full grid place-items-center ${locked ? 'bg-[var(--bg-tint)] text-ink-3' : 'bg-accent-soft text-accent-press shadow-[inset_0_0_0_1px_var(--accent-line)]'}`}>
      <Icon name={locked ? 'lock' : icon} size={24} />
    </span>
  );
}

export default function ConquistasTab() {
  const nav = useNavigate();
  const sub = useSubscription();
  const [items, setItems] = useState(null);
  const [detail, setDetail] = useState(null);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => { api('/api/achievements').then((d) => setItems(d.achievements)); }, []);

  if (items === null) return <div><AppHeader back={() => nav('/app/voces')} title="Conquistas" /><div className="py-10 text-center"><Spinner /></div></div>;

  const earned = items.filter((a) => a.unlocked);
  const progress = items.filter((a) => !a.unlocked && a.progress);
  const locked = items.filter((a) => !a.unlocked && !a.progress);

  return (
    <div>
      <AppHeader back={() => nav('/app/voces')} title="Conquistas" />

      <Card className="mb-4 text-center bg-accent-soft/40">
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3">Jornada de vocês</p>
        <p className="font-display text-3xl text-accent-press my-1">{earned.length} conquistas</p>
        <p className="text-sm text-ink-2">Vocês estão construindo uma bela constância.</p>
      </Card>

      {earned.length > 0 && (
        <>
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Conquistadas</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {earned.map((a) => (
              <button key={a.id} onClick={() => setDetail(a)} className="flex flex-col items-center text-center gap-1.5">
                <Medal icon={a.icon} />
                <span className="text-xs font-medium leading-tight">{a.title}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {progress.length > 0 && (
        <>
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Em progresso</p>
          {progress.map((a) => (
            <Card key={a.id} className="mb-3 flex items-center gap-3">
              <Medal icon={a.icon} locked />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1.5">{a.title} — {a.progress.current}/{a.progress.total}</p>
                <div className="h-2 bg-accent-soft rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${Math.round((a.progress.current / a.progress.total) * 100)}%` }} /></div>
              </div>
            </Card>
          ))}
        </>
      )}

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">A desbloquear</p>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {locked.map((a) => (
          <div key={a.id} className="flex flex-col items-center text-center gap-1.5 opacity-70">
            <Medal icon={a.icon} locked />
            <span className="text-xs font-medium leading-tight">{a.title}</span>
          </div>
        ))}
        {!sub.has('premium') && (
          <button onClick={() => setPaywall(true)} className="flex flex-col items-center text-center gap-1.5">
            <Medal icon="lock" locked />
            <span className="text-xs font-medium leading-tight">Coleção especial</span>
          </button>
        )}
      </div>

      {detail && (
        <Sheet title={detail.title} onClose={() => setDetail(null)}>
          <div className="flex flex-col items-center text-center mb-4">
            <div className="mb-3"><Medal icon={detail.icon} /></div>
            <p className="text-ink-2 max-w-[30ch]">{detail.desc}</p>
          </div>
          <Btn block onClick={() => nav('/app/voces/chat')}>Compartilhar no chat</Btn>
        </Sheet>
      )}
      {paywall && <PaywallSheet title="Coleções especiais" perks={['Coleções temáticas', 'Molduras e selos especiais', 'Marcos raros']} onClose={() => setPaywall(false)} onActivate={sub.activatePremium} />}
    </div>
  );
}
