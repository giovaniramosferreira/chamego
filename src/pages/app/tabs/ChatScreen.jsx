import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { AppHeader, Btn, Spinner } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

function fmtTime(iso) {
  // created_at vem como 'YYYY-MM-DD HH:MM:SS' em UTC (datetime('now'))
  const d = new Date(`${iso.replace(' ', 'T')}Z`);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const nav = useNavigate();
  const { user, partner } = useSession();
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState('');
  const lastId = useRef(0);
  const endRef = useRef(null);

  const scroll = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });

  const poll = useCallback(async () => {
    try {
      const { messages } = await api(`/api/messages?since=${lastId.current}`);
      if (messages.length) {
        lastId.current = messages[messages.length - 1].id;
        setMsgs((prev) => [...(prev || []), ...messages]);
        setTimeout(scroll, 50);
      } else if (msgs === null) {
        setMsgs([]);
      }
    } catch { /* ignora falha de rede momentânea */ }
  }, [msgs]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [poll]);

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    const { message } = await api('/api/messages', { method: 'POST', body: { text: t } });
    lastId.current = message.id;
    setMsgs((prev) => [...(prev || []), message]);
    setTimeout(scroll, 50);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader back={() => nav('/app/voces')} title={partner?.name || 'Chat privado'} />

      <div className="flex-1 pb-24 pt-2 space-y-2">
        {msgs === null ? (
          <div className="py-16 text-center"><Spinner /></div>
        ) : msgs.length === 0 ? (
          <p className="text-center text-ink-2 text-sm pt-16">Comecem a conversa 💛</p>
        ) : (
          msgs.map((m) => {
            const mine = m.sender_email === user.email;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-[.95rem] ${mine ? 'bg-accent text-accent-ink rounded-br-md' : 'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] rounded-bl-md'}`}>
                  <span>{m.text}</span>
                  <span className={`block text-[.65rem] mt-0.5 text-right ${mine ? 'text-accent-ink/70' : 'text-ink-3'}`}>{fmtTime(m.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-bg/95 backdrop-blur px-5 pt-2 pb-[max(env(safe-area-inset-bottom),10px)]">
        <div className="flex gap-2 bg-surface rounded-full shadow-[inset_0_0_0_1px_var(--line-2)] p-1.5">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mensagem…"
            className="flex-1 bg-transparent px-3 py-1.5 outline-none text-ink placeholder:text-ink-3" />
          <Btn type="submit" disabled={!text.trim()} className="!px-4 !py-2 !rounded-full"><Icon name="chevronR" size={18} /></Btn>
        </div>
      </form>
    </div>
  );
}
