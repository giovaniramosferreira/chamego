import { useEffect, useRef, useState } from 'react';

// A roda. Gira com atrito de verdade (desacelera até parar) e sempre para na
// fatia que o servidor já escolheu — o sorteio é do backend, o suspense é daqui.
// Sem `prefers-reduced-motion`, a animação é curta e sem piscar.
const FATIAS = 8;
const CORES = ['var(--accent)', 'var(--accent-press)'];

export default function Roleta({ girando, paradaEm = null, onGirar, disabled }) {
  const [angulo, setAngulo] = useState(0);
  const raf = useRef(0);

  // Quando o resultado chega, calcula onde parar e anima até lá.
  useEffect(() => {
    if (paradaEm === null) return;
    const fatia = 360 / FATIAS;
    const destino = 360 * 3 + (paradaEm % FATIAS) * fatia + fatia / 2;
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const inicio = performance.now();
    const partida = angulo % 360;
    // Quem pediu menos movimento recebe o resultado quase na hora.
    const duracao = reduzido ? 1 : 2200;
    const passo = (t) => {
      const p = Math.min(1, (t - inicio) / duracao);
      // desaceleração forte no fim: sensação de atrito, não de motor
      const eased = 1 - Math.pow(1 - p, 3.2);
      setAngulo(partida + (destino - partida) * eased);
      if (p < 1) raf.current = requestAnimationFrame(passo);
    };
    raf.current = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paradaEm]);

  // Enquanto espera o servidor, roda solto — a espera vira parte do ritual.
  useEffect(() => {
    if (!girando || paradaEm !== null) return;
    let ativo = true;
    const loop = () => {
      if (!ativo) return;
      setAngulo((a) => a + 14);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { ativo = false; cancelAnimationFrame(raf.current); };
  }, [girando, paradaEm]);

  const fatia = 360 / FATIAS;
  return (
    <div className="relative mx-auto" style={{ width: 260, height: 260 }}>
      {/* ponteiro */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10 w-0 h-0"
        style={{ borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '16px solid var(--ink)' }} />
      <svg viewBox="0 0 200 200" width="260" height="260"
        style={{ transform: `rotate(${angulo}deg)`, transition: 'none' }}>
        {Array.from({ length: FATIAS }, (_, i) => {
          const a1 = (i * fatia - 90) * (Math.PI / 180);
          const a2 = ((i + 1) * fatia - 90) * (Math.PI / 180);
          const x1 = 100 + 96 * Math.cos(a1);
          const y1 = 100 + 96 * Math.sin(a1);
          const x2 = 100 + 96 * Math.cos(a2);
          const y2 = 100 + 96 * Math.sin(a2);
          return (
            <path key={i} d={`M100 100 L${x1} ${y1} A96 96 0 0 1 ${x2} ${y2} Z`}
              fill={CORES[i % 2]} opacity={i % 2 ? 0.9 : 1} />
          );
        })}
        <circle cx="100" cy="100" r="34" fill="var(--surface)" />
        <text x="100" y="106" textAnchor="middle" className="font-display"
          style={{ fontSize: 22, fill: 'var(--accent-press)', fontStyle: 'italic' }}>hoje</text>
      </svg>

      <button onClick={onGirar} disabled={disabled || girando}
        className="absolute inset-0 rounded-full disabled:opacity-100"
        aria-label="Girar a roda">
        <span className="sr-only">Girar</span>
      </button>
    </div>
  );
}
