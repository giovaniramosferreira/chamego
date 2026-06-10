import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Heart, ShieldCheck, CreditCard, QrCode, Copy, Check, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const slug = searchParams.get('slug') || '';
  const plan = searchParams.get('plan') || 'forever';
  const email = searchParams.get('email') || '';

  const price = plan === 'forever' ? 'R$ 39,90' : 'R$ 24,90';
  const planName = plan === 'forever' ? 'Plano Vitalício' : 'Plano Acesso 24 Horas';

  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [copiedPix, setCopiedPix] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Auto confirm after 10s for simulation or on-click
  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    
    // Retrieve pending data from sessionStorage
    const pendingDataStr = sessionStorage.getItem(`couple-page-draft-${slug}`);
    let pendingData = null;
    if (pendingDataStr) {
      pendingData = JSON.parse(pendingDataStr);
    }

    try {
      const payload = {
        slug,
        email,
        status: 'paid', // Active paid status!
        data: pendingData ? {
          titulo: pendingData.titulo,
          dataInicio: pendingData.dataInicio,
          mensagem: pendingData.mensagem,
          fotos: pendingData.fotos,
          musicaTitulo: pendingData.musicaTitulo,
          musicaUrl: pendingData.musicaUrl
        } : {}
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setPaymentSuccess(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

        setTimeout(() => {
          navigate(`/p/${slug}`);
        }, 3000);
      }
    } catch (e) {
      console.error("Payment confirmation failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText("00020126360014br.gov.bcb.pix0114chave-simulada5802BR5913PixSimulado6009SAOPAULO62070503***6304D1B2");
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className="min-h-screen bg-sugar-50 text-slate-800 font-sans flex flex-col justify-between select-none">
      
      <header className="border-b border-pink-100 bg-white/80 backdrop-blur-md py-4 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
          <span className="font-display font-black text-lg text-pink-600 tracking-tight">Chamego</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs">
          <ShieldCheck className="w-4.5 h-4.5" /> Ambiente Seguro
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-5 py-8 flex flex-col justify-center">
        
        {paymentSuccess ? (
          /* Success Screen */
          <div className="bg-white border border-pink-100 rounded-[32px] p-8 shadow-xl shadow-pink-100/30 text-center flex flex-col items-center gap-4 animate-bounce">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-3xl shadow-sm">
              🎉
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-display">Pagamento Confirmado!</h1>
            <p className="text-sm text-slate-500 font-bold leading-relaxed max-w-sm">
              Sua surpresa de amor está no ar! Estamos te redirecionando para a sua página final em segundos...
            </p>
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mt-2" />
          </div>
        ) : (
          /* Checkout Screen */
          <div className="bg-white border border-pink-100 rounded-[32px] p-6 shadow-xl shadow-pink-100/30 flex flex-col gap-6">
            
            {/* Summary */}
            <div className="bg-slate-50 border border-pink-100 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wide">Produto</p>
                <p className="font-black text-slate-800 text-sm mt-0.5">{planName}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wide">Total</p>
                <p className="font-black text-pink-600 text-lg mt-0.5">{price}</p>
              </div>
            </div>

            {/* Selector Method */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setPaymentMethod('pix')}
                className={`py-3 border font-black text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'pix' 
                    ? 'border-pink-500 bg-pink-50/60 text-pink-600 shadow-md shadow-pink-100/20' 
                    : 'border-pink-100 bg-white text-slate-500 hover:border-pink-300'
                }`}
              >
                <QrCode className="w-4 h-4" /> Pix Copia e Cola
              </button>
              <button 
                onClick={() => setPaymentMethod('card')}
                className={`py-3 border font-black text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'card' 
                    ? 'border-pink-500 bg-pink-50/60 text-pink-600 shadow-md shadow-pink-100/20' 
                    : 'border-pink-100 bg-white text-slate-500 hover:border-pink-300'
                }`}
              >
                <CreditCard className="w-4 h-4" /> Cartão de Crédito
              </button>
            </div>

            {/* PIX Content */}
            {paymentMethod === 'pix' ? (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="border border-pink-100 p-3 bg-white rounded-2xl shadow-sm">
                  {/* Fake QR code representation */}
                  <div className="w-36 h-36 bg-slate-100 flex items-center justify-center border border-dashed border-slate-300">
                    <QrCode className="w-20 h-20 text-slate-800" />
                  </div>
                </div>
                
                <p className="text-[11px] font-bold text-slate-400 text-center max-w-xs leading-relaxed">
                  Escaneie o QR Code acima ou use a chave copia e cola abaixo para efetuar o pagamento.
                </p>

                <div className="w-full flex gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value="00020126360014br.gov.bcb.pix0114chave-simulada5802BR..."
                    className="flex-1 px-3 py-2 border border-pink-200 bg-slate-50 rounded-xl font-bold text-xs text-slate-500 focus:outline-none"
                  />
                  <button 
                    onClick={handleCopyPix}
                    className="px-4 py-2 bg-pink-600 border border-transparent text-white rounded-xl font-black text-xs hover:bg-pink-700 shadow-md shadow-pink-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPix ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            ) : (
              /* Card Content */
              <div className="flex flex-col gap-3">
                <input 
                  type="text" 
                  placeholder="Número do Cartão" 
                  disabled
                  className="w-full px-4 py-2.5 border border-pink-100 rounded-xl font-bold text-xs bg-slate-50 text-slate-400 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="Validade (MM/AA)" 
                    disabled
                    className="w-full px-4 py-2.5 border border-pink-100 rounded-xl font-bold text-xs bg-slate-50 text-slate-400 focus:outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="CVV" 
                    disabled
                    className="w-full px-4 py-2.5 border border-pink-100 rounded-xl font-bold text-xs bg-slate-50 text-slate-400 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold text-center">*(Para testes, utilize o pagamento por Pix Simulador abaixo)*</p>
              </div>
            )}

            {/* Test Simulation Confirmation Button */}
            <button 
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-base font-bold text-white transition-all duration-200 cursor-pointer select-none shadow-lg shadow-emerald-500/25 hover:scale-[1.01] hover:shadow-xl hover:shadow-emerald-500/35"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 animate-bounce" />}
              {isProcessing ? 'Confirmando Pagamento...' : 'Simular Confirmação de Pagamento (Testar E2E)'}
            </button>

            {/* Secure Footer */}
            <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 border-t border-pink-50 pt-4 mt-2">
              <span className="flex items-center gap-1">🔒 Gateway Seguro</span>
              <span className="flex items-center gap-1">🛡️ Garantia de 7 dias</span>
            </div>

          </div>
        )}

      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-pink-100 bg-white">
        © 2026 Chamego · Seguro e Criptografado 🔒
      </footer>

    </div>
  );
}
