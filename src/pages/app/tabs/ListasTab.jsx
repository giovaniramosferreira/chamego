import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { Card, Row, Sheet, Fab, Field, Btn, Chip, Spinner, EmptyState } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const KINDS = [
  { kind: 'shared', label: 'Compartilhada', icon: 'together' },
  { kind: 'individual', label: 'Minha', icon: 'user' },
  { kind: 'wishlist', label: 'Wishlist', icon: 'star' },
];
const FILTERS = [['todas', 'Todas'], ['shared', 'Compartilhadas'], ['individual', 'Minhas'], ['wishlist', 'Wishlist']];

export default function ListasTab() {
  const nav = useNavigate();
  const [lists, setLists] = useState(null);
  const [filter, setFilter] = useState('todas');
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ title: '', kind: 'shared' });
  const [saving, setSaving] = useState(false);

  const load = () => api('/api/lists').then((d) => setLists(d.lists));
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => (lists || []).filter((l) => filter === 'todas' || l.kind === filter), [lists, filter]);

  async function create(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const k = KINDS.find((x) => x.kind === form.kind);
      const { list } = await api('/api/lists', { method: 'POST', body: { title: form.title.trim(), kind: form.kind, icon: k.icon } });
      setSheet(false); setForm({ title: '', kind: 'shared' });
      nav(`/app/listas/${list.id}`);
    } finally { setSaving(false); }
  }

  return (
    <div>
      <h1 className="font-display text-[1.9rem] pt-6 pb-3">Listas</h1>

      <Card className="!p-0 mb-4">
        <Row icon="target" title="Planos e sonhos" sub="Metas grandes com etapas" onClick={() => nav('/app/planos')} />
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-5 px-5 [scrollbar-width:none]">
        {FILTERS.map(([k, label]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{label}</Chip>)}
      </div>

      {lists === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : shown.length === 0 ? (
        <EmptyState icon="list" title="Sem listas ainda" actions={<Btn onClick={() => setSheet(true)} className="!px-5 !py-2.5 !text-sm">Criar lista</Btn>}>
          Compras, tarefas da casa, planos de viagem ou uma wishlist de presentes.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {shown.map((l) => {
            const k = KINDS.find((x) => x.kind === l.kind) || KINDS[0];
            const sub = l.kind === 'wishlist' ? `${l.total} ${l.total === 1 ? 'item salvo' : 'itens salvos'}`
              : `${l.done} de ${l.total} concluídos · ${k.label.toLowerCase()}`;
            return (
              <Card key={l.id} className="!p-0">
                <Row icon={l.icon || k.icon} title={l.title} sub={sub} onClick={() => nav(`/app/listas/${l.id}`)} />
                {l.total > 0 && l.kind !== 'wishlist' && (
                  <div className="h-1 bg-tint rounded-b-card overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${Math.round((l.done / l.total) * 100)}%` }} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Fab onClick={() => setSheet(true)} label="Nova lista" />

      {sheet && (
        <Sheet title="Nova lista" onClose={() => setSheet(false)}>
          <form onSubmit={create}>
            <Field label="Nome da lista" placeholder="Compras da semana" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
            <p className="text-sm font-medium text-ink-2 mb-2">Tipo</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {KINDS.map((k) => (
                <button type="button" key={k.kind} onClick={() => setForm({ ...form, kind: k.kind })}
                  className={`flex flex-col items-center gap-1.5 rounded-card py-3 transition-all ${form.kind === k.kind ? 'bg-accent-soft shadow-[inset_0_0_0_1.5px_var(--accent)]' : 'bg-surface shadow-[inset_0_0_0_1px_var(--line-2)]'}`}>
                  <Icon name={k.icon} size={20} className="text-accent-press" />
                  <span className="text-xs font-medium">{k.label}</span>
                </button>
              ))}
            </div>
            <Btn type="submit" block disabled={saving || !form.title.trim()}>{saving ? <Spinner /> : 'Criar lista'}</Btn>
          </form>
        </Sheet>
      )}
    </div>
  );
}
