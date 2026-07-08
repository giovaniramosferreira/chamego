import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './icons.jsx';

const BTN_BASE = 'inline-flex items-center justify-center gap-2 rounded-btn font-semibold text-base px-6 py-3.5 transition-all duration-200 ease-brand disabled:opacity-50 disabled:pointer-events-none';
const BTN_STYLES = {
  primary: `${BTN_BASE} bg-accent text-accent-ink shadow hover:bg-accent-press hover:-translate-y-0.5 active:translate-y-0`,
  ghost: `${BTN_BASE} text-ink shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-[inset_0_0_0_1px_var(--ink)]`,
};

export function Btn({ variant = 'primary', block = false, to, className = '', children, ...props }) {
  const cls = `${BTN_STYLES[variant]} ${block ? 'w-full' : ''} ${className}`;
  if (to) return <Link to={to} className={cls} {...props}>{children}</Link>;
  return <button className={cls} {...props}>{children}</button>;
}

export function Field({ label, children, ...props }) {
  // Com children (textarea/select), renderiza-os; senão, um <input> padrão.
  // Nunca repassa children pro input (void element) — evita crash de render.
  return (
    <label className="block mb-4">
      {label && <span className="block text-sm font-medium text-ink-2 mb-1.5">{label}</span>}
      {children || (
        <input className="w-full rounded-btn bg-surface px-4 py-3 text-ink placeholder:text-ink-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none transition-shadow"
          {...props} />
      )}
    </label>
  );
}

export function SelectField({ label, children, ...props }) {
  return (
    <label className="block mb-4">
      {label && <span className="block text-sm font-medium text-ink-2 mb-1.5">{label}</span>}
      <select className="w-full rounded-btn bg-surface px-4 py-3 text-ink shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none appearance-none" {...props}>
        {children}
      </select>
    </label>
  );
}

export function Card({ className = '', children, ...props }) {
  return <div className={`bg-surface rounded-card p-5 shadow-[0_1px_2px_rgba(43,37,33,.04),0_1px_0_var(--line)] ${className}`} {...props}>{children}</div>;
}

export function Row({ icon, title, sub, right, onClick, className = '' }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag {...(onClick ? { type: 'button' } : {})} onClick={onClick} className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left bg-surface border-b border-line last:border-0 ${onClick ? 'hover:bg-accent-soft/40 transition-colors' : ''} ${className}`}>
      {icon && <span className="flex-none w-9 h-9 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press"><Icon name={icon} size={17} /></span>}
      <span className="flex-1 min-w-0">
        <span className="block font-medium text-[.95rem] text-ink">{title}</span>
        {sub && <span className="block text-sm text-ink-2">{sub}</span>}
      </span>
      {right ?? <Icon name="chevronR" size={14} className="text-ink-3" />}
    </Tag>
  );
}

export function RowList({ children, className = '' }) {
  return <div className={`rounded-card overflow-hidden shadow-[0_1px_2px_rgba(43,37,33,.04),0_1px_0_var(--line)] ${className}`}>{children}</div>;
}

export function Chip({ children, active = false, onClick, className = '' }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-accent-soft text-accent-press shadow-[inset_0_0_0_1px_var(--accent-line)]' : 'bg-surface text-ink-2 shadow-[inset_0_0_0_1px_var(--line-2)]'} ${className}`}>
      {children}
    </button>
  );
}

export function ChoiceCard({ icon, title, sub, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`w-full flex items-center gap-3.5 rounded-card px-4 py-4 mb-2.5 text-left bg-surface transition-all ${selected ? 'shadow-[inset_0_0_0_1.5px_var(--accent)]' : 'shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-[inset_0_0_0_1px_var(--ink)]'}`}>
      <span className="flex-none w-9 h-9 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press"><Icon name={icon} size={18} /></span>
      <span className="flex-1">
        <span className="block font-medium text-ink">{title}</span>
        {sub && <span className="block text-sm text-ink-2">{sub}</span>}
      </span>
      <span className={`flex-none w-5 h-5 rounded-full transition-all ${selected ? 'border-[6px] border-accent' : 'border border-line-2'}`} />
    </button>
  );
}

export function EmptyState({ icon, title, children, actions }) {
  return (
    <div className="flex flex-col items-center text-center px-6 pt-16 pb-10">
      <span className="w-16 h-16 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent mb-4"><Icon name={icon} size={26} /></span>
      <h3 className="font-display text-xl mb-1.5">{title}</h3>
      <p className="text-ink-2 text-[.95rem] max-w-[30ch] mb-5">{children}</p>
      {actions}
    </div>
  );
}

export function AppHeader({ back, title, right }) {
  return (
    <div className="flex items-center gap-3 py-3 min-h-[52px]">
      {back && (
        <button onClick={back} aria-label="Voltar" className="w-9 h-9 rounded-full grid place-items-center bg-surface shadow-[inset_0_0_0_1px_var(--line)] text-ink">
          <Icon name="back" size={18} />
        </button>
      )}
      <div className="flex-1 font-display text-lg">{title || ''}</div>
      {right}
    </div>
  );
}

export function ProgressDots({ step, total }) {
  return (
    <div className="flex gap-1.5 mb-5">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent' : 'w-1.5 bg-ink-3/40'}`} />
      ))}
    </div>
  );
}

export function Logo({ className = '' }) {
  return <span className={`font-display italic tracking-tight ${className}`}>chamego<span className="text-accent">.</span></span>;
}

// Bottom sheet para formulários de criação/edição (mobile-first).
export function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-[fade_.2s_ease]" />
      <div className="relative w-full max-w-[430px] bg-bg rounded-t-[22px] px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] shadow-[0_-8px_30px_rgba(43,37,33,.18)] max-h-[88vh] overflow-y-auto sheet-enter">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-3/30" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Fab({ onClick, label = 'Adicionar' }) {
  return (
    <div className="fixed bottom-[84px] left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 z-30 flex justify-end pointer-events-none">
      <button onClick={onClick} aria-label={label}
        className="pointer-events-auto w-14 h-14 rounded-full bg-accent text-accent-ink shadow-[0_6px_18px_rgba(189,106,75,.45)] grid place-items-center hover:bg-accent-press active:scale-95 transition-all">
        <Icon name="plus" size={24} />
      </button>
    </div>
  );
}

export function Spinner({ className = '' }) {
  return <span className={`inline-block w-5 h-5 rounded-full border-2 border-accent/30 border-t-accent animate-spin ${className}`} />;
}

// Paywall reutilizável: mostra benefícios e ativa o Premium do casal.
// (Sem gateway de pagamento nesta fase — ativa via PATCH /api/subscription.)
export function PaywallSheet({ title = 'Recurso Premium', perks = [], onClose, onActivate }) {
  const [busy, setBusy] = useState(false);
  async function activate() {
    setBusy(true);
    try { await onActivate?.(); onClose?.(); } finally { setBusy(false); }
  }
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="flex flex-col items-center text-center mb-4">
        <span className="w-14 h-14 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent mb-3"><Icon name="lock" size={24} /></span>
        <p className="text-ink-2 text-[.95rem] max-w-[32ch]">Libere o Premium do espaço de vocês e desbloqueie tudo.</p>
      </div>
      <div className="mb-5 space-y-2">
        {perks.map((p, i) => (
          <div key={i} className="flex items-center gap-2.5 text-[.95rem]">
            <span className="flex-none w-6 h-6 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="check" size={14} /></span>
            <span>{p}</span>
          </div>
        ))}
      </div>
      <Btn block disabled={busy} onClick={activate}>{busy ? <Spinner /> : 'Ativar Premium'}</Btn>
      <button onClick={onClose} className="w-full text-center text-sm text-ink-3 mt-3">Agora não</button>
    </Sheet>
  );
}
