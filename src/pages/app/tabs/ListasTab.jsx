import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useDataRefresh } from '../../../lib/refresh.js';
import { useToast } from '../../../lib/toast-context.js';
import { Card, Row, Sheet, Field, Btn, Chip, Spinner, EmptyState, RowList } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

// Wishlist deixou de ser um tipo de lista: ela mora em Datas & presentes, num
// lugar só. Listas antigas do tipo wishlist continuam funcionando e visíveis.
const KINDS = [
  { kind: 'shared', label: 'Compartilhada', icon: 'together' },
  { kind: 'individual', label: 'Minha', icon: 'user' },
];
const FILTERS = [['todas', 'Todas'], ['shared', 'Compartilhadas'], ['individual', 'Minhas']];

export default function ListasTab() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [lists, setLists] = useState(null);
  const [filter, setFilter] = useState('todas');
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ title: '', kind: 'shared' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { api('/api/lists').then((d) => setLists(d.lists)).catch(() => setLists([])); }, []);
  useEffect(() => { load(); }, [load]);
  useDataRefresh(load);

  const shown = useMemo(() => (lists || []).filter((l) => filter === 'todas' || l.kind === filter), [lists, filter]);

  async function create(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const k = KINDS.find((x) => x.kind === form.kind);
      const { list } = await api('/api/lists', { method: 'POST', body: { title: form.title.trim(), kind: form.kind, icon: k.icon } });
      setSheet(false); setForm({ title: '', kind: 'shared' });
      toast('Lista criada ✓');
      nav(`/app/listas/${list.id}`);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally { setSaving(false); }
  }

  return (
    <div>
      <h1 className="font-display text-[1.9rem] pt-6 pb-3">Listas</h1>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-5 px-5 [scrollbar-width:none]">
        {FILTERS.map(([k, label]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{label}</Chip>)}
      </div>

      {lists === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : shown.length === 0 ? (
        <EmptyState icon="list" title="Sem listas ainda" actions={<Btn onClick={() => setSheet(true)} className="!px-5 !py-2.5 !text-sm">Criar lista</Btn>}>
          Compras, tarefas da casa ou planos de viagem — o que vocês precisam dividir.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {shown.map((l) => {
            const k = KINDS.find((x) => x.kind === l.kind);
            const sub = l.kind === 'wishlist' ? `${l.total} ${l.total === 1 ? 'item salvo' : 'itens salvos'} · wishlist`
              : `${l.done} de ${l.total} concluídos · ${(k?.label || 'Compartilhada').toLowerCase()}`;
            return (
              <Card key={l.id} className="!p-0">
                <Row icon={l.icon || k?.icon || 'list'} title={l.title} sub={sub} onClick={() => nav(`/app/listas/${l.id}`)} />
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

      {/* O "+" da barra adiciona itens; criar uma lista nova mora aqui.
          Desejos e presentes têm um endereço só — daqui você vai até ele. */}
      <RowList className="mt-4">
        <Row icon="heart" title="O que a gente come hoje?" sub="Sorteia uma receita ou fotografa a geladeira"
          onClick={() => nav('/app/cozinha')} />
        <Row icon="plus" title="Criar nova lista" sub="Compartilhada ou só sua" onClick={() => setSheet(true)} />
        <Row icon="gift" title="Wishlist de vocês" sub="Desejos e presentes ficam em Datas & presentes" onClick={() => nav('/app/presentes')} />
      </RowList>

      {sheet && (
        <Sheet title="Nova lista" onClose={() => setSheet(false)}>
          <form onSubmit={create}>
            <Field label="Nome da lista" placeholder="Compras da semana" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
            <p className="text-sm font-medium text-ink-2 mb-2">Tipo</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
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
