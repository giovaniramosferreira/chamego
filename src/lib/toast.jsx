import { useCallback, useEffect, useRef, useState } from 'react';
import { ToastContext } from './toast-context.js';
import Icon from '../ui/icons.jsx';

const UNDO_MS = 5000;

// Avisos curtos com "Desfazer" no lugar do confirm() do navegador.
// Excluir é otimista: some da tela na hora e só vai pro servidor quando a
// janela de desfazer fecha — por isso desfazer é instantâneo e sem pedido.
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const pending = useRef(new Map()); // id -> { timer, commit }
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, { tone = 'info', duration = 3500, action } = {}) => {
    const id = nextId.current++;
    setItems((list) => [...list.slice(-2), { id, message, tone, action }]);
    if (duration) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Executa o commit pendente na hora (ex.: ao sair da página).
  const flush = useCallback((id) => {
    const entry = pending.current.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.current.delete(id);
    Promise.resolve(entry.commit()).catch(() => {});
  }, []);

  const undoable = useCallback(({ message, apply, commit, revert, onError }) => {
    apply?.();
    const id = nextId.current++;
    const timer = setTimeout(() => {
      pending.current.delete(id);
      Promise.resolve(commit()).catch((e) => {
        revert?.();
        onError?.(e);
        toast(e?.message || 'Não deu pra concluir. Desfizemos aqui.', { tone: 'error' });
      });
      dismiss(id);
    }, UNDO_MS);
    pending.current.set(id, { timer, commit });

    setItems((list) => [...list.slice(-2), {
      id,
      message,
      tone: 'info',
      action: {
        label: 'Desfazer',
        onClick: () => {
          const entry = pending.current.get(id);
          if (entry) clearTimeout(entry.timer);
          pending.current.delete(id);
          revert?.();
          dismiss(id);
        },
      },
    }]);
  }, [dismiss, toast]);

  // Fechou a aba com exclusão pendente? Vale o que a pessoa viu na tela.
  useEffect(() => {
    const onLeave = () => { for (const id of [...pending.current.keys()]) flush(id); };
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('beforeunload', onLeave);
      onLeave();
    };
  }, [flush]);

  return (
    <ToastContext.Provider value={{ toast, undoable }}>
      {children}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(env(safe-area-inset-bottom),18px)] pointer-events-none">
        {items.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto w-full max-w-[398px] flex items-center gap-3 rounded-btn px-4 py-3 shadow-[0_8px_24px_rgba(43,37,33,.22)] toast-enter
              ${t.tone === 'error' ? 'bg-[#7d3b2b] text-[#fff8f2]' : 'bg-ink text-[#fff8f2]'}`}
            role="status">
            <span className="flex-1 text-sm leading-snug">{t.message}</span>
            {t.action && (
              <button onClick={t.action.onClick} className="flex-none text-sm font-semibold text-[#f6c9b4] px-1">
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="flex-none opacity-60 hover:opacity-100">
              <Icon name="close" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
