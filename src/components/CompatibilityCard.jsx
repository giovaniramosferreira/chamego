import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Heart, Users, MessageCircle, Compass, Zap } from 'lucide-react';

function AnimatedProgress({ label, icon: Icon, value, color, delay }) {
  const [currentValue, setCurrentValue] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const step = () => {
        start += 1;
        setCurrentValue(Math.min(start, value));
        if (start < value) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-black text-slate-600">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          {label}
        </div>
        <span className="text-xs font-black" style={{ color }}>{currentValue}%</span>
      </div>
      <div className="h-2.5 bg-pink-50 rounded-full overflow-hidden border border-pink-100">
        <div 
          className="h-full rounded-full transition-all duration-100 ease-out"
          style={{ 
            width: `${currentValue}%`, 
            background: `linear-gradient(to right, ${color}, ${color}dd)`,
            boxShadow: `0 0 12px ${color}40`
          }}
        />
      </div>
    </div>
  );
}

export default function CompatibilityCard({ coupleData }) {
  const [compatibility, setCompatibility] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showScores, setShowScores] = useState(false);

  const handleGenerateCompatibility = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome1: coupleData.nome1,
          nome2: coupleData.nome2,
          signo1: coupleData.signo1,
          signo2: coupleData.signo2,
          dataInicio: coupleData.dataInicio,
          conquistas: coupleData.conquistas,
          mensagem: coupleData.mensagem,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompatibility(data);
        setTimeout(() => setShowScores(true), 400);
      }
    } catch (error) {
      console.error('Failed to generate compatibility:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50/80 via-pink-50/60 to-rose-50/80 backdrop-blur-md border border-purple-200/40 rounded-[40px] p-8 shadow-2xl shadow-purple-100/30 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute -right-16 -top-16 w-40 h-40 bg-purple-300/10 rounded-full blur-3xl z-0"></div>
      <div className="absolute -left-16 -bottom-16 w-40 h-40 bg-pink-300/10 rounded-full blur-3xl z-0"></div>

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-purple-200/30 pb-5">
          <div className="text-center sm:text-left">
            <h3 className="font-black text-slate-900 text-2xl font-display flex items-center justify-center sm:justify-start gap-2">
              Análise de Compatibilidade <Zap className="w-5 h-5 text-purple-500 fill-purple-500/20" />
            </h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
              Análise profunda gerada por inteligência artificial
            </p>
          </div>

          {coupleData.signo1 && coupleData.signo2 && (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center bg-white/80 border border-purple-100 px-3 py-1.5 rounded-2xl shadow-sm">
                <span className="text-lg leading-none">{coupleData.signo1.symbol}</span>
                <span className="text-[7px] font-black text-purple-400 uppercase mt-0.5">{coupleData.signo1.name}</span>
              </div>
              <Heart className="w-4 h-4 text-pink-400 fill-pink-400 animate-pulse" />
              <div className="flex flex-col items-center bg-white/80 border border-purple-100 px-3 py-1.5 rounded-2xl shadow-sm">
                <span className="text-lg leading-none">{coupleData.signo2.symbol}</span>
                <span className="text-[7px] font-black text-purple-400 uppercase mt-0.5">{coupleData.signo2.name}</span>
              </div>
            </div>
          )}
        </div>

        {!compatibility ? (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200 flex items-center justify-center shadow-lg shadow-purple-100/30">
              <span className="text-3xl">💜</span>
            </div>
            <p className="text-sm font-bold text-slate-600 text-center max-w-sm leading-relaxed">
              Descubra o <span className="text-purple-600 font-black">nível de compatibilidade</span> do casal em amor, companheirismo, comunicação e aventura.
            </p>
            <button
              onClick={handleGenerateCompatibility}
              disabled={isLoading}
              className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 text-sm font-bold text-white transition-all duration-200 cursor-pointer shadow-lg shadow-purple-500/25 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/35 disabled:opacity-60 gap-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analisando com IA...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Analisar Compatibilidade 🔮</>
              )}
            </button>
          </div>
        ) : (
          <div className={`flex flex-col gap-6 transition-all duration-700 ${showScores ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {/* Main Score Circle */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-28 h-28">
                {/* Background circle */}
                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#f3e8ff" strokeWidth="8" />
                  <circle 
                    cx="60" cy="60" r="52" fill="none" 
                    stroke="url(#scoreGradient)" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray={`${(compatibility.scoreGeral / 100) * 327} 327`}
                    className="transition-all duration-1000"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.4))' }}
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900 font-display leading-none">{compatibility.scoreGeral}%</span>
                  <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider">match</span>
                </div>
              </div>
              <p className="text-sm font-serif italic text-slate-600 text-center max-w-sm px-4">
                "{compatibility.frase}"
              </p>
            </div>

            {/* Individual Score Bars */}
            <div className="flex flex-col gap-4 bg-white/60 border border-purple-100/50 rounded-3xl p-5">
              <AnimatedProgress label="Amor & Paixão" icon={Heart} value={compatibility.scoreAmor} color="#ec4899" delay={200} />
              <AnimatedProgress label="Companheirismo" icon={Users} value={compatibility.scoreCompanheirismo} color="#a855f7" delay={400} />
              <AnimatedProgress label="Comunicação" icon={MessageCircle} value={compatibility.scoreComunicacao} color="#8b5cf6" delay={600} />
              <AnimatedProgress label="Aventura" icon={Compass} value={compatibility.scoreAventura} color="#f59e0b" delay={800} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
