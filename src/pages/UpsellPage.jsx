import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Heart, Sparkles, AlertCircle, Film, ArrowRight } from 'lucide-react';

export default function UpsellPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const slug = searchParams.get('slug') || '';

  const handleChoosePlan = (plan) => {
    navigate(`/classico/criar/email?slug=${slug}&plan=${plan}`);
  };

  return (
    <div className="min-h-screen bg-sugar-50 text-slate-800 font-sans flex flex-col justify-between select-none">
      
      {/* Header element */}
      <header className="border-b border-pink-100 bg-white/80 backdrop-blur-md py-4 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
          <span className="font-display font-black text-lg text-pink-600 tracking-tight">Chamego</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl mx-auto w-full px-5 py-10 flex flex-col justify-center">
        
        <div className="bg-white border border-pink-100 rounded-[32px] p-8 shadow-xl shadow-pink-100/30 text-center relative overflow-hidden">
          
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-100 rounded-full opacity-50 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-rose-500 animate-spin" />
          </div>

          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-pink-200 flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm">
            🎬
          </div>

          <h1 className="text-3xl font-black text-slate-905 font-display">
            Sua Mini Série de Amor
          </h1>
          
          <p className="mt-4 text-sm text-slate-500 font-bold leading-relaxed max-w-md mx-auto">
            Deseja adicionar a retrospectiva dinâmica na sua página? Ela conta a história de vocês através de 8 cenas com animações incríveis.
          </p>

          {/* Upsell box */}
          <div className="bg-rose-50/50 border border-pink-200 rounded-2xl p-5 my-8 flex items-start gap-4 text-left shadow-md shadow-pink-100/10">
            <Film className="w-12 h-12 text-pink-500 flex-shrink-0 border border-pink-150 rounded-lg bg-white p-2" />
            <div>
              <p className="font-black text-slate-900 text-sm">Tema Clássico + Retrospectiva Vitalícia</p>
              <p className="text-xs text-slate-500 font-bold mt-1">
                Todas as 8 cenas inclusas: Lua, Astrologia, Álbum, Word Puzzle, Roleta do Amor e muito mais.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-sm line-through text-slate-400 font-bold">De R$ 59,90</span>
                <span className="text-base font-black text-rose-600">Por R$ 39,90</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleChoosePlan('forever')}
              className="btn-3d-primary text-base py-4 w-full flex items-center justify-center gap-2"
            >
              ❤️ Adicionar à minha surpresa (R$ 39,90) <ArrowRight className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => handleChoosePlan('24h')}
              className="font-bold text-xs text-slate-400 hover:text-slate-600 transition-colors py-2 cursor-pointer"
            >
              Não, quero apenas a página simples de 24 horas (R$ 24,90)
            </button>
          </div>

        </div>

      </main>

      {/* Footer copyright */}
      <footer className="text-center py-6 text-xs text-slate-400 border-t border-pink-100 bg-white">
        © 2026 Chamego · Compra 100% Protegida 🔒
      </footer>

    </div>
  );
}
