import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiUpload } from '../../../lib/api.js';
import { useDataRefresh } from '../../../lib/refresh.js';
import { useToast } from '../../../lib/toast-context.js';
import { Card, Row, Sheet, Field, Btn, Spinner, EmptyState, RowList } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const todayISO = () => new Date().toLocaleDateString('en-CA');
function fmt(iso) {
  if (iso === todayISO()) return 'Hoje';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

export default function MomentosTab() {
  const nav = useNavigate();
  const { undoable } = useToast();
  const [moments, setMoments] = useState(null);
  const [sheet, setSheet] = useState(null); // null | 'new' | moment

  const load = useCallback(() => { api('/api/moments').then((d) => setMoments(d.moments)).catch(() => setMoments([])); }, []);
  useEffect(() => { load(); }, [load]);
  useDataRefresh(load);

  // Sem confirm() do navegador: some da linha do tempo e dá pra desfazer.
  function remove(moment) {
    const before = moments;
    undoable({
      message: 'Momento excluído',
      apply: () => setMoments((list) => (list || []).filter((m) => m.id !== moment.id)),
      revert: () => setMoments(before),
      commit: () => api(`/api/moments/${moment.id}`, { method: 'DELETE' }),
    });
  }

  return (
    <div>
      <h1 className="font-display text-[1.9rem] pt-6 pb-3">Momentos</h1>

      <Card className="!p-0 mb-4">
        <Row icon="image" title="Álbuns" sub="Junte as fotos de vocês" onClick={() => nav('/app/albuns')} />
        <Row icon="clock" title="Cápsula do tempo" sub="Guarde mensagens pro futuro" onClick={() => nav('/app/capsula')} />
      </Card>

      {moments === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : moments.length === 0 ? (
        <EmptyState icon="moments" title="A linha do tempo de vocês" actions={<Btn onClick={() => setSheet('new')} className="!px-5 !py-2.5 !text-sm">Guardar momento</Btn>}>
          Registre os momentos bons — com foto ou só uma frase — e veja a história de vocês crescer.
        </EmptyState>
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-[var(--accent-line)]" />
          <div className="space-y-6">
            {moments.map((m) => (
              <div key={m.id} className="relative">
                <span className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-bg" />
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold tracking-wide uppercase text-ink-3">{fmt(m.date)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setSheet(m)} aria-label="Editar" className="text-ink-3 hover:text-accent-press p-1"><Icon name="edit" size={15} /></button>
                    <button onClick={() => remove(m)} aria-label="Excluir" className="text-ink-3 hover:text-accent-press p-1"><Icon name="trash" size={15} /></button>
                  </div>
                </div>
                {m.text && <p className="text-[1.05rem] leading-snug mb-2">{m.text}</p>}
                {m.photos[0] && <img src={m.photos[0]} alt="" loading="lazy" className="w-full rounded-[18px] object-cover max-h-80" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <RowList className="mt-6">
        <Row icon="plus" title="Guardar um momento" sub="Uma frase, uma foto — o que valeu o dia" onClick={() => setSheet('new')} />
      </RowList>

      {sheet && (
        <MomentSheet moment={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); load(); }} />
      )}
    </div>
  );
}

function MomentSheet({ moment, onClose, onSaved }) {
  const editing = !!moment;
  const [text, setText] = useState(moment?.text || '');
  const [date, setDate] = useState(moment?.date || todayISO());
  const [file, setFile] = useState(null);            // nova foto escolhida
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const currentPhoto = moment?.photos?.[0];
  // preview: nova foto > foto atual (a menos que marcada pra remover)
  const preview = file ? URL.createObjectURL(file) : (!removePhoto ? currentPhoto : null);

  function pick(e) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setRemovePhoto(false); }
  }

  async function save(e) {
    e.preventDefault();
    if (!text.trim() && !file && !currentPhoto) return;
    if (!text.trim() && removePhoto && !file) return; // não deixar momento vazio
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('text', text.trim());
      fd.append('date', date);
      if (file) fd.append('photo', file);
      if (editing) {
        if (removePhoto && !file) fd.append('removePhoto', 'true');
        await apiUpload(`/api/moments/${moment.id}`, fd, 'PATCH');
      } else {
        await apiUpload('/api/moments', fd);
      }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <Sheet title={editing ? 'Editar momento' : 'Guardar momento'} onClose={onClose}>
      <form onSubmit={save}>
        <label className="block mb-4">
          <span className="block text-sm font-medium text-ink-2 mb-1.5">O que rolou?</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} autoFocus
            placeholder="Café da manhã na varanda, do jeitinho que a gente gosta ☕"
            className="w-full rounded-btn bg-surface px-4 py-3 text-ink placeholder:text-ink-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none resize-none" />
        </label>
        <Field label="Quando" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        {preview ? (
          <div className="relative mb-4">
            <img src={preview} alt="" className="w-full rounded-[18px] object-cover max-h-72" />
            <div className="absolute top-2 right-2 flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 rounded-full bg-bg/90 backdrop-blur text-sm font-medium shadow-[inset_0_0_0_1px_var(--line-2)]">Trocar</button>
              <button type="button" onClick={() => { setFile(null); setRemovePhoto(true); if (fileRef.current) fileRef.current.value = ''; }}
                className="px-3 py-1.5 rounded-full bg-bg/90 backdrop-blur text-sm font-medium text-red-700/80 shadow-[inset_0_0_0_1px_var(--line-2)]">Remover</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-btn py-3 mb-4 text-accent-press shadow-[inset_0_0_0_1.5px_var(--accent-line)]">
            <Icon name="camera" size={18} /> Adicionar foto
          </button>
        )}

        <Btn type="submit" block disabled={saving || (!text.trim() && !preview)}>{saving ? <Spinner /> : (editing ? 'Salvar' : 'Guardar momento')}</Btn>
      </form>
    </Sheet>
  );
}
