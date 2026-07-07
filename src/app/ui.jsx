import { useState } from 'react';
import I from './icons';
import { useGo, useBack } from './nav';

/* ---------------- cabeçalhos ---------------- */
export function AppHeader({ back, close, title, actions = [] }) {
  const go = useGo();
  const goBack = useBack();
  return (
    <div className="app-header">
      {back && <button className="icon-btn" onClick={goBack}><I name="back" size={18} /></button>}
      {!back && close && <button className="icon-btn" onClick={goBack}><I name="close" size={16} /></button>}
      <div className="h-title">{title || ''}</div>
      <div className="h-actions">
        {actions.map((a, i) => (
          <button key={i} className="icon-btn" onClick={a.go ? () => go(a.go) : a.onClick}>
            <I name={a.icon} size={17} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function BigHeader({ title, sub, initials = 'M' }) {
  const go = useGo();
  return (
    <div className="big-header">
      <div className="top-row">
        <div className="wordmark">chamego<span className="dot">.</span></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="icon-btn" onClick={() => go('chat')}><I name="chat" size={16} /></button>
          <button className="icon-btn" onClick={() => go('config-hub')}><I name="bell" size={16} /></button>
          <button className="avatar" onClick={() => go('config-hub')}>{initials}</button>
        </div>
      </div>
      {title && <h1>{title}</h1>}
      {sub && <p className="sub">{sub}</p>}
    </div>
  );
}

/* ---------------- controles ---------------- */
export function StateSwitch({ options, value, onChange, scroll }) {
  return (
    <div className={`state-switch${scroll ? ' scroll' : ''}`}>
      {options.map(o => (
        <button key={o} className={o === value ? 'on' : ''} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

export function Tgl({ initial = false }) {
  const [on, setOn] = useState(initial);
  return <div className={`tgl${on ? ' on' : ''}`} onClick={() => setOn(!on)} />;
}

export function Chk({ checked, onClick, id }) {
  return (
    <div className={`checkbox${checked ? ' checked' : ''}`} onClick={onClick} id={id}>
      <I name="check" size={12} />
    </div>
  );
}

export function Chev({ size = 14 }) {
  return <div className="r-chev"><I name="chevronR" size={size} /></div>;
}

export function Row({ icon, title, sub, go: goId, onClick, right, lead, locked, done, titleStyle }) {
  const go = useGo();
  const handler = onClick || (goId ? () => go(goId) : undefined);
  return (
    <div
      className={`row${done ? ' done' : ''}${locked ? ' locked' : ''}`}
      onClick={handler}
      style={handler ? { cursor: 'pointer' } : undefined}
    >
      {locked && <div className="lock-badge"><I name="lock" size={13} stroke="#fff" /></div>}
      {lead}
      {icon && <div className="r-icon"><I name={icon} /></div>}
      <div className="r-body">
        <div className="r-title" style={titleStyle}>{title}</div>
        {sub && <div className="r-sub">{sub}</div>}
      </div>
      {right === 'chev' ? <Chev /> : right}
    </div>
  );
}

export function Choice({ icon, title, sub, sel, onClick }) {
  return (
    <div className={`choice${sel ? ' sel' : ''}`} onClick={onClick}>
      {icon && <div className="c-icon"><I name={icon} size={18} /></div>}
      <div style={{ flex: 1 }}>
        <div className="c-title">{title}</div>
        {sub && <div className="c-sub">{sub}</div>}
      </div>
      <div className="c-radio" />
    </div>
  );
}

export function ProgressDots({ step, total }) {
  return (
    <div className="progress-dots">
      {Array.from({ length: total }, (_, i) => <span key={i} className={i === step ? 'on' : ''} />)}
    </div>
  );
}

export function Fab({ go: goId, onClick, icon = 'plus' }) {
  const go = useGo();
  return (
    <button className="fab" onClick={onClick || (goId ? () => go(goId) : undefined)}>
      <I name={icon} size={24} stroke="#fff" />
    </button>
  );
}

export function Chip({ on, go: goId, onClick, children, locked, className = '', style }) {
  const go = useGo();
  const handler = onClick || (goId ? () => go(goId) : undefined);
  return (
    <div
      className={`chip${on ? ' on' : ''}${locked ? ' locked' : ''} ${className}`.trim()}
      onClick={handler}
      style={{ ...(handler ? { cursor: 'pointer' } : null), ...style }}
    >
      {children}
    </div>
  );
}

export function FeatCard({ icon, title, sub, go: goId, bg }) {
  const go = useGo();
  return (
    <div className="feat-card mb-md" style={bg ? { background: bg } : undefined} onClick={goId ? () => go(goId) : undefined}>
      <div className="fc-ic"><I name={icon} size={20} /></div>
      <div style={{ flex: 1 }}>
        <div className="fc-title">{title}</div>
        <div className="fc-sub">{sub}</div>
      </div>
      <div className="fc-chev"><I name="chevronR" size={14} /></div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon, iconStyle, title, text, children }) {
  return (
    <div className="empty-state">
      <div className="e-icon" style={iconStyle}><I name={icon} size={24} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}

/* ---------------- estados de jornada (J) ---------------- */
export const J_ORDER = ['conectado', 'sozinho', 'pendente', 'vazio', 'loading', 'erro', 'premium'];

export function JSwitch({ value, onChange }) {
  return (
    <div style={{ padding: '2px 0 10px' }}>
      <StateSwitch scroll options={J_ORDER} value={value || 'conectado'} onChange={onChange} />
    </div>
  );
}

export function JLoading() {
  return (
    <div className="skel-wrap">
      <div className="skel skel-block" />
      {[0, 1, 2].map(i => (
        <div key={i} className="skel-card">
          <div className="skel skel-line w60" />
          <div className="skel skel-line w90" />
          <div className="skel skel-line w40" />
        </div>
      ))}
    </div>
  );
}

export function JErro({ onRetry }) {
  return (
    <div className="empty-state">
      <div className="e-icon" style={{ background: '#f3ddd6', color: '#b23b3b' }}><I name="close" size={24} /></div>
      <h3>Algo não carregou</h3>
      <p>Não conseguimos sincronizar os dados agora. Verifique sua conexão e tente de novo.</p>
      <button className="btn btn-primary" style={{ marginTop: '.6rem' }} onClick={onRetry}>Tentar de novo</button>
    </div>
  );
}

export function JPendente({ msg }) {
  const go = useGo();
  return (
    <div className="empty-state">
      <div className="e-icon"><I name="clock" size={24} /></div>
      <h3>Convite pendente</h3>
      <p>{msg || 'Assim que seu par aceitar o convite, esta seção vira uma experiência de casal.'}</p>
      <button className="btn btn-ghost" style={{ marginTop: '.4rem' }} onClick={() => go('invite-partner')}>Reenviar convite</button>
    </div>
  );
}

export function JPremium({ title, sub, perks = [] }) {
  const go = useGo();
  return (
    <div className="premium-gate">
      <div className="pg-icon"><I name="lock" size={22} stroke="#fff" /></div>
      <h3>{title || 'Recurso premium'}</h3>
      <p>{sub || 'Assine o Chamego Premium para desbloquear.'}</p>
      {perks.length > 0 && (
        <ul className="plan-list" style={{ margin: '0 auto 1.2rem', maxWidth: '27ch', textAlign: 'left' }}>
          {perks.map((p, i) => <li key={i}><I name="check" /> {p}</li>)}
        </ul>
      )}
      <button className="btn btn-primary btn-block" onClick={() => go('paywall')}>Desbloquear com Premium</button>
    </div>
  );
}
