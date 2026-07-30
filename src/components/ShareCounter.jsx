import { useState } from 'react';
import { buildCaption, daysTogether, renderCounterPng } from '../lib/share-card.js';
import { track } from '../lib/subscription.js';
import { useToast } from '../lib/toast-context.js';
import { Btn, Sheet, Spinner } from '../ui/kit.jsx';
import Icon from '../ui/icons.jsx';

// O contador é a coisa mais compartilhável do app. Aqui ele vira imagem
// pronta pro story — com a assinatura discreta que traz gente nova.
export default function ShareCounter({ couple }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { url, blob, caption }

  const dados = {
    coupleName: couple.name,
    days: daysTogether(couple.milestone_date),
    milestoneLabel: couple.milestone_label,
    milestoneDate: couple.milestone_date,
  };

  async function gerar() {
    setBusy(true);
    try {
      const blob = await renderCounterPng(dados);
      const caption = buildCaption(dados);
      const file = new File([blob], 'chamego-contador.png', { type: 'image/png' });

      // No celular, o menu nativo já oferece Instagram, WhatsApp e Fotos.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
        track('contador_compartilhado', 'nativo');
        return;
      }
      setPreview({ url: URL.createObjectURL(blob), blob, caption });
      track('contador_compartilhado', 'preview');
    } catch (e) {
      if (e?.name !== 'AbortError') toast('Não conseguimos gerar a imagem agora.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function baixar() {
    const a = document.createElement('a');
    a.href = preview.url;
    a.download = 'chamego-contador.png';
    a.click();
    toast('Imagem salva ✓');
  }

  async function copiarLegenda() {
    await navigator.clipboard.writeText(preview.caption).catch(() => {});
    toast('Legenda copiada ✓');
  }

  return (
    <>
      <button onClick={gerar} disabled={busy}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent disabled:opacity-50">
        {busy ? <Spinner className="!w-4 !h-4" /> : <Icon name="image" size={15} />}
        Compartilhar nosso contador
      </button>

      {preview && (
        <Sheet title="Prontinho 💛" onClose={() => { URL.revokeObjectURL(preview.url); setPreview(null); }}>
          <img src={preview.url} alt="Card do contador de vocês" className="w-full max-h-[46vh] object-contain rounded-[18px] mb-4 bg-tint" />
          <Btn block onClick={baixar}>Salvar imagem</Btn>
          <button onClick={copiarLegenda} className="w-full text-center text-sm text-accent mt-3">Copiar legenda</button>
          <p className="text-center text-xs text-ink-3 mt-3">Poste no story e marque quem vive isso com você.</p>
        </Sheet>
      )}
    </>
  );
}
