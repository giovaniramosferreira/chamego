import { useMemo } from 'react';
import { MapPin, Heart } from 'lucide-react';

/* ─── seeded PRNG (Linear Congruential Generator) ─── */
function createRNG(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function dateToSeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

/* ─── star & constellation generation ─── */
function generateStars(rng, count = 120, cx = 160, cy = 160, radius = 140) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * radius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const size = rng() < 0.1 ? 2 + rng() * 1.2 : 0.6 + rng() * 1.4;
    const brightness = 0.4 + rng() * 0.6;
    const twinkle = rng() < 0.18;
    const delay = rng() * 4;
    stars.push({ x, y, size, brightness, twinkle, delay, id: i });
  }
  return stars;
}

function generateConstellations(stars, rng, groupCount = 6) {
  const constellations = [];
  const used = new Set();

  for (let g = 0; g < groupCount; g++) {
    const lineCount = 3 + Math.floor(rng() * 3); // 3-5 stars per group
    const available = stars.filter((s) => !used.has(s.id));
    if (available.length < lineCount) break;

    // pick a random starting star
    const startIdx = Math.floor(rng() * available.length);
    const group = [available[startIdx]];
    used.add(available[startIdx].id);

    for (let j = 1; j < lineCount; j++) {
      const last = group[group.length - 1];
      // find nearest unused star
      let nearest = null;
      let nearestDist = Infinity;
      for (const s of available) {
        if (used.has(s.id)) continue;
        const d = Math.hypot(s.x - last.x, s.y - last.y);
        if (d < nearestDist && d > 10) {
          nearestDist = d;
          nearest = s;
        }
      }
      if (nearest && nearestDist < 80) {
        group.push(nearest);
        used.add(nearest.id);
      }
    }

    if (group.length >= 2) {
      const lines = [];
      for (let k = 0; k < group.length - 1; k++) {
        lines.push({ x1: group[k].x, y1: group[k].y, x2: group[k + 1].x, y2: group[k + 1].y });
      }
      constellations.push(lines);
    }
  }
  return constellations;
}

/* ─── month names ─── */
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')} de ${MESES[m - 1]} de ${y}`;
}

/* ─── keyframe styles (injected once) ─── */
const twinkleCSS = `
@keyframes starTwinkle {
  0%, 100% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.25); }
}
@keyframes softPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes floatBlob {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(6px, -8px) scale(1.05); }
  66% { transform: translate(-4px, 5px) scale(0.97); }
}
`;

/* ─── Component ─── */
export default function StarMapCard({ dataInicio = '2023-05-15', cidade = '', bairro = '', nomes = '' }) {
  const { stars, constellations } = useMemo(() => {
    const seed = dateToSeed(dataInicio);
    const rng = createRNG(seed);
    const s = generateStars(rng);
    const c = generateConstellations(s, rng);
    return { stars: s, constellations: c };
  }, [dataInicio]);

  const formattedDate = useMemo(() => formatDate(dataInicio), [dataInicio]);

  const CX = 160;
  const CY = 160;
  const R = 140;

  const compassPoints = [
    { label: 'N', x: CX, y: CY - R - 12 },
    { label: 'S', x: CX, y: CY + R + 16 },
    { label: 'E', x: CX + R + 14, y: CY + 4 },
    { label: 'W', x: CX - R - 14, y: CY + 4 },
  ];

  return (
    <>
      <style>{twinkleCSS}</style>

      <div
        className="relative w-full max-w-md mx-auto overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e1b4b 100%)',
          borderRadius: '40px',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          boxShadow: '0 25px 60px -12px rgba(30, 27, 75, 0.55), 0 0 80px -20px rgba(99, 102, 241, 0.12)',
        }}
      >
        {/* ── decorative gradient blobs ── */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'floatBlob 12s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-30px',
            left: '-30px',
            width: '180px',
            height: '180px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'floatBlob 15s ease-in-out infinite reverse',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -60%)',
            width: '260px',
            height: '260px',
            background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        {/* ── content ── */}
        <div className="relative z-10 flex flex-col items-center px-6 pt-8 pb-10 sm:px-8 sm:pt-10 sm:pb-12">
          {/* names header */}
          {nomes && (
            <div className="flex items-center gap-2 mb-5">
              <Heart size={14} fill="#f9a8d4" stroke="none" style={{ opacity: 0.7 }} />
              <span
                className="font-display tracking-widest text-xs uppercase"
                style={{ color: 'rgba(249,168,212,0.8)', letterSpacing: '0.2em' }}
              >
                {nomes}
              </span>
              <Heart size={14} fill="#f9a8d4" stroke="none" style={{ opacity: 0.7 }} />
            </div>
          )}

          {/* ── star map SVG ── */}
          <div className="relative" style={{ width: '320px', height: '320px' }}>
            <svg
              viewBox="0 0 320 320"
              width="320"
              height="320"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* glow filter for bright stars */}
                <filter id="starGlow" x="-200%" y="-200%" width="500%" height="500%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* radial fade for the sky disc */}
                <radialGradient id="skyGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="#0f172a" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.85" />
                </radialGradient>

                {/* ring gradient */}
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="rgba(139,92,246,0.35)" />
                  <stop offset="50%" stopColor="rgba(99,102,241,0.2)" />
                  <stop offset="100%" stopColor="rgba(167,139,250,0.35)" />
                </linearGradient>
              </defs>

              {/* sky background disc */}
              <circle cx={CX} cy={CY} r={R} fill="url(#skyGrad)" />

              {/* constellation lines */}
              {constellations.map((group, gi) =>
                group.map((line, li) => (
                  <line
                    key={`c-${gi}-${li}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="rgba(167,139,250,0.2)"
                    strokeWidth="0.6"
                    strokeLinecap="round"
                  />
                ))
              )}

              {/* stars */}
              {stars.map((star) => (
                <circle
                  key={star.id}
                  cx={star.x}
                  cy={star.y}
                  r={star.size}
                  fill={star.brightness > 0.8 ? '#e0e7ff' : '#c7d2fe'}
                  opacity={star.brightness}
                  filter={star.size > 2.5 ? 'url(#starGlow)' : undefined}
                  style={
                    star.twinkle
                      ? {
                          animation: `starTwinkle ${2.5 + star.delay * 0.8}s ease-in-out ${star.delay}s infinite`,
                          transformOrigin: `${star.x}px ${star.y}px`,
                        }
                      : undefined
                  }
                />
              ))}

              {/* outer ring */}
              <circle
                cx={CX}
                cy={CY}
                r={R}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="1.2"
              />
              {/* subtle inner ring */}
              <circle
                cx={CX}
                cy={CY}
                r={R - 6}
                fill="none"
                stroke="rgba(139,92,246,0.08)"
                strokeWidth="0.5"
              />

              {/* tick marks every 30° */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180 - Math.PI / 2;
                const x1 = CX + Math.cos(angle) * (R - 3);
                const y1 = CY + Math.sin(angle) * (R - 3);
                const x2 = CX + Math.cos(angle) * (R + 1);
                const y2 = CY + Math.sin(angle) * (R + 1);
                return (
                  <line
                    key={`tick-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(139,92,246,0.25)"
                    strokeWidth="0.8"
                  />
                );
              })}

              {/* compass labels */}
              {compassPoints.map((pt) => (
                <text
                  key={pt.label}
                  x={pt.x}
                  y={pt.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(167,139,250,0.55)"
                  fontSize="11"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontWeight="600"
                  letterSpacing="0.05em"
                >
                  {pt.label}
                </text>
              ))}
            </svg>
          </div>

          {/* ── text content below the map ── */}
          <div className="flex flex-col items-center mt-7 space-y-3 text-center">
            {/* title */}
            <h2
              className="font-display font-bold text-lg sm:text-xl leading-snug"
              style={{
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              O Céu na Noite que Começamos
            </h2>

            {/* date */}
            <p
              className="text-sm tracking-wide"
              style={{ color: 'rgba(199,210,254,0.7)' }}
            >
              {formattedDate}
            </p>

            {/* location */}
            {(bairro || cidade) && (
              <div className="flex items-center gap-1.5">
                <MapPin size={13} style={{ color: 'rgba(167,139,250,0.6)' }} />
                <span
                  className="text-xs tracking-wide"
                  style={{ color: 'rgba(167,139,250,0.6)' }}
                >
                  {[bairro, cidade].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {/* divider */}
            <div
              className="w-16 mx-auto"
              style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)',
                margin: '8px auto',
              }}
            />

            {/* romantic quote */}
            <p
              className="text-xs italic leading-relaxed max-w-[260px]"
              style={{ color: 'rgba(199,210,254,0.45)' }}
            >
              "As estrelas alinharam naquela noite para que nossos caminhos se cruzassem."
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
