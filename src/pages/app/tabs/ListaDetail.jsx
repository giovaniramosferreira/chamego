import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { AppHeader, Card, Spinner, Btn } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

export default function ListaDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    api(`/api/lists/${id}`).then((d) => setList(d.list)).catch(() => nav('/app/listas'));
  }, [id, nav]);

  async function addItem(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { list } = await api(`/api/lists/${id}/items`, { method: 'POST', body: { text: text.trim() } });
      setList(list); setText('');
      inputRef.current?.focus();
    } finally { setBusy(false); }
  }
  async function toggle(item) {
    const { list } = await api(`/api/items/${item.id}`, { method: 'PATCH', body: { done: !item.done } });
    setList(list);
  }
  async function del(item) {
    const { list } = await api(`/api/items/${item.id}`, { method: 'DELETE' });
    setList(list);
  }
  async function removeList() {
    if (!confirm('Excluir a lista inteira?')) return;
    await api(`/api/lists/${id}`, { method: 'DELETE' });
    nav('/app/listas');
  }

  if (!list) return <div className="py-16 text-center"><Spinner /></div>;

  const isWishlist = list.kind === 'wishlist';
  const done = list.items.filter((i) => i.done).length;

  return (
    <div>
      <AppHeader back={() => nav('/app/listas')} title={list.title}
        right={<button onClick={removeList} aria-label="Excluir lista" className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50"><Icon name="trash" size={17} /></button>} />

      {list.items.length > 0 && !isWishlist && (
        <p className="text-sm text-ink-2 mb-3">{done} de {list.items.length} concluídos</p>
      )}

      <div className="space-y-2 mb-4">
        {list.items.length === 0 && <Card className="text-center text-ink-2 text-sm py-6">Adicione o primeiro item abaixo 👇</Card>}
        {list.items.map((item) => (
          <Card key={item.id} className="!p-0">
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => toggle(item)} aria-label={item.done ? 'Desmarcar' : 'Concluir'}
                className={`flex-none w-6 h-6 rounded-full grid place-items-center transition-all ${item.done ? 'bg-accent text-accent-ink' : 'shadow-[inset_0_0_0_1.5px_var(--line-2)]'}`}>
                {item.done && <Icon name="check" size={14} />}
              </button>
              <span className={`flex-1 text-[.95rem] ${item.done ? 'line-through text-ink-3' : 'text-ink'}`}>{item.text}</span>
              <button onClick={() => del(item)} aria-label="Remover" className="flex-none text-ink-3 hover:text-accent-press"><Icon name="close" size={16} /></button>
            </div>
          </Card>
        ))}
      </div>

      <form onSubmit={addItem} className="fixed bottom-[76px] left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-2">
        <div className="flex gap-2 bg-surface rounded-btn shadow-[0_2px_10px_rgba(43,37,33,.1),inset_0_0_0_1px_var(--line-2)] p-1.5">
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={isWishlist ? 'Adicionar desejo…' : 'Adicionar item…'}
            className="flex-1 bg-transparent px-3 py-2 outline-none text-ink placeholder:text-ink-3" />
          <Btn type="submit" disabled={busy || !text.trim()} className="!px-4 !py-2">{busy ? <Spinner /> : <Icon name="plus" size={18} />}</Btn>
        </div>
      </form>
    </div>
  );
}
