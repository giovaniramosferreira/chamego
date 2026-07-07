import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, JSwitch, JLoading, JErro, JPendente, JPremium, EmptyState } from '../ui';

function ConquistasRoot() {
  const go = useGo();
  const [j, setJ] = useState('conectado');
  const solo = j === 'sozinho';

  let body;
  if (j === 'loading') body = <JLoading />;
  else if (j === 'erro') body = <JErro onRetry={() => setJ('loading')} />;
  else if (j === 'pendente') body = <JPendente msg="Conquistas individuais já contam. As conquistas de casal começam quando seu par entrar." />;
  else if (j === 'vazio') body = (
    <EmptyState icon="star" title="Nenhuma conquista ainda" text="Use o app no dia a dia — check-ins, listas, momentos — e os primeiros marcos aparecem por aqui." />
  );
  else if (j === 'premium') body = (
    <JPremium
      title="Coleções especiais"
      sub="Trilhas temáticas de conquistas e benefícios visuais exclusivos."
      perks={['Coleções temáticas', 'Molduras e selos especiais', 'Marcos comemorativos raros']}
    />
  );
  else {
    const earned = [
      ['heart', 'Primeiros 100 dias', 'jun 2024'],
      ['check', '7 check-ins seguidos', 'esta semana'],
      ['calendar', '10 dates registrados', 'jun 2026'],
      ['image', 'Primeiro álbum', 'mai 2026'],
    ];
    const locked = [
      ['target', 'Meta concluída', 'em breve'],
      ['star', '1 ano de app', 'faltam 2 meses'],
    ];
    body = (
      <>
        <div className="feat-hero mb-md">
          <div className="fh-kicker">Jornada {solo ? 'individual' : 'de vocês'}</div>
          <div className="fh-title">{earned.length} conquistas</div>
          <div className="fh-sub">{solo ? 'Continue — algumas conquistas se abrem quando seu par entrar.' : 'Vocês estão construindo uma bela constância.'}</div>
        </div>
        <div className="section-title" style={{ marginTop: 0 }}>Conquistadas</div>
        <div className="card mb-md">
          <div className="ach-grid">
            {earned.map(([ic, n, s]) => (
              <div key={n} className="ach" style={{ cursor: 'pointer' }} onClick={() => go('conquista-detail')}>
                <div className="medal"><I name={ic} size={26} /></div>
                <div className="a-name">{n}</div><div className="a-sub">{s}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="section-title">Em progresso</div>
        <div className="card mb-md">
          <div className="ach progress" style={{ flexDirection: 'row', gap: '.9rem', textAlign: 'left', alignItems: 'center' }}>
            <div className="medal" style={{ width: 48, height: 48, flex: 'none' }}><I name="target" size={22} /></div>
            <div style={{ flex: 1 }}>
              <div className="a-name" style={{ fontSize: '.92rem', marginBottom: '.4rem' }}>Um date por semana — 4/6 semanas</div>
              <div className="pbar"><span style={{ width: '66%' }} /></div>
            </div>
          </div>
        </div>
        <div className="section-title">A desbloquear</div>
        <div className="card mb-md">
          <div className="ach-grid">
            {locked.map(([ic, n, s]) => (
              <div key={n} className="ach locked">
                <div className="medal"><I name={ic} size={26} /></div>
                <div className="a-name">{n}</div><div className="a-sub">{s}</div>
              </div>
            ))}
            <div className="ach locked" style={{ cursor: 'pointer' }} onClick={() => go('paywall')}>
              <div className="medal"><I name="lock" size={22} /></div>
              <div className="a-name">Coleção especial</div><div className="a-sub">Premium</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="screen-scroll">
      <AppHeader back title="Conquistas" />
      <JSwitch value={j} onChange={setJ} />
      {body}
    </div>
  );
}

function ConquistaDetail() {
  const go = useGo();
  return (
    <div className="screen-scroll" style={{ textAlign: 'center', paddingTop: '6%' }}>
      <AppHeader back />
      <div className="ach" style={{ marginBottom: '1.2rem' }}>
        <div className="medal" style={{ width: 92, height: 92 }}><I name="check" size={40} /></div>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '.3rem' }}>7 check-ins seguidos</h3>
      <p className="muted" style={{ maxWidth: '30ch', margin: '0 auto 1.6rem' }}>Vocês registraram como estavam todos os dias desta semana. Constância é cuidado.</p>
      <button className="btn btn-primary btn-block mb-sm" onClick={() => go('chat')}>Compartilhar com o João</button>
      <button className="btn btn-ghost btn-block" onClick={() => go('conquistas-root')}>Ver todas</button>
    </div>
  );
}

export default {
  'conquistas-root': { component: ConquistasRoot, hideTabs: true },
  'conquista-detail': { component: ConquistaDetail, hideTabs: true },
};
