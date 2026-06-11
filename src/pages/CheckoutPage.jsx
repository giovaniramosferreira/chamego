import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import confetti from 'canvas-confetti';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const slug =
    searchParams.get('slug') ||
    sessionStorage.getItem('chamego-slug') ||
    '';

  // ── State machine: 'form' | 'pix' | 'success'
  const [stage, setStage] = useState('form');

  // form state
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // pix state
  const [qrCode, setQrCode] = useState('');
  const [qrCodeBase64, setQrCodeBase64] = useState('');
  const [copied, setCopied] = useState(false);

  // success
  const qrRef = useRef(null);
  const pollingRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── No slug: friendly empty state
  if (!slug) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-5 text-center">
        <h1 className="font-display italic text-3xl text-wine-700 mb-4">Hmm…</h1>
        <p className="text-ink-600 mb-6">Parece que você chegou aqui sem uma página em criação.</p>
        <Link to="/criar" className="btn-primary">Criar nossa página</Link>
      </div>
    );
  }

  // ── Handlers
  async function handleGeneratePix() {
    setIsLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email: email.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Erro ao gerar Pix. Tente novamente.');
        return;
      }

      if (data.alreadyPublished) {
        setStage('success');
        return;
      }

      setQrCode(data.qrCode);
      setQrCodeBase64(data.qrCodeBase64);
      setStage('pix');
      startPolling(data.paymentId);
    } catch {
      setFormError('Falha de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  function startPolling(id) {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${id}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'approved') {
          clearInterval(pollingRef.current);
          localStorage.setItem('couple-page-last', slug);
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          setStage('success');
        }
      } catch {
        // silently ignore polling errors
      }
    }, 4000);
  }

  function handleCopy() {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const publicUrl = `${window.location.origin}/p/${slug}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadQR() {
    const container = qrRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'chamego-qrcode.png';
    a.click();
  }

  // ── Render
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Minimal header */}
      <header className="py-5 px-5 border-b border-ink-900/10 bg-cream-50">
        <Link to="/" className="font-display italic text-wine-700 text-xl">
          Chamego
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        {stage === 'form' && (
          <div className="card max-w-md w-full p-8 flex flex-col gap-6">
            <div>
              <p className="eyebrow mb-2">Finalizar</p>
              <h1 className="font-display text-3xl text-ink-900">
                Publicar a página de vocês
              </h1>
            </div>

            {/* Summary row */}
            <div className="flex items-center justify-between py-4 border-t border-b border-ink-900/10">
              <span className="text-ink-600 text-sm">Página do Casal · vitalícia</span>
              <span className="font-display text-4xl text-ink-900 leading-none">R$ 19,90</span>
            </div>

            {/* Optional email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="checkout-email" className="text-sm text-ink-600">
                E-mail <span className="text-ink-400">(opcional) — para recibo</span>
              </label>
              <input
                id="checkout-email"
                type="email"
                inputMode="email"
                className="input-base"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {formError && (
              <div className="card p-4 bg-wine-100 border-wine-700/20">
                <p className="text-sm text-wine-700">{formError}</p>
              </div>
            )}

            <button
              onClick={handleGeneratePix}
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Gerando Pix…' : 'Gerar Pix'}
            </button>
          </div>
        )}

        {stage === 'pix' && (
          <div className="card max-w-md w-full p-8 flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="eyebrow mb-2">Pagamento</p>
              <h1 className="font-display text-3xl text-ink-900">Pague com Pix</h1>
            </div>

            {qrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                className="w-56 h-56 mx-auto rounded-xl ring-1 ring-ink-900/10"
                alt="QR Code Pix"
              />
            ) : (
              <div className="w-56 h-56 mx-auto rounded-xl ring-1 ring-ink-900/10 bg-cream-100 flex items-center justify-center">
                <span className="text-ink-400 text-sm">Carregando QR…</span>
              </div>
            )}

            <p className="text-sm text-ink-600 text-center">
              Abra o app do seu banco e escaneie, ou use o copia-e-cola:
            </p>

            {/* Copia-e-cola */}
            <div className="card p-3 flex items-center gap-3 w-full">
              <span className="text-xs text-ink-600 truncate flex-1 min-w-0">
                {qrCode}
              </span>
              <button
                onClick={handleCopy}
                className="btn-ghost flex-shrink-0 text-sm px-4 py-2 min-h-[44px]"
              >
                {copied ? 'Copiado ✓' : 'Copiar'}
              </button>
            </div>

            {/* Status pulse */}
            <p className="text-sm text-ink-400 animate-pulse">
              Aguardando pagamento…
            </p>
          </div>
        )}

        {stage === 'success' && (
          <div className="card max-w-md w-full p-8 flex flex-col items-center gap-6 text-center">
            <div>
              <h1 className="font-display text-4xl text-ink-900 mb-2">No ar! 🎉</h1>
              <p className="text-ink-600">A página de vocês está publicada para sempre.</p>
            </div>

            {/* Public URL card */}
            <div className="card p-4 flex items-center gap-3 w-full">
              <span className="text-xs text-ink-600 truncate flex-1 min-w-0 text-left">
                {publicUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="btn-ghost flex-shrink-0 text-sm px-4 py-2 min-h-[44px]"
              >
                {copied ? 'Copiado ✓' : 'Copiar'}
              </button>
            </div>

            {/* QR Code of the page link */}
            <div ref={qrRef} className="flex flex-col items-center gap-3">
              <QRCodeCanvas
                value={publicUrl}
                size={200}
                bgColor="#FAF7F2"
                fgColor="#1A1714"
              />
              <button onClick={handleDownloadQR} className="btn-ghost text-sm min-h-[44px]">
                Baixar QR Code
              </button>
            </div>

            <button
              onClick={() =>
                window.open(
                  'https://wa.me/?text=' +
                    encodeURIComponent('Fiz uma surpresa pra você 💌 ' + publicUrl)
                )
              }
              className="btn-primary w-full"
            >
              Compartilhar no WhatsApp
            </button>

            <button
              onClick={() => navigate(`/p/${slug}`)}
              className="btn-ghost w-full"
            >
              Ver nossa página
            </button>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-ink-400">
        © 2026 Chamego · Pagamento seguro via Mercado Pago
      </footer>
    </div>
  );
}
