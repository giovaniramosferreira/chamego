import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, BigHeader, Row, Chev, Chip, Field, Fab } from '../ui';

function VocesRoot() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <BigHeader title="Vocês" />
      <div className="card mb-md" style={{ display: 'flex', alignItems: 'center', gap: '.9rem', cursor: 'pointer' }} onClick={() => go('chat')}>
        <div className="r-icon"><I name="chat" size={17} stroke="var(--accent-press)" /></div>
        <div style={{ flex: 1 }}><div className="r-title">Chat privado</div><div className="r-sub">João: "Chego às 19h 💛"</div></div>
        <Chev />
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>Painel de conexão</div>
      <div className="card mb-md">
        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
          <div><div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--accent)' }}>743</div><div className="muted" style={{ fontSize: '.75rem' }}>dias juntos</div></div>
          <div><div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--accent)' }}>12</div><div className="muted" style={{ fontSize: '.75rem' }}>check-ins seguidos</div></div>
          <div><div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--accent)' }}>3</div><div className="muted" style={{ fontSize: '.75rem' }}>metas ativas</div></div>
        </div>
      </div>

      <div className="row-list mb-md">
        <Row icon="heart" title="Check-in de hoje" sub="Como você está?" go="checkin" right="chev" />
        <Row icon="target" title="Metas do casal" sub="3 em andamento" go="metas" right="chev" />
        <Row icon="chat" title="Pergunta guiada do dia" sub="Uma nova toda semana" go="perguntas" right="chev" />
        <Row icon="heart" title="Quiz de compatibilidade" sub="Comparem as respostas" go="quiz-root" right="chev" />
        <Row icon="star" title="Conquistas do casal" sub="4 conquistadas" go="conquistas-root" right="chev" />
        <Row icon="bell" title="Lembretes de carinho" sub="Sugestões leves pra hoje" go="lembretes-root" right="chev" />
        <Row locked icon="gift" title="Packs de conexão" sub="Dinâmicas premium" go="paywall" />
      </div>

      <div className="feat-card mb-md" style={{ background: 'linear-gradient(150deg,#8c5a8c,#5c3a5c)' }} onClick={() => go('intimidade-lock')}>
        <div className="fc-ic"><I name="lock" size={20} /></div>
        <div style={{ flex: 1 }}><div className="fc-title">Área de conexão</div><div className="fc-sub">Espaço privado, cartas e rituais</div></div>
        <div className="fc-chev"><I name="chevronR" size={14} /></div>
      </div>
    </div>
  );
}

function Checkin() {
  const go = useGo();
  const [mood, setMood] = useState(null);
  return (
    <div className="screen-scroll">
      <AppHeader back title="Como você está?" />
      <p className="muted mb-md">Um check-in rápido, só pra registrar o seu dia.</p>
      <div className="mood-row">
        {['😞', '😕', '😐', '🙂', '😄'].map((m, i) => (
          <div key={i} className={`mood-opt ${mood === i ? 'sel' : ''}`} onClick={() => setMood(i)}>{m}</div>
        ))}
      </div>
      <Field label="Quer contar mais alguma coisa?"><textarea placeholder="Opcional" /></Field>
      <button className="btn btn-primary btn-block mb-lg" onClick={() => go('voces-root')}>Salvar check-in</button>

      <div className="section-title" style={{ marginTop: 0 }}>Como está a semana de vocês</div>
      <div className="card">
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((n, i) => (
            <div key={i} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '1.1rem' }}>{['🙂', '😄', '😐', '🙂', '😄', '😊', '—'][i]}</div>
              <div className="muted" style={{ fontSize: '.68rem', marginTop: 2 }}>{n}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metas() {
  return (
    <>
      <div className="screen-scroll">
        <AppHeader back title="Metas do casal" />
        <div className="row-list mb-lg">
          <Row icon="target" title="Economizar pra viagem" sub="R$ 2.400 de R$ 5.000" />
          <Row icon="heart" title="Um date por semana" sub="Meta ativa · 4 semanas seguidas" />
          <Row icon="home" title="Organizar o apê até dezembro" sub="2 de 6 etapas concluídas" />
        </div>
      </div>
      <Fab go="metas" />
    </>
  );
}

function Perguntas() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Pergunta da semana" />
      <div className="card mb-lg" style={{ textAlign: 'center', padding: '2rem 1.4rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.35rem', color: 'var(--ink)' }}>
          "Qual foi o momento em que você se sentiu mais cuidado(a) por mim este mês?"
        </p>
      </div>
      <Field label="Sua resposta"><textarea placeholder="Escreva com calma..." /></Field>
      <button className="btn btn-primary btn-block mb-lg">Enviar resposta</button>
      <div className="section-title" style={{ marginTop: 0 }}>Resposta do João</div>
      <div className="card">"Quando você ficou até tarde me ajudando com a apresentação. Não esqueço."</div>
    </div>
  );
}

function Chat() {
  return (
    <>
      <AppHeader back title="João" actions={[{ icon: 'search' }]} />
      <div className="screen-scroll" style={{ flex: 1, paddingTop: 6 }}>
        <div className="bubble them">Chego às 19h, separa o vinho 🍷</div>
        <div className="bubble-time">14:02</div>
        <div className="bubble me">Combinado! Já coloquei na geladeira 😄</div>
        <div className="bubble-time">14:05</div>
        <div className="bubble them">Vi que você adicionou a lista de compras, obrigado 💛</div>
        <div className="bubble-time">14:06</div>
        <Chip style={{ margin: '.4rem 0' }}>📌 Mensagem fixada: "Consulta médica sexta 9h"</Chip>
        <div className="bubble me">Vou levar o bolo também</div>
        <div className="bubble-time">Agora</div>
      </div>
      <div className="chat-input">
        <div className="icon-btn"><I name="camera" size={16} /></div>
        <input type="text" placeholder="Mensagem..." />
        <div className="send"><I name="send" size={16} stroke="#fff" /></div>
      </div>
    </>
  );
}

export default {
  'voces-root': { component: VocesRoot, tab: 'voces' },
  'checkin': { component: Checkin, hideTabs: true },
  'metas': { component: Metas, hideTabs: true },
  'perguntas': { component: Perguntas, hideTabs: true },
  'chat': { component: Chat, hideTabs: true },
};
