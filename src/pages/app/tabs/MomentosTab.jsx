import { useEffect, useRef, useState } from 'react';
import { api, apiUpload } from '../../../lib/api.js';
import { Sheet, Fab, Field, Btn, Spinner, EmptyState } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const todayISO = () => new Date().toLocaleDateString('en-CA');
function fmt(iso) {
  const t = todayISO();
  if (iso === t) return 'Hoje';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

export default function MomentosTab() {
  const [moments, setMoments] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [text, setText] = useState('');
  const [date, setDate] = useState(todayISO());
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = () => api('/api/moments').then((d) => setMoments(d.moments));
  useEffect(() => { load(); }, []);

  function pick(e) {
    setFiles(Array.from(e.target.files || []).slice(0, 6));
  }
  async function save(e) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('text', text.trim());
      fd.append('date', date);
      files.forEach((f) => fd.append('photos', f));
      await apiUpload('/api/moments', fd);
      setSheet(false); setText(''); setDate(todayISO()); setFiles([]);
      load();
    } finally { setSaving(false); }
  }
  async function remove(id) {
    if (!confirm('Excluir este momento?')) return;
    await api(`/api/moments/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-[1.9rem] pt-6 pb-3">Momentos</h1>

      {moments === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : moments.length === 0 ? (
        <EmptyState icon="moments" title="A linha do tempo de vocês" actions={<Btn onClick={() => setSheet(true)} className="!px-5 !py-2.5 !text-sm">Guardar momento</Btn>}>
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
                  <button onClick={() => remove(m.id)} aria-label="Excluir" className="text-ink-3 hover:text-accent-press"><Icon name="trash" size={15} /></button>
                </div>
                {m.text && <p className="text-[1.05rem] leading-snug mb-2">{m.text}</p>}
                {m.photos.length === 1 && <img src={m.photos[0]} alt="" loading="lazy" className="w-full rounded-[18px] object-cover max-h-80" />}
                {m.photos.length > 1 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {m.photos.map((p, i) => <img key={i} src={p} alt="" loading="lazy" className="aspect-square w-full rounded-xl object-cover" />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Fab onClick={() => setSheet(true)} label="Novo momento" />

      {sheet && (
        <Sheet title="Guardar momento" onClose={() => setSheet(false)}>
          <form onSubmit={save}>
            <label className="block mb-4">
              <span className="block text-sm font-medium text-ink-2 mb-1.5">O que rolou?</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} autoFocus
                placeholder="Café da manhã na varanda, do jeitinho que a gente gosta ☕"
                className="w-full rounded-btn bg-surface px-4 py-3 text-ink placeholder:text-ink-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none resize-none" />
            </label>
            <Field label="Quando" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pick} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-btn py-3 mb-3 text-accent-press shadow-[inset_0_0_0_1.5px_var(--accent-line)]">
              <Icon name="camera" size={18} /> {files.length ? `${files.length} foto(s) selecionada(s)` : 'Adicionar fotos'}
            </button>
            {files.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {files.map((f, i) => <img key={i} src={URL.createObjectURL(f)} alt="" className="aspect-square w-full rounded-lg object-cover" />)}
              </div>
            )}
            <Btn type="submit" block disabled={saving || (!text.trim() && files.length === 0)}>{saving ? <Spinner /> : 'Guardar momento'}</Btn>
          </form>
        </Sheet>
      )}
    </div>
  );
}
