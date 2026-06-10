import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, Loader2, Mail, RefreshCw } from 'lucide-react';

export default function LoveLetterCard({ coupleData }) {
  const [cartaDeAmor, setCartaDeAmor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false);

  const handleGenerateLetter = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/ai/love-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: coupleData.titulo,
          nome1: coupleData.nome1,
          nome2: coupleData.nome2,
          dataInicio: coupleData.dataInicio,
          mensagem: coupleData.mensagem,
          conquistas: coupleData.conquistas,
          horoscopoTexto: coupleData.horoscopoTexto,
          sugestaoDates: coupleData.sugestaoDates,
          cupidoComentario: coupleData.cupidoComentario,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCartaDeAmor(data.cartaDeAmor);
        // Animate envelope opening
        setTimeout(() => setIsEnvelopeOpen(true), 300);
        setTimeout(() => setIsRevealed(true), 800);
      }
    } catch (error) {
      console.error('Failed to generate love letter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-rose-50/95 via-pink-50/80 to-amber-50/60 backdrop-blur-md border border-pink-200/60 rounded-[40px] p-8 shadow-2xl shadow-rose-100/40 relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute -right-16 -top-16 w-40 h-40 bg-pink-300/15 rounded-full blur-3xl z-0"></div>
      <div className="absolute -left-16 -bottom-16 w-40 h-40 bg-rose-300/15 rounded-full blur-3xl z-0"></div>

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-pink-200/40 pb-5">
          <div className="text-center sm:text-left">
            <h3 className="font-black text-slate-900 text-2xl font-display flex items-center justify-center sm:justify-start gap-2">
              Carta de Amor com IA <Sparkles className="w-5 h-5 text-pink-500 fill-pink-500/20 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
              Uma carta única gerada especialmente para vocês
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 border border-pink-200 flex items-center justify-center shadow-md shadow-pink-100/30">
            <Mail className="w-6 h-6 text-pink-500" />
          </div>
        </div>

        {/* Content */}
        {!cartaDeAmor ? (
          <div className="flex flex-col items-center gap-5 py-6">
            {/* Envelope Animation */}
            <div className="relative">
              <div className="w-24 h-20 bg-gradient-to-br from-pink-100 to-rose-200 rounded-2xl border border-pink-200 shadow-lg shadow-pink-100/40 flex items-center justify-center relative overflow-hidden">
                {/* Envelope flap */}
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-br from-pink-200 to-rose-300 rounded-t-2xl" 
                  style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} 
                />
                <Heart className="w-8 h-8 text-pink-500 fill-pink-400 z-10 mt-2 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-100 border border-amber-200 rounded-full flex items-center justify-center text-xs shadow">
                ✨
              </div>
            </div>
            
            <div className="text-center max-w-sm">
              <p className="text-sm font-bold text-slate-600 leading-relaxed">
                A inteligência artificial vai analisar toda a história de vocês e escrever uma carta de amor <span className="text-pink-600 font-black">única e personalizada</span>.
              </p>
              <p className="text-[10px] text-slate-400 font-bold mt-2">
                Baseada nos nomes, tempo juntos, conquistas, horóscopo e mensagens
              </p>
            </div>

            <button
              onClick={handleGenerateLetter}
              disabled={isLoading}
              className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-8 py-4 text-sm font-bold text-white transition-all duration-200 cursor-pointer shadow-lg shadow-pink-500/25 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/35 disabled:opacity-60 disabled:cursor-not-allowed gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Escrevendo com amor...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Minha Carta de Amor 💌
                </>
              )}
            </button>
          </div>
        ) : (
          <div className={`transition-all duration-1000 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Letter Content */}
            <div className="bg-white/90 backdrop-blur-sm border border-pink-100 rounded-3xl p-6 sm:p-8 shadow-inner relative">
              {/* Paper texture */}
              <div className="absolute inset-0 opacity-5 rounded-3xl" 
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.15\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E")' }} 
              />
              
              <div className="relative z-10">
                <span className="absolute -left-2 -top-6 text-6xl text-pink-200/30 font-serif font-black select-none">"</span>
                <p className="font-serif italic text-slate-700 text-base leading-loose whitespace-pre-line text-center sm:text-left px-3">
                  {cartaDeAmor}
                </p>
                <span className="absolute -right-2 -bottom-8 text-6xl text-pink-200/30 font-serif font-black select-none">"</span>
              </div>
            </div>

            {/* Regenerate Button */}
            <div className="flex justify-center mt-5">
              <button
                onClick={() => { setCartaDeAmor(''); setIsRevealed(false); setIsEnvelopeOpen(false); }}
                className="flex items-center gap-2 text-xs font-bold text-pink-500 hover:text-pink-600 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Gerar outra carta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
