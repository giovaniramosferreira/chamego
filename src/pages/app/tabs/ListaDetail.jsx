import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { useAlturaDoTeclado } from '../../../lib/teclado.js';
import { useToast } from '../../../lib/toast-context.js';
import { donoPadrao, temaDe } from '../../../lib/temas-lista.js';
import { AppHeader, Card, Spinner, Btn, CheckRow } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

export default function ListaDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, partner } = useSession();
  const teclado = useAlturaDoTeclado();
  const { toast, undoable } = useToast();
  const [list, setList] = useState(null);
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    api(`/api/lists/${id}`).then((d) => setList(d.list)).catch(() => nav('/app/listas'));
  }, [id, nav]);

  // Tudo otimista: marcar e adicionar respondem na hora e só depois vão ao
  // servidor. Se der erro, o estado volta e o aviso aparece.
  async function addItem(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    // Numa lista de pendências dele, o item novo já é dele: ninguém quer
    // marcar "de quem é" trinta vezes seguidas.
    const dono = donoPadrao(list.theme, { meuEmail: user.email, parceiro: partner });
    const temp = { id: `tmp-${Date.now()}`, text: value, done: 0, assignee: dono, pending: true };
    setList((l) => ({ ...l, items: [...l.items, temp] }));
    setText('');
    inputRef.current?.focus();
    try {
      const { list: fresh } = await api(`/api/lists/${id}/items`, { method: 'POST', body: { text: value, assignee: dono } });
      setList(fresh);
    } catch (err) {
      setList((l) => ({ ...l, items: l.items.filter((i) => i.id !== temp.id) }));
      setText(value);
      toast(err.message, { tone: 'error' });
    }
  }

  async function toggle(item) {
    if (String(item.id).startsWith('tmp-')) return;
    const before = list;
    setList((l) => ({ ...l, items: l.items.map((i) => (i.id === item.id ? { ...i, done: item.done ? 0 : 1 } : i)) }));
    try {
      const { list: fresh } = await api(`/api/items/${item.id}`, { method: 'PATCH', body: { done: !item.done } });
      setList(fresh);
    } catch (err) {
      setList(before);
      toast(err.message, { tone: 'error' });
    }
  }

  // O tema sugere; a pessoa decide. Um toque no nome gira entre os dois e
  // "de ninguém em especial".
  async function girarDono(item) {
    if (String(item.id).startsWith('tmp-') || !partner) return;
    const ordem = ['', user.email, partner.email];
    const proximo = ordem[(ordem.indexOf(item.assignee || '') + 1) % ordem.length];
    const before = list;
    setList((l) => ({ ...l, items: l.items.map((i) => (i.id === item.id ? { ...i, assignee: proximo } : i)) }));
    try {
      const { list: fresh } = await api(`/api/items/${item.id}`, { method: 'PATCH', body: { assignee: proximo } });
      setList(fresh);
    } catch (err) {
      setList(before);
      toast(err.message, { tone: 'error' });
    }
  }

  function del(item) {
    if (String(item.id).startsWith('tmp-')) return;
    const before = list;
    undoable({
      message: `“${item.text}” removido`,
      apply: () => setList((l) => ({ ...l, items: l.items.filter((i) => i.id !== item.id) })),
      revert: () => setList(before),
      commit: () => api(`/api/items/${item.id}`, { method: 'DELETE' }),
    });
  }

  function removeList() {
    undoable({
      message: `Lista “${list.title}” excluída`,
      apply: () => nav('/app/listas'),
      revert: () => nav(`/app/listas/${id}`),
      commit: () => api(`/api/lists/${id}`, { method: 'DELETE' }),
    });
  }

  if (!list) return <div className="py-16 text-center"><Spinner /></div>;

  const isWishlist = list.kind === 'wishlist';
  const done = list.items.filter((i) => i.done).length;
  const tema = temaDe(list.theme);
  const nomeDoDono = (email) => {
    if (!email) return 'dos dois';
    if (email === user.email) return 'você';
    return partner?.name?.split(' ')[0] || 'seu par';
  };
  const meus = list.items.filter((i) => !i.done && i.assignee === user.email).length;

  return (
    <div>
      <AppHeader back={() => nav('/app/listas')} title={list.title}
        right={<button onClick={removeList} aria-label="Excluir lista" className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50"><Icon name="trash" size={17} /></button>} />

      {list.items.length > 0 && !isWishlist && (
        <p className="text-sm text-ink-2 mb-3">
          {done} de {list.items.length} concluídos{meus > 0 ? ` · ${meus} ${meus === 1 ? 'é sua' : 'são suas'}` : ''}
        </p>
      )}

      <div className="space-y-2 mb-4">
        {list.items.length === 0 && (
          <Card className="text-center text-ink-2 text-sm py-6">{tema.vazio || 'Adicione o primeiro item abaixo 👇'}</Card>
        )}
        {list.items.map((item) => (
          <Card key={item.id} className={`!p-0 ${item.pending ? 'opacity-60' : ''}`}>
            <CheckRow done={!!item.done} text={item.text} onToggle={() => toggle(item)} onRemove={() => del(item)}
              right={partner && (
                <button onClick={() => girarDono(item)}
                  className={`flex-none text-[.7rem] px-2 py-1 rounded-full ${item.assignee ? 'bg-accent-soft text-accent-press' : 'text-ink-3'}`}>
                  {nomeDoDono(item.assignee)}
                </button>
              )} />
          </Card>
        ))}
      </div>

      {/* Com o teclado aberto, o campo sobe e cola nele — a barra de abas some
          por baixo, que é onde ela deve estar nessa hora. */}
      <form onSubmit={addItem} style={{ transform: `translate(-50%, -${teclado}px)`, bottom: teclado ? 8 : 76 }}
        className="fixed left-1/2 w-full max-w-[430px] px-5 pb-2 transition-transform duration-200">
        <div className="flex gap-2 bg-surface rounded-btn shadow-[0_2px_10px_rgba(43,37,33,.1),inset_0_0_0_1px_var(--line-2)] p-1.5">
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={isWishlist ? 'Adicionar desejo…' : 'Adicionar item…'}
            className="flex-1 bg-transparent px-3 py-2 outline-none text-ink placeholder:text-ink-3" />
          <Btn type="submit" disabled={!text.trim()} className="!px-4 !py-2"><Icon name="plus" size={18} /></Btn>
        </div>
      </form>
    </div>
  );
}
