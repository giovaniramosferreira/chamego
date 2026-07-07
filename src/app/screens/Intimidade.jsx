import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, JSwitch, JLoading, JErro, JPremium, EmptyState, Row, Field } from '../ui';

function IntimidadeRoot() {
  const go = useGo();
  const [j, setJ] = useState('conectado');

  let body;
  if (j === 'loading') body = <JLoading />;
  else if (j === 'erro') body = <JErro onRetry={() => setJ('loading')} />;
  else if (j === 'sozinho' || j === 'pendente') body = (
    <EmptyState icon="heart" title="Um espaço para dois" text="Esta área ganha vida com seu par. Você pode explorar os temas, mas as experiências são feitas juntos.">
      <button className="btn btn-primary" style={{ marginTop: '.4rem' }} onClick={() => go('invite-partner')}>Convidar meu par</button>
    </EmptyState>
  );
  else if (j === 'vazio') body = (
    <EmptyState icon="heart" title="Comecem quando quiserem" text="Escolham um tema abaixo para a primeira conversa guiada de vocês." />
  );
  else if (j === 'premium') body = (
    <JPremium
      title="Trilhas de conexão"
      sub="Cartas, perguntas e rituais guiados por tema e intensidade."
      perks={['Trilhas por tema', 'Rituais guiados completos', 'Novos conteúdos por pack']}
    />
  );
  else {
    const tones = [
      ['Conversa', 'perguntas pra abrir o dia', 'linear-gradient(160deg,#7a8a6f,#4d5a45)'],
      ['Futuro', 'sonhos e combinados', 'linear-gradient(160deg,#c9a86a,#8a6f3f)'],
      ['Carinho', 'gestos e gratidão', 'linear-gradient(160deg,#bd6a4b,#8c4630)'],
      ['Reconexão', 'quando falta tempo', 'linear-gradient(160deg,#8c5a8c,#5c3a5c)'],
    ];
    body = (
      <>
        <div className="secret-banner mb-md"><I name="shield" size={18} /> Espaço privado e protegido. Delicado por padrão, você controla o tom.</div>
        <div className="prompt-card mb-md" style={{ cursor: 'pointer' }} onClick={() => go('intimidade-carta')}>
          <div className="pc-tag">Carta do dia</div>
          <p>"O que em mim faz você se sentir em casa?"</p>
        </div>
        <div className="section-title" style={{ marginTop: 0 }}>Escolha um tom</div>
        <div className="tone-grid mb-md">
          {tones.map(([t, s, bg]) => (
            <div key={t} className="tone-card" style={{ background: bg }} onClick={() => go('intimidade-carta')}>
              <div className="tc-title">{t}</div><div className="tc-sub">{s}</div>
            </div>
          ))}
          <div className="tone-card locked-tone" style={{ background: 'linear-gradient(160deg,#8c2f4a,#5c1e30)' }} onClick={() => go('paywall')}>
            <div className="tc-lock"><I name="lock" size={15} /></div><div className="tc-title">Desejo</div><div className="tc-sub">trilha premium</div>
          </div>
          <div className="tone-card locked-tone" style={{ background: 'linear-gradient(160deg,#5a6b8c,#33405c)' }} onClick={() => go('paywall')}>
            <div className="tc-lock"><I name="lock" size={15} /></div><div className="tc-title">Combinados</div><div className="tc-sub">trilha premium</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-block" onClick={() => go('intimidade-historico')}>Nossas sessões</button>
      </>
    );
  }

  return (
    <div className="screen-scroll">
      <AppHeader back title="Conexão" actions={[{ icon: 'lock', go: 'intimidade-lock' }]} />
      <JSwitch value={j} onChange={setJ} />
      {body}
    </div>
  );
}

function IntimidadeLock() {
  const go = useGo();
  const [pin, setPin] = useState('');
  const press = (k) => setPin(p => (p + k).slice(0, 4));
  return (
    <div className="screen-scroll">
      <AppHeader back />
      <div className="private-lock">
        <div className="pl-ic"><I name="lock" size={28} /></div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '.3rem' }}>Área protegida</h3>
        <p className="muted" style={{ maxWidth: '26ch', margin: '0 auto' }}>Digite o código de vocês para entrar.</p>
        <div className="pin-dots">
          {[0, 1, 2, 3].map(i => <span key={i} className={i < pin.length ? 'on' : ''} />)}
        </div>
        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => <button key={k} onClick={() => press(String(k))}>{k}</button>)}
          <button style={{ visibility: 'hidden' }} />
          <button onClick={() => press('0')}>0</button>
          <button onClick={() => go('intimidade-root')}><I name="check" size={20} /></button>
        </div>
      </div>
    </div>
  );
}

function IntimidadeCarta() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader back title="Conversa" />
      <div className="prompt-card mb-lg"><div className="pc-tag">Carinho</div><p>"Qual pequeno gesto meu faz o seu dia melhor?"</p></div>
      <Field label="Sua resposta"><textarea placeholder="Sem pressa..." /></Field>
      <button className="btn btn-primary btn-block mb-md">Responder</button>
      <div className="section-title" style={{ marginTop: 0 }}>João respondeu</div>
      <div className="card">"Quando você encosta em mim de manhã antes da gente acordar de verdade. Isso me segura o dia todo."</div>
      <button className="btn btn-ghost btn-block" style={{ marginTop: '1.2rem' }} onClick={() => go('intimidade-root')}>Próxima carta</button>
    </div>
  );
}

function IntimidadeHistorico() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Nossas sessões" />
      <p className="muted mb-md">Guardar o histórico é opcional. Você pode apagar a qualquer momento.</p>
      <div className="row-list mb-md">
        <Row icon="heart" title="Carinho · gratidão" sub="ontem à noite" go="intimidade-carta" right="chev" />
        <Row icon="chat" title="Futuro · onde queremos morar" sub="3 dias atrás" go="intimidade-carta" right="chev" />
      </div>
      <button className="btn btn-ghost btn-block" style={{ color: '#b23b3b' }}><I name="trash" size={16} /> Apagar histórico</button>
    </div>
  );
}

export default {
  'intimidade-root': { component: IntimidadeRoot, hideTabs: true },
  'intimidade-lock': { component: IntimidadeLock, hideTabs: true },
  'intimidade-carta': { component: IntimidadeCarta, hideTabs: true },
  'intimidade-historico': { component: IntimidadeHistorico, hideTabs: true },
};
