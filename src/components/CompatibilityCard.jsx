import { useState, useEffect } from 'react';
import { Heart, Users, MessageCircle, Compass, Zap } from 'lucide-react';

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
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-600">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          {label}
        </div>
        <span className="text-xs font-semibold" style={{ color }}>{currentValue}%</span>
      </div>
      <div className="h-2.5 bg-cream-100 rounded-full overflow-hidden border border-cream-200">
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

export default function CompatibilityCard({ coupleData, compatibilidade }) {
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowScores(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (!compatibilidade) return null;

  return (
    <div className="card p-8 relative overflow-hidden">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-ink-900/10 pb-5">
          <div className="text-center sm:text-left">
            <p className="eyebrow mb-1">Compatibilidade do casal</p>
            <h3 className="font-display text-2xl font-semibold text-ink-900 flex items-center justify-center sm:justify-start gap-2">
              Análise de Compatibilidade <Zap className="w-5 h-5 text-wine-700 fill-wine-100" />
            </h3>
          </div>

          {coupleData?.signo1 && coupleData?.signo2 && (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center bg-cream-50 border border-cream-200 px-3 py-1.5 rounded-2xl shadow-sm">
                <span className="text-lg leading-none">{coupleData.signo1.symbol}</span>
                <span className="text-[7px] font-semibold text-ink-400 uppercase mt-0.5">{coupleData.signo1.name}</span>
              </div>
              <Heart className="w-4 h-4 text-wine-700 fill-wine-100 animate-pulse" />
              <div className="flex flex-col items-center bg-cream-50 border border-cream-200 px-3 py-1.5 rounded-2xl shadow-sm">
                <span className="text-lg leading-none">{coupleData.signo2.symbol}</span>
                <span className="text-[7px] font-semibold text-ink-400 uppercase mt-0.5">{coupleData.signo2.name}</span>
              </div>
            </div>
          )}
        </div>

        <div className={`flex flex-col gap-6 transition-all duration-700 ${showScores ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Main Score Circle */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#F7E3E9" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="url(#scoreGradientCC)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(compatibilidade.scoreGeral / 100) * 327} 327`}
                  className="transition-all duration-1000"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(179,40,79,0.35))' }}
                />
                <defs>
                  <linearGradient id="scoreGradientCC" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#B3284F" />
                    <stop offset="100%" stopColor="#C9355F" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-semibold text-ink-900 leading-none">{compatibilidade.scoreGeral}%</span>
                <span className="text-[8px] font-semibold text-wine-700 uppercase tracking-wider">match</span>
              </div>
            </div>
            <p className="font-display italic text-ink-600 text-center max-w-sm px-4">
              &ldquo;{compatibilidade.frase}&rdquo;
            </p>
          </div>

          {/* Individual Score Bars */}
          <div className="flex flex-col gap-4 bg-cream-50 border border-cream-200 rounded-3xl p-5">
            <AnimatedProgress label="Amor & Paixão" icon={Heart} value={compatibilidade.scoreAmor} color="#B3284F" delay={200} />
            <AnimatedProgress label="Companheirismo" icon={Users} value={compatibilidade.scoreCompanheirismo} color="#C9355F" delay={400} />
            <AnimatedProgress label="Comunicação" icon={MessageCircle} value={compatibilidade.scoreComunicacao} color="#5C554C" delay={600} />
            <AnimatedProgress label="Aventura" icon={Compass} value={compatibilidade.scoreAventura} color="#948C80" delay={800} />
          </div>
        </div>
      </div>
    </div>
  );
}
