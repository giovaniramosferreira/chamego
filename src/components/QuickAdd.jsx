import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiUpload } from '../lib/api.js';
import { notifyDataChanged } from '../lib/refresh.js';
import { parseQuickText } from '../lib/quick-parse.js';
import { useToast } from '../lib/toast-context.js';
import { Sheet, Field, Btn, Spinner, Row, RowList } from '../ui/kit.jsx';
import Icon from '../ui/icons.jsx';

const todayISO = () => new Date().toLocaleDateString('en-CA');

const TYPES = [
  { key: 'evento', label: 'Evento', icon: 'calendar' },
  { key: 'item', label: 'Item de lista', icon: 'list' },
  { key: 'momento', label: 'Momento', icon: 'image' },
  { key: 'data', label: 'Data importante', icon: 'gift' },
  { key: 'plano', label: 'Plano', icon: 'target' },
];

// Montado só quando abre (o shell usa {aberto && <QuickAdd/>}), então o
// estado já nasce limpo — sem reset dentro de efeito.
export default function QuickAdd({ onClose, context = 'inicio', onDone }) {
  const nav = useNavigate();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [type, setType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState('');
  const [results, setResults] = useState([]);
  const fileRef = useRef(null);
  const [photo, setPhoto] = useState(null);

  const parsed = useMemo(() => parseQuickText(text), [text]);
  // O tipo vem da aba onde a pessoa estava; o texto pode mudar de ideia.
  const guessed = type || (parsed.date || parsed.time ? 'evento' : { agenda: 'evento', listas: 'item', momentos: 'momento', voces: 'plano' }[context] || 'evento');

  useEffect(() => {
    api('/api/lists').then((d) => {
      const usable = (d.lists || []).filter((l) => l.kind !== 'wishlist');
      setLists(usable);
      setListId(String(usable[0]?.id || ''));
    }).catch(() => {});
  }, []);

  // Busca enquanto digita: criar e encontrar moram no mesmo lugar.
  useEffect(() => {
    const term = text.trim();
    const t = setTimeout(() => {
      if (term.length < 2) return setResults([]);
      api(`/api/search?q=${encodeURIComponent(term)}`)
        .then((d) => setResults(d.results || []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [text]);

  async function save(e) {
    e?.preventDefault();
    const title = parsed.title || text.trim();
    if (!title && !photo) return;
    setSaving(true);
    try {
      if (guessed === 'evento') {
        await api('/api/events', { method: 'POST', body: { title, date: parsed.date || todayISO(), time: parsed.time, location: parsed.location } });
        toast('Evento na agenda ✓');
        nav('/app/agenda');
      } else if (guessed === 'item') {
        let target = listId;
        if (!target) {
          const { list } = await api('/api/lists', { method: 'POST', body: { title: 'Nossa lista', kind: 'shared' } });
          target = list.id;
        }
        await api(`/api/lists/${target}/items`, { method: 'POST', body: { text: title } });
        toast('Item adicionado ✓');
        nav(`/app/listas/${target}`);
      } else if (guessed === 'momento') {
        const fd = new FormData();
        fd.append('text', title);
        fd.append('date', parsed.date || todayISO());
        if (photo) fd.append('photo', photo);
        await apiUpload('/api/moments', fd);
        toast('Momento guardado 💛');
        nav('/app/momentos');
      } else if (guessed === 'data') {
        const { gift } = await api('/api/gifts', { method: 'POST', body: { title, date: parsed.date || todayISO(), kind: 'date' } });
        toast('Data importante salva ✓');
        nav(`/app/presentes/${gift.id}`);
      } else {
        const { plan } = await api('/api/plans', { method: 'POST', body: { title, targetDate: parsed.date } });
        toast('Plano criado ✓');
        nav(`/app/planos/${plan.id}`);
      }
      notifyDataChanged();
      onDone?.();
      onClose();
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const hint = [
    parsed.date && new Date(`${parsed.date}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }),
    parsed.time,
    parsed.location,
  ].filter(Boolean).join(' · ');

  return (
    <Sheet title="Adicionar" onClose={onClose}>
      <form onSubmit={save}>
        <Field label="O que você quer guardar?" autoFocus value={text} onChange={(e) => setText(e.target.value)}
          placeholder="jantar sexta 20h no Oliva" />
        {hint && <p className="-mt-2 mb-3 text-sm text-accent-press">Entendi: {hint}</p>}

        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-5 px-5 [scrollbar-width:none]">
          {TYPES.map((t) => (
            <button type="button" key={t.key} onClick={() => setType(t.key)}
              className={`flex-none inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${guessed === t.key ? 'bg-accent-soft text-accent-press shadow-[inset_0_0_0_1px_var(--accent-line)]' : 'bg-surface text-ink-2 shadow-[inset_0_0_0_1px_var(--line-2)]'}`}>
              <Icon name={t.icon} size={15} /> {t.label}
            </button>
          ))}
        </div>

        {guessed === 'item' && lists.length > 0 && (
          <label className="block mb-4">
            <span className="block text-sm font-medium text-ink-2 mb-1.5">Em qual lista?</span>
            <select value={listId} onChange={(e) => setListId(e.target.value)}
              className="w-full rounded-btn bg-surface px-4 py-3 text-ink shadow-[inset_0_0_0_1px_var(--line-2)] outline-none">
              {lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </label>
        )}

        {guessed === 'momento' && (
          <>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-btn py-3 mb-4 text-accent-press shadow-[inset_0_0_0_1.5px_var(--accent-line)]">
              <Icon name="camera" size={18} /> {photo ? photo.name.slice(0, 24) : 'Adicionar foto'}
            </button>
          </>
        )}

        <Btn type="submit" block disabled={saving || (!text.trim() && !photo)}>{saving ? <Spinner /> : 'Adicionar'}</Btn>
      </form>

      {results.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Já existe em vocês</p>
          <RowList className="mb-2">
            {results.slice(0, 5).map((r) => (
              <Row key={`${r.type}-${r.id}`} icon={r.icon} title={r.title} sub={`${r.type} · ${r.sub}`}
                onClick={() => { onClose(); nav(r.to); }} />
            ))}
          </RowList>
        </div>
      )}
    </Sheet>
  );
}
