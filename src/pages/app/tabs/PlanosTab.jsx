import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiUpload } from '../../../lib/api.js';
import { AppHeader, Card, Row, Sheet, Fab, Field, Btn, Chip, Spinner, EmptyState } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const fmtDate = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'sem prazo';
const pct = (steps) => steps.length ? Math.round((steps.filter((s) => s.done).length / steps.length) * 100) : 0;

const TEMPLATES = [
  { id: 'zero', label: 'Do zero', steps: [] },
  { id: 'morar', label: 'Morar juntos', steps: ['Definir bairro', 'Juntar a entrada', 'Escolher o apê', 'Contratar mudança', 'Comprar móveis'] },
  { id: 'casamento', label: 'Casamento', steps: ['Definir a data', 'Lista de convidados', 'Escolher o local', 'Buffet', 'Convites'] },
  { id: 'viagem', label: 'Viagem dos sonhos', steps: ['Escolher destino', 'Definir período', 'Comprar passagens', 'Reservar hospedagem', 'Montar roteiro'] },
];

export default function PlanosTab() {
  const nav = useNavigate();
  const [plans, setPlans] = useState(null);
  const [sheet, setSheet] = useState(false);

  const load = () => api('/api/plans').then((d) => setPlans(d.plans));
  useEffect(() => { load(); }, []);

  return (
    <div>
      <AppHeader back={() => nav('/app/voces')} title="Planos & metas" />

      <MetasSection />

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2 mt-4">Planos grandes</p>

      {plans === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : plans.length === 0 ? (
        <EmptyState icon="target" title="Tirem um sonho do papel" actions={<Btn onClick={() => setSheet(true)} className="!px-5 !py-2.5 !text-sm">Criar primeiro plano</Btn>}>
          Viagem, morar juntos, casamento — transforme um desejo grande em etapas concretas.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <Card key={p.id} className="!p-0">
              <Row icon="target" title={p.title}
                sub={`${pct(p.steps)}% · ${p.steps.filter((s) => s.done).length} de ${p.steps.length} etapas · ${fmtDate(p.target_date)}`}
                onClick={() => nav(`/app/planos/${p.id}`)} />
              <div className="h-1 bg-accent-soft rounded-b-card overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${pct(p.steps)}%` }} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Fab onClick={() => setSheet(true)} label="Novo plano" />
      {sheet && <PlanoSheet onClose={() => setSheet(false)} onSaved={(id) => { setSheet(false); nav(`/app/planos/${id}`); }} />}
    </div>
  );
}

function PlanoSheet({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', targetDate: '', template: 'zero', shared: true });
  const [saving, setSaving] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const tpl = TEMPLATES.find((t) => t.id === form.template);
      const { plan } = await api('/api/plans', { method: 'POST', body: {
        title: form.title.trim(), targetDate: form.targetDate, shared: form.shared, steps: tpl.steps,
      } });
      onSaved(plan.id);
    } finally { setSaving(false); }
  }
  return (
    <Sheet title="Novo plano" onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Nome do plano" placeholder="Ex.: Viagem dos sonhos" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
        <Field label="Prazo (opcional)" type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
        <p className="text-sm font-medium text-ink-2 mb-2">Começar com</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {TEMPLATES.map((t) => <Chip key={t.id} active={form.template === t.id} onClick={() => setForm({ ...form, template: t.id })}>{t.label}</Chip>)}
        </div>
        <button type="button" onClick={() => setForm({ ...form, shared: !form.shared })} className="w-full flex items-center justify-between rounded-card bg-surface px-4 py-3 mb-5 shadow-[inset_0_0_0_1px_var(--line-2)]">
          <span className="flex items-center gap-2.5"><Icon name="together" size={18} className="text-accent-press" /> Compartilhar com meu par</span>
          <span className={`w-11 h-6 rounded-full transition-colors relative ${form.shared ? 'bg-accent' : 'bg-[var(--line-2)]'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.shared ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
        <Btn type="submit" block disabled={saving || !form.title.trim()}>{saving ? <Spinner /> : 'Criar plano'}</Btn>
      </form>
    </Sheet>
  );
}

export function PlanoDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState('');
  const [newStep, setNewStep] = useState('');
  const [notes, setNotes] = useState('');

  const load = () => api(`/api/plans/${id}`).then((d) => { setPlan(d.plan); setNotes(d.plan.notes || ''); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  async function toggleStep(s) {
    const { plan: p } = await api(`/api/plan-steps/${s.id}`, { method: 'PATCH', body: { done: !s.done } });
    setPlan(p);
  }
  async function addStep(e) {
    e.preventDefault();
    if (!newStep.trim()) return;
    const { plan: p } = await api(`/api/plans/${id}/steps`, { method: 'POST', body: { title: newStep.trim() } });
    setPlan(p); setNewStep('');
  }
  async function delStep(s) {
    const { plan: p } = await api(`/api/plan-steps/${s.id}`, { method: 'DELETE' });
    setPlan(p);
  }
  async function saveNotes() {
    if (notes === (plan.notes || '')) return;
    const { plan: p } = await api(`/api/plans/${id}`, { method: 'PATCH', body: { notes } });
    setPlan(p);
  }
  async function uploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    const { plan: p } = await apiUpload(`/api/plans/${id}/attachments`, fd);
    setPlan(p);
  }
  async function removePlan() {
    if (!confirm('Excluir este plano?')) return;
    await api(`/api/plans/${id}`, { method: 'DELETE' });
    nav('/app/planos');
  }

  if (err) return <div><AppHeader back={() => nav('/app/planos')} title="Plano" /><p className="text-ink-2 py-8 text-center">{err}</p></div>;
  if (!plan) return <div className="py-10 text-center"><Spinner /></div>;

  return (
    <div>
      <AppHeader back={() => nav('/app/planos')} title="Plano" right={<button onClick={removePlan} aria-label="Excluir" className="text-ink-3 hover:text-accent-press p-1"><Icon name="trash" size={18} /></button>} />

      <div className="mb-5">
        <h1 className="font-display text-2xl mb-1">{plan.title}</h1>
        <p className="text-sm text-ink-2 mb-2">Meta: {fmtDate(plan.target_date)}{plan.shared ? ' · compartilhado' : ''}</p>
        <div className="h-2 bg-accent-soft rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct(plan.steps)}%` }} />
        </div>
        <p className="text-sm text-ink-2 mt-1.5">{pct(plan.steps)}% concluído · {plan.steps.filter((s) => s.done).length} de {plan.steps.length} etapas</p>
      </div>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Etapas</p>
      <Card className="!p-0 mb-4">
        {plan.steps.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
            <button onClick={() => toggleStep(s)} aria-label="Concluir" className={`flex-none w-6 h-6 rounded-full grid place-items-center transition-all ${s.done ? 'bg-accent text-white' : 'shadow-[inset_0_0_0_1.5px_var(--line-2)]'}`}>
              {s.done ? <Icon name="check" size={14} /> : null}
            </button>
            <span className={`flex-1 text-[.95rem] ${s.done ? 'line-through text-ink-3' : ''}`}>{s.title}</span>
            <button onClick={() => delStep(s)} aria-label="Remover" className="text-ink-3 hover:text-accent-press p-1"><Icon name="close" size={15} /></button>
          </div>
        ))}
        {plan.steps.length === 0 && <p className="px-4 py-3 text-sm text-ink-3">Nenhuma etapa ainda.</p>}
      </Card>
      <form onSubmit={addStep} className="flex gap-2 mb-5">
        <input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Nova etapa"
          className="flex-1 rounded-btn bg-surface px-4 py-2.5 text-ink placeholder:text-ink-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none" />
        <Btn type="submit" className="!px-4 !py-2.5"><Icon name="plus" size={18} /></Btn>
      </form>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Notas</p>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Anotações, links, lembretes…"
        className="w-full rounded-card bg-surface px-4 py-3 text-ink placeholder:text-ink-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none min-h-[80px] mb-5" />

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Anexos</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {plan.attachments.map((a) => <img key={a.id} src={a.url} alt="" className="w-20 h-20 rounded-card object-cover" />)}
        <label className="w-20 h-20 rounded-card grid place-items-center bg-surface shadow-[inset_0_0_0_1px_var(--line-2)] cursor-pointer text-ink-3 hover:text-accent-press">
          <Icon name="camera" size={22} />
          <input type="file" accept="image/*" className="hidden" onChange={uploadFile} />
        </label>
      </div>
    </div>
  );
}

// Metas rápidas do casal (fundidas aqui, vindas da antiga aba Vocês).
function MetasSection() {
  const [goals, setGoals] = useState(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/api/connection').then((d) => setGoals(d.goals || [])).catch(() => setGoals([]));
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try { const { goal } = await api('/api/goals', { method: 'POST', body: { title: title.trim() } }); setGoals([goal, ...(goals || [])]); setTitle(''); }
    finally { setBusy(false); }
  }
  async function toggle(g) {
    const { goal } = await api(`/api/goals/${g.id}`, { method: 'PATCH', body: { done: !g.done } });
    setGoals(goals.map((x) => (x.id === g.id ? goal : x)));
  }
  async function del(g) {
    await api(`/api/goals/${g.id}`, { method: 'DELETE' });
    setGoals(goals.filter((x) => x.id !== g.id));
  }

  return (
    <>
      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2 mt-1">Metas rápidas</p>
      {goals !== null && goals.length > 0 && (
        <Card className="!p-0 mb-2">
          {goals.map((g) => (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
              <button type="button" onClick={() => toggle(g)} aria-label="Concluir" className={`flex-none w-6 h-6 rounded-full grid place-items-center ${g.done ? 'bg-accent text-white' : 'shadow-[inset_0_0_0_1.5px_var(--line-2)]'}`}>{g.done ? <Icon name="check" size={14} /> : null}</button>
              <span className={`flex-1 text-[.95rem] ${g.done ? 'line-through text-ink-3' : ''}`}>{g.title}</span>
              <button type="button" onClick={() => del(g)} aria-label="Remover" className="text-ink-3 hover:text-accent-press p-1"><Icon name="close" size={15} /></button>
            </div>
          ))}
        </Card>
      )}
      <form onSubmit={add} className="flex gap-2 mb-1">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova meta (ex.: viajar em dezembro)"
          className="flex-1 rounded-btn bg-surface px-4 py-2.5 text-ink placeholder:text-ink-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none" />
        <Btn type="submit" disabled={busy || !title.trim()} className="!px-4 !py-2.5">{busy ? <Spinner /> : <Icon name="plus" size={18} />}</Btn>
      </form>
    </>
  );
}
