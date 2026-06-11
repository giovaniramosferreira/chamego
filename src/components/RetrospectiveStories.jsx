import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Heart, Clock, Star, MapPin, Play, Pause, Volume2 } from 'lucide-react';

const SLIDE_DURATION = 6000;
const TOTAL_SLIDES = 8;

/* ───────────────────── CSS animations (injected once) ───────────────────── */
const STYLE_ID = '__retro-stories-keyframes';
function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.8); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.08); }
    }
    @keyframes floatParticle {
      0%   { transform: translateY(0) translateX(0); opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { transform: translateY(-100vh) translateX(40px); opacity: 0; }
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.2; }
      50%      { opacity: 1; }
    }
    @keyframes polaroidIn {
      from { opacity: 0; transform: scale(0.7) rotate(-8deg); }
      to   { opacity: 1; transform: scale(1) rotate(var(--rot, -3deg)); }
    }
    @keyframes slideFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes slideFadeIn {
      from { opacity: 0; transform: scale(1.02); }
      to   { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

/* ───────────────────── helper: staggered text style ────────────────────── */
function stagger(index, base = 200) {
  return {
    animation: `fadeInUp 0.6s ease-out ${base + index * 120}ms both`,
  };
}

/* ───────────────────── photo url helper ─────────────────────────────────── */
function photoSrc(url) {
  if (!url) return '';
  return url;
}

/* ───────────────────── floating particles (slide 2) ─────────────────────── */
/* eslint-disable react-hooks/purity */
function Particles() {
  const items = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 8,
    })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-pink-400/40"
          style={{
            left: `${p.left}%`,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            animation: `floatParticle ${p.duration}s ease-in ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ───────────────────── twinkling stars (slide 4) ────────────────────────── */
/* eslint-disable react-hooks/purity */
function Stars() {
  const items = useMemo(
    () => Array.from({ length: 40 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
    })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ───────────────────── canvas helpers for share image ───────────────────── */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

async function buildStoryImage(data, td) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  // fundo creme
  ctx.fillStyle = '#FAF7F2';
  ctx.fillRect(0, 0, W, H);
  // moldura fina
  ctx.strokeStyle = 'rgba(26,23,20,0.15)';
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 60, W - 120, H - 120);
  // foto do casal (primeira), se houver — círculo grande no topo
  const fotoUrl = (data.fotos || [])[0];
  if (fotoUrl) {
    try {
      const img = await loadImage(fotoUrl);
      const R = 280, cx = W / 2, cy = 560;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      const s = Math.max((R * 2) / img.width, (R * 2) / img.height);
      ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = '#B3284F';
      ctx.lineWidth = 8;
      ctx.stroke();
    } catch {
      /* sem foto, segue */
    }
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1A1714';
  ctx.font = 'italic 700 96px Georgia, serif';
  wrapText(ctx, data.titulo || 'Nosso amor', W / 2, 1050, 900, 104);
  ctx.fillStyle = '#B3284F';
  ctx.font = 'italic 44px Georgia, serif';
  const dias =
    td?.years > 0
      ? `${td.years} ${td.years === 1 ? 'ano' : 'anos'} de história`
      : `${td?.days ?? ''} dias de história`;
  ctx.fillText(dias, W / 2, 1190);
  ctx.fillStyle = '#5C554C';
  ctx.font = '36px Georgia, serif';
  ctx.fillText('ganhei uma página do nosso amor 💌', W / 2, 1330);
  // divulga só a marca — o link do casal é íntimo, não vai no post
  ctx.fillStyle = '#B3284F';
  ctx.font = 'italic 700 80px Georgia, serif';
  ctx.fillText('chamego', W / 2, 1620);
  ctx.fillStyle = '#948C80';
  ctx.font = 'italic 34px Georgia, serif';
  ctx.fillText('páginas de amor que emocionam', W / 2, 1690);
  return new Promise((res) => canvas.toBlob(res, 'image/png'));
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function RetrospectiveStories({ isOpen, onClose, coupleData, timeDiff }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [viagemIndex, setViagemIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [slideKey, setSlideKey] = useState(0); // forces re-mount animations
  const [isSharing, setIsSharing] = useState(false);

  const progressRef = useRef(null);
  const audioRef = useRef(null);
  const holdTimerRef = useRef(null);
  const prevTimerRef = useRef(null);
  const transitionToRef = useRef(null);

  // Inject CSS keyframes on mount
  useEffect(() => { injectKeyframes(); }, []);

  /* ── transitionTo helper ────────────────────────────────────────────── */
  const transitionTo = useCallback((nextIndex) => {
    clearInterval(progressRef.current);
    setPrevSlide((cur) => cur); // will be replaced below
    setCurrentSlide((cur) => {
      setPrevSlide(cur);
      return nextIndex;
    });
    setProgress(0);
    setSlideKey((k) => k + 1);
    clearTimeout(prevTimerRef.current);
    prevTimerRef.current = setTimeout(() => setPrevSlide(null), 400);
  }, []);

  // Keep ref fresh so it can be called from inside setProgress updater safely
  useEffect(() => {
    transitionToRef.current = transitionTo;
  }, [transitionTo]);

  /* ── auto-advance progress ──────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen || isPaused) return;
    // Último slide: barra cheia e sem timer rodando à toa
    if (currentSlide === TOTAL_SLIDES - 1) {
      const t = setTimeout(() => setProgress(100), 0);
      return () => clearTimeout(t);
    }
    const interval = 50; // tick every 50ms
    const step = (interval / SLIDE_DURATION) * 100;

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        // Guard: already at 100, do nothing (prevents double-fire)
        if (prev >= 100) return 100;
        const next = prev + step;
        if (next >= 100) {
          // Schedule transition outside the updater via microtask
          queueMicrotask(() => transitionToRef.current?.(currentSlide + 1));
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(progressRef.current);
  }, [isOpen, isPaused, currentSlide]);

  /* ── photo auto-cycle (slide 3) ─────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen || currentSlide !== 2) return;
    const photos = coupleData?.fotos || [];
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % photos.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [isOpen, currentSlide, coupleData?.fotos]);

  /* ── place carousel (slide 5, index 4) ─────────────────────────────── */
  useEffect(() => {
    if (!isOpen || currentSlide !== 4) return;
    const places = [
      ...(coupleData?.roteiro?.dia || []),
      ...(coupleData?.roteiro?.noite || []),
    ].filter((p) => p.fotoUrl);
    if (places.length <= 1) return;
    const timer = setInterval(() => {
      setPlaceIndex((prev) => (prev + 1) % places.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [isOpen, currentSlide, coupleData?.roteiro]);

  /* ── viagem carousel (slide 6, index 5) ────────────────────────────── */
  useEffect(() => {
    if (!isOpen || currentSlide !== 5) return;
    const viagens = coupleData?.viagens || [];
    if (viagens.length <= 1) return;
    const timer = setInterval(() => {
      setViagemIndex((prev) => (prev + 1) % viagens.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [isOpen, currentSlide, coupleData?.viagens]);

  /* ── cupid audio auto-play (slide 7, index 6) ──────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    if (currentSlide === 6 && coupleData?.audioUrl && audioRef.current) {
      audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => {});
    } else if (currentSlide !== 6 && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }
  }, [isOpen, currentSlide, coupleData?.audioUrl]);

  /* ── reset on open ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentSlide(0);
      setPrevSlide(null);
      setProgress(0);
      setIsPaused(false);
      setPhotoIndex(0);
      setPlaceIndex(0);
      setViagemIndex(0);
      setAudioPlaying(false);
      setSlideKey(0);
      setIsSharing(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [isOpen]);

  /* ── cleanup prevTimerRef on unmount ───────────────────────────────── */
  useEffect(() => {
    return () => {
      clearTimeout(prevTimerRef.current);
    };
  }, []);

  /* ── navigation handlers ────────────────────────────────────────────── */
  const goNext = useCallback(() => {
    if (currentSlide >= TOTAL_SLIDES - 1) return;
    transitionTo(currentSlide + 1);
  }, [currentSlide, transitionTo]);

  const goPrev = useCallback(() => {
    if (currentSlide <= 0) {
      clearInterval(progressRef.current);
      setProgress(0);
      return;
    }
    transitionTo(currentSlide - 1);
  }, [currentSlide, transitionTo]);

  const handleTap = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
    if (x - rect.left < rect.width / 2) goPrev();
    else goNext();
  }, [goNext, goPrev]);

  /* ── long-press to pause ────────────────────────────────────────────── */
  const onHoldStart = useCallback(() => {
    holdTimerRef.current = setTimeout(() => setIsPaused(true), 200);
  }, []);
  const onHoldEnd = useCallback(() => {
    clearTimeout(holdTimerRef.current);
    setIsPaused(false);
  }, []);

  /* ── audio toggle ───────────────────────────────────────────────────── */
  const toggleAudio = useCallback(() => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setAudioPlaying(!audioPlaying);
  }, [audioPlaying]);

  /* ── share handler ──────────────────────────────────────────────────── */
  const handleShare = useCallback(async (e) => {
    e.stopPropagation();
    setIsSharing(true);
    try {
      const blob = await buildStoryImage(coupleData || {}, timeDiff || {});
      const file = new File([blob], 'chamego-story.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'chamego-story.png';
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      /* usuário cancelou share — ok */
    }
    setIsSharing(false);
  }, [coupleData, timeDiff]);

  /* ─────────────────────────────────────────────────────────────────────── */
  if (!isOpen) return null;

  const data = coupleData || {};
  const td = timeDiff || {};
  const photos = data.fotos || [];

  /* ── formatted start date ──────────────────────────────────────────── */
  const startDateFormatted = data.dataInicio
    ? new Date(data.dataInicio).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '';

  /* ══════════════ SLIDE RENDERERS ══════════════ */

  const renderCover = () => (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-pink-400 via-rose-400 to-pink-500 px-8 text-center">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-rose-300/20 blur-3xl" />

      {/* Heart */}
      <div style={{ animation: 'pulse 2s ease-in-out infinite' }}>
        <Heart className="h-16 w-16 fill-white text-white drop-shadow-lg" style={stagger(0, 0)} />
      </div>

      {/* Title */}
      <h1
        className="mt-6 font-display text-4xl font-black leading-tight text-white drop-shadow-md sm:text-5xl"
        style={stagger(1, 100)}
      >
        {data.titulo || 'Nossa História'}
      </h1>

      {/* Subtitle */}
      <p
        className="mt-4 font-serif text-lg italic text-white/90 sm:text-xl"
        style={stagger(2, 100)}
      >
        Uma história de amor 💕
      </p>

      {/* Message preview */}
      {data.mensagem && (
        <p
          className="mt-8 max-w-xs text-sm leading-relaxed text-white/80"
          style={stagger(3, 100)}
        >
          &ldquo;{data.mensagem.length > 120 ? data.mensagem.slice(0, 120) + '…' : data.mensagem}&rdquo;
        </p>
      )}

      {/* Music hint */}
      {data.musicaTitulo && (
        <div
          className="mt-6 flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-xs text-white"
          style={stagger(4, 100)}
        >
          <Volume2 className="h-3.5 w-3.5" />
          <span className="truncate max-w-[180px]">{data.musicaTitulo}</span>
        </div>
      )}

      {/* Volume hint pill */}
      <div
        className="mt-4 rounded-full bg-white/20 backdrop-blur px-4 py-2 text-xs text-white"
        style={stagger(5, 100)}
      >
        🔊 Aumente o som para sentir tudo
      </div>
    </div>
  );

  const renderTimeTogether = () => (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-pink-950 px-8 text-center">
      <Particles />

      <Clock className="h-10 w-10 text-pink-400" style={stagger(0, 0)} />

      <h2
        className="mt-5 font-display text-2xl font-bold text-white sm:text-3xl"
        style={stagger(1)}
      >
        Juntos há…
      </h2>

      {/* Big numbers */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4" style={stagger(2)}>
        {td.years > 0 && (
          <div className="flex flex-col items-center">
            <span className="font-display text-5xl font-black text-pink-400 sm:text-6xl">{td.years}</span>
            <span className="mt-1 text-xs text-pink-200/70">{td.years === 1 ? 'ano' : 'anos'}</span>
          </div>
        )}
        {(td.months > 0 || td.years > 0) && (
          <div className="flex flex-col items-center">
            <span className="font-display text-5xl font-black text-pink-300 sm:text-6xl">{td.months ?? 0}</span>
            <span className="mt-1 text-xs text-pink-200/70">{td.months === 1 ? 'mês' : 'meses'}</span>
          </div>
        )}
        <div className="flex flex-col items-center">
          <span className="font-display text-5xl font-black text-rose-400 sm:text-6xl">{td.days ?? 0}</span>
          <span className="mt-1 text-xs text-pink-200/70">dias</span>
        </div>
      </div>

      {/* Sub stats */}
      <div className="mt-6 flex items-center gap-3 text-pink-200/60 text-xs" style={stagger(3)}>
        <span>{td.hours ?? 0}h</span>
        <span>•</span>
        <span>{td.minutes ?? 0}min</span>
        <span>•</span>
        <span>{td.seconds ?? 0}s</span>
      </div>

      {startDateFormatted && (
        <p className="mt-8 font-serif text-xl italic text-pink-200/70" style={stagger(4)}>
          Tudo começou em {startDateFormatted}…
        </p>
      )}
    </div>
  );

  const renderPhotos = () => {
    const rotations = [-4, 2, -2, 3, -3, 1];
    const currentPhoto = photos[photoIndex] || '';

    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-pink-100 via-rose-50 to-pink-200 px-6 text-center">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute top-10 right-10 h-40 w-40 rounded-full bg-pink-300/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-16 left-8 h-48 w-48 rounded-full bg-rose-300/20 blur-3xl" />

        <h2 className="font-display text-2xl font-bold text-pink-700 sm:text-3xl" style={stagger(0, 0)}>
          Nossos Momentos 📸
        </h2>

        {photos.length > 0 ? (
          <div
            key={photoIndex}
            className="relative mt-8"
            style={{
              '--rot': `${rotations[photoIndex % rotations.length]}deg`,
              animation: 'polaroidIn 0.5s ease-out both',
            }}
          >
            {/* Polaroid frame — reinforced */}
            <div className="bg-white p-3 pb-12 rounded-[4px] shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
              <img
                src={photoSrc(currentPhoto)}
                alt={`Foto ${photoIndex + 1}`}
                className="h-56 w-56 rounded object-cover sm:h-64 sm:w-64 block"
                draggable={false}
              />
              {/* Caption strip inside the polaroid */}
              <p className="font-display italic text-neutral-700 text-sm text-center mt-2 leading-tight">
                Nossos momentos · {photoIndex + 1}/{photos.length}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-8 text-pink-400 text-sm" style={stagger(1)}>Nenhuma foto adicionada ainda 💗</p>
        )}
      </div>
    );
  };

  const renderHoroscope = () => {
    const excerpt =
      data.horoscopoTexto && data.horoscopoTexto.length > 220
        ? data.horoscopoTexto.slice(0, 220) + '…'
        : data.horoscopoTexto || '';

    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-purple-950 px-8 text-center">
        <Stars />

        <div className="flex items-center gap-3" style={stagger(0, 0)}>
          {data.signo1 && (
            <span className="text-4xl">{data.signo1?.symbol}</span>
          )}
          <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
          {data.signo2 && (
            <span className="text-4xl">{data.signo2?.symbol}</span>
          )}
        </div>

        <h2 className="mt-5 font-display text-2xl font-bold text-white sm:text-3xl" style={stagger(1)}>
          Mapa Astral do Casal ✨
        </h2>

        {excerpt && (
          <p
            className="mt-6 max-w-xs font-serif text-sm leading-relaxed text-purple-100/80 italic"
            style={stagger(2)}
          >
            &ldquo;{excerpt}&rdquo;
          </p>
        )}

        {!excerpt && (
          <p className="mt-6 text-purple-300/60 text-sm" style={stagger(2)}>
            Os astros guardam segredos sobre vocês…
          </p>
        )}
      </div>
    );
  };

  const renderDateIdeas = () => {
    const places = [
      ...(data.roteiro?.dia || []),
      ...(data.roteiro?.noite || []),
    ].filter((p) => p.fotoUrl);

    const currentPlace = places[placeIndex];

    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-amber-300 via-orange-400 to-rose-400 px-8 text-center">
        {/* Warm glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-60 w-60 rounded-full bg-yellow-200/40 blur-3xl" />

        <MapPin className="h-10 w-10 text-white drop-shadow" style={stagger(0, 0)} />

        <h2 className="mt-4 font-display text-2xl font-bold text-white drop-shadow sm:text-3xl" style={stagger(1)}>
          Os dates de vocês 💛
        </h2>

        {(data.cidade || data.bairro) && (
          <p className="mt-2 text-sm text-white/80" style={stagger(2)}>
            📍 {[data.bairro, data.cidade].filter(Boolean).join(', ')}
          </p>
        )}

        {places.length > 0 && currentPlace ? (
          <div
            key={placeIndex}
            className="relative mt-6"
            style={{
              '--rot': `-3deg`,
              animation: 'polaroidIn 0.5s ease-out both',
            }}
          >
            {/* Polaroid frame — reinforced */}
            <div className="bg-white p-3 pb-12 rounded-[4px] shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
              <img
                src={photoSrc(currentPlace.fotoUrl)}
                alt={currentPlace.nome}
                className="h-56 w-56 rounded object-cover sm:h-64 sm:w-64 block"
                draggable={false}
              />
              {/* Caption strip inside the polaroid */}
              <div className="px-1 mt-2">
                <p className="font-bold text-neutral-800 text-sm leading-tight">{currentPlace.nome}</p>
                {currentPlace.categoria && (
                  <p className="font-display italic text-neutral-600 text-xs mt-0.5">{currentPlace.categoria}</p>
                )}
              </div>
            </div>
            {/* Counter outside frame */}
            <p className="mt-2 text-xs text-white/80 font-medium drop-shadow text-center">
              {placeIndex + 1} / {places.length}
            </p>
          </div>
        ) : (
          <p className="mt-6 text-white/70 text-sm" style={stagger(3)}>
            Os melhores cantinhos da cidade esperam por vocês 🌅
          </p>
        )}
      </div>
    );
  };

  const renderViagens = () => {
    const viagens = data.viagens || [];
    const currentViagem = viagens[viagemIndex];

    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-900 via-indigo-950 to-slate-950 px-8 text-center">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-60 w-60 rounded-full bg-sky-500/15 blur-3xl" />

        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl" style={stagger(0, 0)}>
          Os cantos do mundo que são de vocês 🌍
        </h2>

        {viagens.length > 0 && currentViagem ? (
          <div
            key={viagemIndex}
            className="relative mt-8"
            style={{
              '--rot': `-3deg`,
              animation: 'polaroidIn 0.5s ease-out both',
            }}
          >
            {/* Polaroid frame — reinforced */}
            <div className="bg-white p-3 pb-12 rounded-[4px] shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
              <img
                src={photoSrc(currentViagem.fotoUrl)}
                alt={currentViagem.lugar}
                className="h-56 w-56 rounded object-cover sm:h-64 sm:w-64 block"
                draggable={false}
              />
              {/* Caption strip inside the polaroid */}
              <p className="font-display italic text-neutral-700 text-sm text-center mt-2 leading-tight">
                📍 {currentViagem.lugar}
              </p>
            </div>
            {/* Counter outside frame */}
            <p className="mt-2 text-xs text-white/80 font-medium drop-shadow text-center">
              {viagemIndex + 1} / {viagens.length}
            </p>
          </div>
        ) : (
          <p className="mt-8 text-white/70 text-sm" style={stagger(1)}>
            Cada viagem de vocês vira um capítulo aqui ✈️
          </p>
        )}
      </div>
    );
  };

  const renderCupid = () => (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 px-8 text-center">
      {/* Glow */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

      <span className="text-5xl" style={stagger(0, 0)}>😇</span>

      <h2 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl" style={stagger(1)}>
        Veredicto do Cupido
      </h2>

      {data.cupidoComentario && (
        <p
          className="mt-6 max-w-xs font-serif text-sm leading-relaxed text-white/90 italic"
          style={stagger(2)}
        >
          &ldquo;{data.cupidoComentario.length > 240
            ? data.cupidoComentario.slice(0, 240) + '…'
            : data.cupidoComentario}&rdquo;
        </p>
      )}

      {/* Audio play button */}
      {data.audioUrl && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleAudio(); }}
          className="mt-8 flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-95"
          style={stagger(3)}
        >
          {audioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {audioPlaying ? 'Pausar áudio' : 'Ouvir mensagem'}
        </button>
      )}

      {/* Achievements */}
      {Array.isArray(data.conquistas) && data.conquistas.length > 0 && (
        <div
          className="mt-6 flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs text-white/80"
          style={stagger(4)}
        >
          🏆 <span>{data.conquistas.length} conquistas juntos</span>
        </div>
      )}

      {/* Hidden audio element */}
      {data.audioUrl && (
        <audio
          ref={audioRef}
          src={photoSrc(data.audioUrl)}
          onEnded={() => setAudioPlaying(false)}
          preload="none"
        />
      )}
    </div>
  );

  const renderShare = () => (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 px-8 text-center">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />

      <div className="relative z-30 flex flex-col items-center gap-5">
        <span className="text-5xl" style={stagger(0, 0)}>💌</span>

        <h2
          className="font-display text-3xl font-bold text-white"
          style={stagger(1)}
        >
          Reposte esse chamego
        </h2>

        <p
          className="text-white/70 text-sm max-w-xs"
          style={stagger(2)}
        >
          Mostre para o mundo o presente que você recebeu
        </p>

        <button
          onClick={handleShare}
          disabled={isSharing}
          className="mt-2 rounded-full bg-white text-slate-950 font-semibold px-8 py-4 transition-transform active:scale-95 disabled:opacity-60"
          style={stagger(3)}
        >
          {isSharing ? 'Gerando…' : 'Compartilhar ✨'}
        </button>

        <p className="text-white/40 text-xs" style={stagger(4)}>
          Abre direto no Instagram Stories
        </p>
      </div>
    </div>
  );

  const slideRenderers = [
    renderCover,        // 0
    renderTimeTogether, // 1
    renderPhotos,       // 2
    renderHoroscope,    // 3
    renderDateIdeas,    // 4
    renderViagens,      // 5
    renderCupid,        // 6
    renderShare,        // 7
  ];

  /* ═════════════════════ RENDER ═════════════════════ */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Story card container — mobile-first 9:16 ratio */}
      <div className="relative h-full w-full max-w-md overflow-hidden sm:h-[92vh] sm:rounded-[32px] sm:shadow-2xl sm:shadow-pink-500/20">
        {/* ── progress bars ────────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-3 pt-3">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <div key={i} className="relative h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width] duration-100 ease-linear"
                style={{
                  width:
                    i < currentSlide
                      ? '100%'
                      : i === currentSlide
                        ? `${progress}%`
                        : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* ── close button ─────────────────────────────────────────────── */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose?.(); }}
          className="absolute top-5 right-4 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* ── slide content — two-layer crossfade ──────────────────────── */}
        <div className="relative h-full w-full">
          {/* Outgoing slide (fade out) */}
          {prevSlide !== null && (
            <div
              key={`prev-${prevSlide}`}
              className="absolute inset-0 h-full w-full pointer-events-none"
              style={{ animation: 'slideFadeOut 0.4s ease-in both' }}
            >
              {slideRenderers[prevSlide]?.()}
            </div>
          )}
          {/* Incoming slide (fade in + slight scale) */}
          <div
            key={slideKey}
            className="h-full w-full"
            style={{ animation: 'slideFadeIn 0.45s ease-out both' }}
          >
            {slideRenderers[currentSlide]?.()}
          </div>
        </div>

        {/* ── invisible tap / hold zones (hidden on last slide) ────────── */}
        {currentSlide < TOTAL_SLIDES - 1 && (
          <div
            className="absolute inset-0 z-20 flex"
            onMouseDown={onHoldStart}
            onMouseUp={(e) => { onHoldEnd(); handleTap(e); }}
            onMouseLeave={onHoldEnd}
            onTouchStart={onHoldStart}
            onTouchEnd={(e) => { onHoldEnd(); handleTap(e); }}
            onTouchCancel={onHoldEnd}
          >
            {/* Left half and right half handled by handleTap position */}
          </div>
        )}
      </div>
    </div>
  );
}
