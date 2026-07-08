import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSubscription } from '../../../lib/subscription.js';
import { AppHeader, Sheet, Fab, Field, Btn, Spinner, EmptyState, PaywallSheet } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const fmtMonth = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '';

export default function AlbunsTab() {
  const nav = useNavigate();
  const sub = useSubscription();
  const [albums, setAlbums] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const load = () => api('/api/albums').then((d) => setAlbums(d.albums));
  useEffect(() => { load(); }, []);

  return (
    <div>
      <AppHeader back={() => nav('/app/momentos')} title="Álbuns" />

      {albums === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : albums.length === 0 ? (
        <EmptyState icon="image" title="Ainda sem histórias" actions={<Btn onClick={() => setSheet(true)} className="!px-5 !py-2.5 !text-sm">Criar álbum</Btn>}>
          Junte os momentos de vocês em álbuns por período, viagem ou tema.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {albums.map((a) => (
            <button key={a.id} onClick={() => nav(`/app/albuns/${a.id}`)} className="w-full text-left rounded-card overflow-hidden shadow-[0_1px_2px_rgba(43,37,33,.04),0_1px_0_var(--line)] bg-surface">
              {a.cover ? <img src={a.cover} alt="" className="w-full h-40 object-cover" /> : <div className="w-full h-40 bg-accent-soft grid place-items-center text-accent-press"><Icon name="image" size={32} /></div>}
              <div className="p-4"><p className="font-display text-lg">{a.title}</p><p className="text-sm text-ink-2">{fmtMonth(a.created_at)} · {a.photoCount} {a.photoCount === 1 ? 'momento' : 'momentos'}</p></div>
            </button>
          ))}
          {!sub.has('premium') && (
            <button onClick={() => setPaywall(true)} className="w-full flex items-center gap-3 rounded-card bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line-2)]">
              <span className="flex-none w-10 h-10 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="lock" size={18} /></span>
              <span className="flex-1 text-left"><span className="block font-medium">Retrospectiva "um ano atrás"</span><span className="block text-sm text-ink-2">Premium</span></span>
            </button>
          )}
        </div>
      )}

      <Fab onClick={() => setSheet(true)} label="Novo álbum" />
      {sheet && <AlbumSheet onClose={() => setSheet(false)} onSaved={(id) => { setSheet(false); nav(`/app/albuns/${id}`); }} />}
      {paywall && <PaywallSheet title="Retrospectivas & exportação" perks={['Exportar em alta resolução', 'Temas e capas', 'Retrospectiva anual']} onClose={() => setPaywall(false)} onActivate={sub.activatePremium} />}
    </div>
  );
}

function AlbumSheet({ onClose, onSaved }) {
  const [moments, setMoments] = useState(null);
  const [sel, setSel] = useState([]);
  const [form, setForm] = useState({ title: '', caption: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { api('/api/moments').then((d) => { setMoments(d.moments); setSel(d.moments.map((m) => m.id)); }); }, []);

  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try { const { album } = await api('/api/albums', { method: 'POST', body: { title: form.title.trim(), caption: form.caption, momentIds: sel } }); onSaved(album.id); }
    finally { setSaving(false); }
  }
  return (
    <Sheet title="Novo álbum" onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Título" placeholder="Nosso verão" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
        <label className="block mb-4"><span className="block text-sm font-medium text-ink-2 mb-1.5">Legenda de abertura</span>
          <textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Como foi esse período?"
            className="w-full rounded-btn bg-surface px-4 py-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none min-h-[70px]" /></label>
        <p className="text-sm font-medium text-ink-2 mb-2">Momentos {moments ? `(${sel.length}/${moments.length})` : ''}</p>
        {moments === null ? <div className="py-4 text-center"><Spinner /></div>
          : moments.length === 0 ? <p className="text-sm text-ink-3 mb-4">Registre momentos primeiro para montar um álbum.</p>
          : (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {moments.map((m) => (
                <button type="button" key={m.id} onClick={() => toggle(m.id)} className={`relative aspect-square rounded-card overflow-hidden ${sel.includes(m.id) ? 'shadow-[inset_0_0_0_3px_var(--accent)]' : 'shadow-[inset_0_0_0_1px_var(--line-2)]'}`}>
                  {m.photos?.[0] ? <img src={m.photos[0]} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full grid place-items-center bg-[var(--bg-tint)] text-ink-3 text-xs p-1 text-center">{m.text?.slice(0, 20) || '—'}</span>}
                  {sel.includes(m.id) && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent text-white grid place-items-center"><Icon name="check" size={12} /></span>}
                </button>
              ))}
            </div>
          )}
        <Btn type="submit" block disabled={saving || !form.title.trim()}>{saving ? <Spinner /> : 'Criar álbum'}</Btn>
      </form>
    </Sheet>
  );
}

export function AlbumDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [album, setAlbum] = useState(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(false);

  const load = () => api(`/api/albums/${id}`).then((d) => setAlbum(d.album)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  async function remove() {
    if (!confirm('Excluir este álbum?')) return;
    await api(`/api/albums/${id}`, { method: 'DELETE' });
    nav('/app/albuns');
  }

  if (err) return <div><AppHeader back={() => nav('/app/albuns')} title="Álbum" /><p className="text-ink-2 py-8 text-center">{err}</p></div>;
  if (!album) return <div className="py-10 text-center"><Spinner /></div>;

  const photos = album.moments.flatMap((m) => (m.photos || []).map((url) => ({ url, id: m.id })));
  return (
    <div>
      <AppHeader back={() => nav('/app/albuns')} title="Álbum"
        right={<div className="flex gap-1">
          <button onClick={() => setEdit(true)} aria-label="Editar" className="text-ink-3 hover:text-accent-press p-1"><Icon name="edit" size={17} /></button>
          <button onClick={remove} aria-label="Excluir" className="text-ink-3 hover:text-accent-press p-1"><Icon name="trash" size={17} /></button>
        </div>} />

      <h1 className="font-display text-2xl mb-1">{album.title}</h1>
      {album.caption && <p className="text-ink-2 mb-4">{album.caption}</p>}

      {photos.length === 0 ? (
        <EmptyState icon="image" title="Sem fotos">Os momentos deste álbum não têm fotos.</EmptyState>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p, i) => <img key={i} src={p.url} alt="" className="aspect-square rounded-card object-cover w-full" />)}
        </div>
      )}

      {edit && <EditSheet album={album} onClose={() => setEdit(false)} onSaved={(a) => { setAlbum(a); setEdit(false); }} />}
    </div>
  );
}

function EditSheet({ album, onClose, onSaved }) {
  const [form, setForm] = useState({ title: album.title, caption: album.caption || '' });
  const [saving, setSaving] = useState(false);
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try { const { album: a } = await api(`/api/albums/${album.id}`, { method: 'PATCH', body: form }); onSaved(a); }
    finally { setSaving(false); }
  }
  return (
    <Sheet title="Editar álbum" onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <label className="block mb-4"><span className="block text-sm font-medium text-ink-2 mb-1.5">Legenda</span>
          <textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })}
            className="w-full rounded-btn bg-surface px-4 py-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none min-h-[70px]" /></label>
        <Btn type="submit" block disabled={saving}>{saving ? <Spinner /> : 'Salvar'}</Btn>
      </form>
    </Sheet>
  );
}
