import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { AppHeader, Card, Row, Sheet, Fab, Field, Btn, Chip, Spinner, EmptyState } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const fmtDate = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : 'sem data';
function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(`${iso}T00:00:00`).getTime() - Date.now()) / 86_400_000);
}
function countLabel(iso) {
  const d = daysUntil(iso);
  if (d === null) return '';
  if (d < 0) return 'passou';
  if (d === 0) return 'hoje';
  return `${d} ${d === 1 ? 'dia' : 'dias'}`;
}

export default function PresentesTab() {
  const nav = useNavigate();
  const [gifts, setGifts] = useState(null);
  const [sheet, setSheet] = useState(false);

  const load = () => api('/api/gifts').then((d) => setGifts(d.gifts));
  useEffect(() => { load(); }, []);

  const dates = (gifts || []).filter((g) => g.kind !== 'wishlist').sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  const wishlist = (gifts || []).filter((g) => g.kind === 'wishlist');
  const hasSecret = (gifts || []).some((g) => g.secret);

  return (
    <div>
      <AppHeader back={() => nav('/app/voces')} title="Presentes & datas" />

      {gifts === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : gifts.length === 0 ? (
        <EmptyState icon="gift" title="Nunca mais esqueça uma data" actions={<Btn onClick={() => setSheet(true)} className="!px-5 !py-2.5 !text-sm">Adicionar</Btn>}>
          Cadastre aniversários e datas importantes, e guarde ideias de presente com antecedência.
        </EmptyState>
      ) : (
        <>
          {dates.length > 0 && (
            <>
              <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Próximas datas</p>
              <Card className="!p-0 mb-4">
                {dates.map((g) => (
                  <Row key={g.id} icon="gift" title={g.title} sub={fmtDate(g.date)} onClick={() => nav(`/app/presentes/${g.id}`)}
                    right={<span className="text-xs font-semibold text-accent-press bg-accent-soft rounded-full px-2.5 py-1">{countLabel(g.date)}</span>} />
                ))}
              </Card>
            </>
          )}
          {hasSecret && (
            <div className="flex items-center gap-2.5 rounded-card bg-accent-soft/60 px-4 py-3 mb-4 text-sm text-accent-press">
              <Icon name="lock" size={18} /> Itens em modo surpresa ficam invisíveis pro seu par até você revelar.
            </div>
          )}
          {wishlist.length > 0 && (
            <>
              <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Wishlist</p>
              <Card className="!p-0 mb-4">
                {wishlist.map((g) => (
                  <Row key={g.id} icon="shopping" title={g.title} sub={g.secret ? 'Surpresa' : 'Visível'} onClick={() => nav(`/app/presentes/${g.id}`)} />
                ))}
              </Card>
            </>
          )}
        </>
      )}

      <Fab onClick={() => setSheet(true)} label="Nova data ou item" />
      {sheet && <GiftSheet onClose={() => setSheet(false)} onSaved={(id) => { setSheet(false); nav(`/app/presentes/${id}`); }} />}
    </div>
  );
}

const LEADS = [[3, '3 dias'], [7, '1 semana'], [30, '1 mês']];

function GiftSheet({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', date: '', kind: 'date', reminderLead: 7, secret: false });
  const [saving, setSaving] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const { gift } = await api('/api/gifts', { method: 'POST', body: {
        title: form.title.trim(), date: form.date, kind: form.kind, reminderLead: form.reminderLead, secret: form.secret,
      } });
      onSaved(gift.id);
    } finally { setSaving(false); }
  }
  return (
    <Sheet title="Nova data ou item" onClose={onClose}>
      <form onSubmit={save}>
        <p className="text-sm font-medium text-ink-2 mb-2">O que é?</p>
        <div className="flex gap-2 mb-4">
          <Chip active={form.kind === 'date'} onClick={() => setForm({ ...form, kind: 'date' })}>Data especial</Chip>
          <Chip active={form.kind === 'wishlist'} onClick={() => setForm({ ...form, kind: 'wishlist' })}>Item de wishlist</Chip>
        </div>
        <Field label="Título" placeholder="Ex.: Aniversário do João" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
        {form.kind === 'date' && (
          <>
            <Field label="Data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <p className="text-sm font-medium text-ink-2 mb-2">Avisar com antecedência</p>
            <div className="flex gap-2 mb-4">
              {LEADS.map(([v, l]) => <Chip key={v} active={form.reminderLead === v} onClick={() => setForm({ ...form, reminderLead: v })}>{l}</Chip>)}
            </div>
          </>
        )}
        <button type="button" onClick={() => setForm({ ...form, secret: !form.secret })} className="w-full flex items-center justify-between rounded-card bg-surface px-4 py-3 mb-5 shadow-[inset_0_0_0_1px_var(--line-2)]">
          <span className="flex items-center gap-2.5"><Icon name="lock" size={18} className="text-accent-press" /> Modo surpresa (esconder do par)</span>
          <span className={`w-11 h-6 rounded-full transition-colors relative ${form.secret ? 'bg-accent' : 'bg-[var(--line-2)]'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.secret ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
        <Btn type="submit" block disabled={saving || !form.title.trim()}>{saving ? <Spinner /> : 'Salvar'}</Btn>
      </form>
    </Sheet>
  );
}

export function PresenteDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [gift, setGift] = useState(null);
  const [err, setErr] = useState('');
  const [newIdea, setNewIdea] = useState('');

  const load = () => api(`/api/gifts/${id}`).then((d) => setGift(d.gift)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  async function patchIdeas(ideas) {
    const { gift: g } = await api(`/api/gifts/${id}`, { method: 'PATCH', body: { ideas } });
    setGift(g);
  }
  const toggleIdea = (i) => patchIdeas(gift.ideas.map((x, idx) => idx === i ? { ...x, done: !x.done } : x));
  const addIdea = (e) => { e.preventDefault(); if (!newIdea.trim()) return; patchIdeas([...gift.ideas, { text: newIdea.trim(), done: false, cost: 0 }]); setNewIdea(''); };
  const removeIdea = (i) => patchIdeas(gift.ideas.filter((_, idx) => idx !== i));
  async function setCost(i, cost) { patchIdeas(gift.ideas.map((x, idx) => idx === i ? { ...x, cost: Number(cost) || 0 } : x)); }
  async function remove() {
    if (!confirm('Excluir?')) return;
    await api(`/api/gifts/${id}`, { method: 'DELETE' });
    nav('/app/presentes');
  }

  if (err) return <div><AppHeader back={() => nav('/app/presentes')} title="Presente" /><p className="text-ink-2 py-8 text-center">{err}</p></div>;
  if (!gift) return <div className="py-10 text-center"><Spinner /></div>;

  const planned = gift.ideas.reduce((s, i) => s + (i.cost || 0), 0);
  const budgetPct = gift.budget ? Math.min(100, Math.round((planned / gift.budget) * 100)) : 0;

  return (
    <div>
      <AppHeader back={() => nav('/app/presentes')} title={gift.kind === 'wishlist' ? 'Item' : 'Data'} right={<button onClick={remove} aria-label="Excluir" className="text-ink-3 hover:text-accent-press p-1"><Icon name="trash" size={18} /></button>} />

      <div className="mb-4">
        {gift.date && daysUntil(gift.date) >= 0 && <p className="text-sm font-semibold text-accent-press mb-1">Faltam {countLabel(gift.date)}</p>}
        <h1 className="font-display text-2xl">{gift.title}</h1>
        {gift.date && <p className="text-sm text-ink-2">{fmtDate(gift.date)}</p>}
      </div>

      {gift.secret && (
        <div className="flex items-center gap-2.5 rounded-card bg-accent-soft/60 px-4 py-3 mb-4 text-sm text-accent-press">
          <Icon name="lock" size={18} /> Modo surpresa ativo — seu par não vê nada desta tela.
        </div>
      )}

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Ideias de presente</p>
      <Card className="!p-0 mb-3">
        {gift.ideas.map((idea, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
            <button onClick={() => toggleIdea(i)} aria-label="Decidir" className={`flex-none w-6 h-6 rounded-full grid place-items-center transition-all ${idea.done ? 'bg-accent text-white' : 'shadow-[inset_0_0_0_1.5px_var(--line-2)]'}`}>
              {idea.done ? <Icon name="check" size={14} /> : null}
            </button>
            <span className={`flex-1 text-[.95rem] ${idea.done ? 'line-through text-ink-3' : ''}`}>{idea.text}</span>
            <input type="number" value={idea.cost || ''} onChange={(e) => setCost(i, e.target.value)} placeholder="R$"
              className="w-16 text-right rounded-btn bg-bg px-2 py-1 text-sm shadow-[inset_0_0_0_1px_var(--line-2)] outline-none" />
            <button onClick={() => removeIdea(i)} aria-label="Remover" className="text-ink-3 hover:text-accent-press p-1"><Icon name="close" size={15} /></button>
          </div>
        ))}
        {gift.ideas.length === 0 && <p className="px-4 py-3 text-sm text-ink-3">Nenhuma ideia ainda.</p>}
      </Card>
      <form onSubmit={addIdea} className="flex gap-2 mb-5">
        <input value={newIdea} onChange={(e) => setNewIdea(e.target.value)} placeholder="Nova ideia"
          className="flex-1 rounded-btn bg-surface px-4 py-2.5 text-ink placeholder:text-ink-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none" />
        <Btn type="submit" className="!px-4 !py-2.5"><Icon name="plus" size={18} /></Btn>
      </form>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Orçamento</p>
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-2">Planejado de R$ {gift.budget || 0}</span>
          <BudgetEdit gift={gift} onSaved={setGift} />
        </div>
        <div className="h-2 bg-accent-soft rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${budgetPct}%` }} />
        </div>
        <p className="text-sm text-ink-2 mt-1.5">R$ {planned} planejado{gift.budget ? ` de R$ ${gift.budget}` : ''}</p>
      </Card>
    </div>
  );
}

function BudgetEdit({ gift, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(gift.budget || 0);
  async function save() {
    const { gift: g } = await api(`/api/gifts/${gift.id}`, { method: 'PATCH', body: { budget: Number(val) || 0 } });
    onSaved(g); setEditing(false);
  }
  if (!editing) return <Chip onClick={() => setEditing(true)}>R$ {gift.budget || 0}</Chip>;
  return (
    <span className="flex items-center gap-1">
      <input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="w-20 rounded-btn bg-bg px-2 py-1 text-sm shadow-[inset_0_0_0_1px_var(--line-2)] outline-none" autoFocus />
      <button onClick={save} className="text-accent-press p-1"><Icon name="check" size={16} /></button>
    </span>
  );
}
