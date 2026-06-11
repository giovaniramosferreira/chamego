import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, ChevronDown, Play, Pause } from 'lucide-react';
import confetti from 'canvas-confetti';
import CompatibilityCard from '../components/CompatibilityCard';
import RetrospectiveStories from '../components/RetrospectiveStories';
import StarMapCard from '../components/StarMapCard';

/* ─────────────────────── ScrollReveal ───────────────────────── */
function ScrollReveal({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setIsVisible(true); }); },
      { threshold: 0.1 }
    );
    const el = domRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
    >
      {children}
    </div>
  );
}

/* ─────────────────────── Moon Phase ────────────────────────── */
const getMoonPhase = (dateString) => {
  if (!dateString) return { name: 'Lua Cheia', icon: '🌕', desc: 'O céu brilhando na noite mais feliz de todas.' };
  const date = new Date(dateString);
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const diffDays = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const cycle = 29.530588853;
  const raw = (diffDays / cycle) % 1;
  const phase = raw < 0 ? raw + 1 : raw;
  if (phase < 0.03 || phase > 0.97) return { name: 'Lua Nova', icon: '🌑', desc: 'O início da nossa jornada, onde tudo começou no silêncio e na promessa.' };
  if (phase < 0.22) return { name: 'Lua Crescente', icon: '🌒', desc: 'Nosso amor começando a crescer forte, brilhante e cheio de expectativas.' };
  if (phase < 0.28) return { name: 'Quarto Crescente', icon: '🌓', desc: 'A metade do céu iluminada, mostrando nossa força e certezas.' };
  if (phase < 0.47) return { name: 'Gibosa Crescente', icon: '🌔', desc: 'Quase cheia, transbordando sentimentos e afeto em cada canto.' };
  if (phase < 0.53) return { name: 'Lua Cheia', icon: '🌕', desc: 'O auge do nosso brilho, iluminando e abençoando nossa história inteira.' };
  if (phase < 0.72) return { name: 'Gibosa Minguante', icon: '🌖', desc: 'O amor amadurecendo em serenidade, aconchego e paz profunda.' };
  if (phase < 0.78) return { name: 'Quarto Minguante', icon: '🌗', desc: 'Tempo de recolhimento, união e cumplicidade silenciosa.' };
  return { name: 'Lua Minguante', icon: '🌘', desc: 'Preparando o coração e a alma para novos ciclos juntos.' };
};

/* ════════════════════════ CouplePage ════════════════════════ */
export default function CouplePage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [coupleData, setCoupleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  const [timeDiff, setTimeDiff] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [hearts, setHearts] = useState([]);
  const heartIdCounter = useRef(0);

  // Background music
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  // Voice audio
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceCurrentTime, setVoiceCurrentTime] = useState(0);
  const voiceAudioRef = useRef(null);
  const wasBackgroundMusicPlayingRef = useRef(false);

  // Word game
  const [wordGuess, setWordGuess] = useState('');
  const [isWordCorrect, setIsWordCorrect] = useState(false);
  const [wordError, setWordError] = useState(false);

  // Roulette
  const [isRouletteSpinning, setIsRouletteSpinning] = useState(false);
  const [rouletteIndex, setRouletteIndex] = useState(null);
  const [rouletteWinner, setRouletteWinner] = useState('');

  // Retrospective
  const [isRetroOpen, setIsRetroOpen] = useState(false);

  // Roteiro collapsible groups
  const [roteiroOpen, setRoteiroOpen] = useState({ dia: false, noite: false });
  const toggleRoteiro = (group) => setRoteiroOpen(prev => ({ ...prev, [group]: !prev[group] }));

  /* ── Fetch page data ─────────────────────────────────────── */
  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/pages/${slug}`);
        if (res.status === 403) {
          setIsDraft(true);
          setIsLoading(false);
          return;
        }
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setCoupleData(data);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.85 } });
      } catch (e) {
        console.error(e);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  /* ── Real-time counter ───────────────────────────────────── */
  useEffect(() => {
    if (!coupleData?.dataInicio) return;
    const calculateTime = () => {
      const start = new Date(coupleData.dataInicio);
      const now = new Date();
      let years = now.getFullYear() - start.getFullYear();
      let months = now.getMonth() - start.getMonth();
      let days = now.getDate() - start.getDate();
      if (days < 0) { days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); months--; }
      if (months < 0) { months += 12; years--; }
      let finalHours = now.getHours() - start.getHours();
      let finalMinutes = now.getMinutes() - start.getMinutes();
      let finalSeconds = now.getSeconds() - start.getSeconds();
      if (finalSeconds < 0) { finalSeconds += 60; finalMinutes--; }
      if (finalMinutes < 0) { finalMinutes += 60; finalHours--; }
      if (finalHours < 0) { finalHours += 24; days--; }
      setTimeDiff({
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        hours: Math.max(0, finalHours),
        minutes: Math.max(0, finalMinutes),
        seconds: Math.max(0, finalSeconds),
      });
    };
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [coupleData]);

  /* ── Photo carousel ──────────────────────────────────────── */
  useEffect(() => {
    if (!coupleData?.fotos || coupleData.fotos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPhotoIndex(prev => (prev + 1) % coupleData.fotos.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [coupleData]);

  /* ── Hearts rain ─────────────────────────────────────────── */
  useEffect(() => {
    if (isLoading || loadError || isDraft) return;
    const emojis = ['❤️', '🤍'];
    const emitHeart = () => {
      const id = heartIdCounter.current++;
      const left = Math.random() * 100;
      const duration = 4 + Math.random() * 3;
      const scale = 0.5 + Math.random() * 0.7;
      const text = emojis[Math.floor(Math.random() * emojis.length)];
      setHearts(prev => [...prev, { id, left, duration, scale, text }]);
      setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), duration * 1000);
    };
    const interval = setInterval(emitHeart, 1200);
    return () => clearInterval(interval);
  }, [isLoading, loadError, isDraft]);

  /* ── Pre-load background music ───────────────────────────── */
  useEffect(() => {
    if (coupleData?.musicaUrl && audioRef.current) {
      audioRef.current.src = coupleData.musicaUrl;
      audioRef.current.loop = true;
      const t = setTimeout(() => {
        audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(() => {});
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [coupleData]);

  /* ── Audio handlers ──────────────────────────────────────── */
  const handleToggleAudio = () => {
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      if (isVoicePlaying && voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        setIsVoicePlaying(false);
      }
      audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(err => console.error('Audio blocked', err));
    }
  };

  const handleToggleVoice = () => {
    if (!voiceAudioRef.current) return;
    if (isVoicePlaying) {
      voiceAudioRef.current.pause();
      setIsVoicePlaying(false);
      if (wasBackgroundMusicPlayingRef.current && audioRef.current) {
        audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(() => {});
      }
    } else {
      if (isAudioPlaying && audioRef.current) {
        wasBackgroundMusicPlayingRef.current = true;
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        wasBackgroundMusicPlayingRef.current = false;
      }
      voiceAudioRef.current.play().then(() => setIsVoicePlaying(true)).catch(err => console.error('Voice play failed', err));
    }
  };

  const handleVoiceEnded = () => {
    setIsVoicePlaying(false);
    setVoiceCurrentTime(0);
    if (wasBackgroundMusicPlayingRef.current && audioRef.current) {
      audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(() => {});
    }
  };

  const handleVoiceTimeUpdate = () => {
    if (voiceAudioRef.current) {
      setVoiceCurrentTime(voiceAudioRef.current.currentTime);
      if (voiceAudioRef.current.duration && !isNaN(voiceAudioRef.current.duration) && voiceAudioRef.current.duration !== Infinity && voiceDuration === 0) {
        setVoiceDuration(voiceAudioRef.current.duration);
      }
    }
  };

  const handleVoiceLoadedMetadata = () => {
    if (voiceAudioRef.current) setVoiceDuration(voiceAudioRef.current.duration);
  };

  const handleVoiceProgressChange = (e) => {
    const newPercent = parseFloat(e.target.value);
    if (voiceAudioRef.current && voiceDuration > 0) {
      const newTime = (newPercent / 100) * voiceDuration;
      voiceAudioRef.current.currentTime = newTime;
      setVoiceCurrentTime(newTime);
    }
  };

  /* ── Word game ───────────────────────────────────────────── */
  const handleWordSubmit = (e) => {
    e.preventDefault();
    setWordError(false);
    const guess = wordGuess.toUpperCase().replace(/\s/g, '');
    const solution = coupleData.palavraSecreta.toUpperCase().replace(/\s/g, '');
    if (guess === solution) {
      setIsWordCorrect(true);
      confetti({ particleCount: 100, spread: 70, colors: ['#B3284F', '#C9355F', '#F7E3E9'] });
      setTimeout(() => {
        document.getElementById('roleta')?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    } else {
      setWordError(true);
    }
  };

  /* ── Roulette ────────────────────────────────────────────── */
  const handleSpinRoulette = () => {
    if (isRouletteSpinning || !coupleData?.opcoesRoleta?.length) return;
    setIsRouletteSpinning(true);
    setRouletteWinner('');
    let currentFlashIndex = 0;
    let speed = 80;
    let flashesCount = 0;
    const maxFlashes = 25 + Math.floor(Math.random() * 10);
    const flash = () => {
      setRouletteIndex(currentFlashIndex);
      currentFlashIndex = (currentFlashIndex + 1) % coupleData.opcoesRoleta.length;
      flashesCount++;
      if (flashesCount < maxFlashes) {
        if (maxFlashes - flashesCount < 6) speed += 60;
        setTimeout(flash, speed);
      } else {
        setRouletteIndex(currentFlashIndex);
        setRouletteWinner(coupleData.opcoesRoleta[currentFlashIndex]);
        setIsRouletteSpinning(false);
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.75 } });
      }
    };
    flash();
  };

  /* ════════════════════ RENDER STATES ════════════════════ */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center gap-4 text-ink-900">
        <div className="w-10 h-10 border-2 border-wine-700 border-t-transparent rounded-full animate-spin" />
        <p className="font-display italic text-ink-600">Carregando sua surpresa…</p>
      </div>
    );
  }

  if (isDraft) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-6">
        <div className="card max-w-sm p-8 text-center flex flex-col items-center gap-5">
          <span className="text-4xl">💌</span>
          <h2 className="font-display text-xl font-semibold text-ink-900">Esta página está quase pronta</h2>
          <p className="text-ink-600 text-sm leading-relaxed">
            Falta só confirmar o pagamento para publicar.
          </p>
          <button
            onClick={() => navigate(`/criar/checkout?slug=${slug}`)}
            className="btn-primary"
          >
            Concluir pagamento
          </button>
        </div>
      </div>
    );
  }

  if (loadError || !coupleData) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="card max-w-sm p-8 flex flex-col items-center gap-5">
          <span className="text-4xl">😿</span>
          <h1 className="font-display text-xl font-semibold text-ink-900">Página Não Encontrada</h1>
          <p className="text-sm text-ink-600 leading-relaxed">
            Esta URL ainda não existe ou o link expirou.
          </p>
          <a href="/" className="btn-primary">Voltar para o Início</a>
        </div>
      </div>
    );
  }

  const moon = getMoonPhase(coupleData.dataInicio);
  const anosLabel = timeDiff.years === 1 ? 'Ano' : 'Anos';

  const hasCeuSection = coupleData.compatibilidade || coupleData.horoscopoTexto || coupleData.dataInicio;

  return (
    <div className="min-h-screen bg-cream-50 text-ink-900 font-sans relative overflow-x-hidden">
      {/* Hidden audio elements */}
      <audio ref={audioRef} />
      {coupleData.audioUrl && (
        <audio
          ref={voiceAudioRef}
          src={coupleData.audioUrl}
          onEnded={handleVoiceEnded}
          onTimeUpdate={handleVoiceTimeUpdate}
          onLoadedMetadata={handleVoiceLoadedMetadata}
        />
      )}

      {/* Floating music toggle */}
      {coupleData.musicaUrl && (
        <button
          onClick={handleToggleAudio}
          className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/90 ring-1 ring-ink-900/10 shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isAudioPlaying ? (
            <Volume2 className="w-5 h-5 text-wine-700" />
          ) : (
            <VolumeX className="w-5 h-5 text-ink-400" />
          )}
        </button>
      )}

      {/* Hearts rain */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {hearts.map(h => (
          <span
            key={h.id}
            className="absolute bottom-0 text-2xl select-none"
            style={{
              left: `${h.left}%`,
              animation: `float ${h.duration}s linear forwards`,
              transform: `scale(${h.scale})`,
            }}
          >
            {h.text}
          </span>
        ))}
      </div>

      <main className="max-w-2xl mx-auto w-full flex flex-col gap-16 px-5 py-16 relative z-10">

        {/* 1. Hero */}
        <section className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <p className="eyebrow mb-6">Feliz {timeDiff.years} {anosLabel} juntos</p>
          <h1 className="font-display text-5xl sm:text-7xl font-semibold text-ink-900 leading-none tracking-tight">
            {coupleData.titulo}
          </h1>
          <p className="font-display italic text-wine-600 text-xl mt-5">Para todo o sempre</p>
          <div className="animate-bounce mt-16 text-ink-400 flex flex-col items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest">Rolar para ler</span>
            <ChevronDown className="w-5 h-5" />
          </div>
        </section>

        {/* 2. Counter */}
        <ScrollReveal>
          <div className="card p-8 text-center">
            <p className="eyebrow mb-6">Construindo nossa história há</p>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex flex-col">
                <span className="font-display text-5xl font-semibold text-ink-900 leading-none">{timeDiff.years}</span>
                <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mt-2">{anosLabel}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-5xl font-semibold text-ink-900 leading-none">{timeDiff.months}</span>
                <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mt-2">{timeDiff.months === 1 ? 'Mês' : 'Meses'}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-5xl font-semibold text-ink-900 leading-none">{timeDiff.days}</span>
                <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mt-2">{timeDiff.days === 1 ? 'Dia' : 'Dias'}</span>
              </div>
            </div>
            <hr className="border-cream-200 my-6" />
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="font-display text-xl font-semibold text-ink-600">{String(timeDiff.hours).padStart(2, '0')}</span>
                <span className="text-[9px] font-semibold text-ink-400 uppercase tracking-wide mt-1">Horas</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-xl font-semibold text-ink-600">{String(timeDiff.minutes).padStart(2, '0')}</span>
                <span className="text-[9px] font-semibold text-ink-400 uppercase tracking-wide mt-1">Minutos</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-xl font-semibold text-wine-700 tabular-nums">{String(timeDiff.seconds).padStart(2, '0')}</span>
                <span className="text-[9px] font-semibold text-wine-700 uppercase tracking-wide mt-1">Segundos</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* 3. Fotos — large editorial carousel */}
        {coupleData.fotos && coupleData.fotos.length > 0 && (
          <ScrollReveal>
            <div className="w-full">
              <div className="relative w-full aspect-[4/5] sm:aspect-[4/3] rounded-[2rem] overflow-hidden bg-cream-100">
                {coupleData.fotos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Foto ${index + 1}`}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                      currentPhotoIndex === index ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ))}
              </div>
              {coupleData.fotos.length > 1 && (
                <p className="text-center text-sm text-ink-400 mt-3">
                  {currentPhotoIndex + 1} / {coupleData.fotos.length}
                </p>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* 4. Mensagem */}
        {coupleData.mensagem && (
          <ScrollReveal>
            <div className="card p-8">
              <p className="eyebrow mb-4">Uma mensagem para você</p>
              <p className="font-display italic text-xl text-ink-900 leading-relaxed whitespace-pre-line">
                {coupleData.mensagem}
              </p>
            </div>
          </ScrollReveal>
        )}

        {/* 5. Poema (ex-Carta de Amor) */}
        {coupleData.cartaDeAmor && (
          <ScrollReveal>
            <div className="card p-8">
              <p className="eyebrow mb-2">Poema de vocês</p>
              <h2 className="font-display text-2xl text-ink-900 mb-6">Um poema só de vocês</h2>
              <p className="font-display italic text-lg leading-relaxed whitespace-pre-line text-center max-w-md mx-auto text-ink-900">
                {coupleData.cartaDeAmor}
              </p>
            </div>
          </ScrollReveal>
        )}

        {/* 6. O Céu de Vocês — merged dark set piece */}
        {hasCeuSection && (
          <ScrollReveal>
            <section className="bg-slate-950 rounded-[2rem] p-6 sm:p-10 text-white overflow-hidden relative">
              {/* Ambient glow */}
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-8">
                {/* Header */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">O céu de vocês</p>
                  <h3 className="font-display text-3xl font-semibold text-white">Escrito nas estrelas</h3>
                </div>

                {/* Signos badges */}
                {coupleData.signo1 && coupleData.signo2 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex flex-col items-center bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
                      <span className="text-2xl leading-none">{coupleData.signo1.symbol}</span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{coupleData.signo1.name}</span>
                    </div>
                    <span className="text-slate-600 font-semibold">+</span>
                    <div className="flex flex-col items-center bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
                      <span className="text-2xl leading-none">{coupleData.signo2.symbol}</span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{coupleData.signo2.name}</span>
                    </div>
                  </div>
                )}

                {/* Sinastria text */}
                {coupleData.horoscopoTexto && (
                  <p className="font-display italic text-slate-300 leading-relaxed">
                    {coupleData.horoscopoTexto}
                  </p>
                )}

                {/* Compatibility score */}
                {coupleData.compatibilidade && (
                  <CompatibilityCard
                    coupleData={coupleData}
                    compatibilidade={coupleData.compatibilidade}
                    dark
                  />
                )}

                {/* Star map */}
                {coupleData.dataInicio && (
                  <div className="my-2">
                    <StarMapCard
                      dataInicio={coupleData.dataInicio}
                      cidade={coupleData.cidade}
                      bairro={coupleData.bairro}
                      nomes={coupleData.titulo}
                    />
                  </div>
                )}

                {/* Moon footer */}
                {coupleData.dataInicio && (
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                    <span className="text-3xl">{moon.icon}</span>
                    <p className="text-sm text-slate-400">
                      Naquela noite, a lua estava <span className="text-slate-200 font-semibold">{moon.name}</span> — {moon.desc}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* 7. Roteiro de Dates — collapsible groups */}
        {coupleData.roteiro && (coupleData.roteiro.dia?.length || coupleData.roteiro.noite?.length) && (
          <ScrollReveal>
            <div className="flex flex-col gap-6">
              <div>
                <p className="eyebrow mb-2">Roteiro de dates</p>
                <h2 className="font-display text-3xl font-semibold text-ink-900">
                  Lugares de verdade, pertinho de vocês
                </h2>
                {coupleData.bairro && coupleData.cidade && (
                  <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-cream-100 text-ink-600 text-sm font-semibold">
                    📍 {coupleData.bairro}, {coupleData.cidade}
                  </span>
                )}
              </div>

              {/* De dia */}
              {coupleData.roteiro.dia?.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleRoteiro('dia')}
                    className="card px-5 py-4 flex items-center justify-between w-full text-left"
                  >
                    <span className="font-semibold text-ink-900">
                      ☀️ De dia — {coupleData.roteiro.dia.length} {coupleData.roteiro.dia.length === 1 ? 'lugar' : 'lugares'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-ink-400 transition-transform ${roteiroOpen.dia ? 'rotate-180' : ''}`} />
                  </button>
                  {roteiroOpen.dia && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      {coupleData.roteiro.dia.map((place, idx) => (
                        <div key={idx} className="card overflow-hidden">
                          {place.fotoUrl && (
                            <img
                              src={place.fotoUrl}
                              alt={place.nome}
                              className="w-full aspect-[3/2] object-cover"
                            />
                          )}
                          <div className="p-5 flex flex-col gap-2">
                            <p className="eyebrow">{place.categoria}</p>
                            <h4 className="font-display text-lg font-semibold text-ink-900">{place.nome}</h4>
                            {(place.nota || place.preco) && (
                              <p className="text-sm text-ink-600">
                                {place.nota && `⭐ ${place.nota}`}{place.nota && place.preco && ' · '}{place.preco}
                              </p>
                            )}
                            {place.frase && (
                              <p className="font-display italic text-ink-600 text-sm">{place.frase}</p>
                            )}
                            {place.mapsUrl && (
                              <a
                                href={place.mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-wine-700 text-sm font-semibold mt-1"
                              >
                                Abrir no Maps →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* À noite */}
              {coupleData.roteiro.noite?.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleRoteiro('noite')}
                    className="card px-5 py-4 flex items-center justify-between w-full text-left"
                  >
                    <span className="font-semibold text-ink-900">
                      🌙 À noite — {coupleData.roteiro.noite.length} {coupleData.roteiro.noite.length === 1 ? 'lugar' : 'lugares'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-ink-400 transition-transform ${roteiroOpen.noite ? 'rotate-180' : ''}`} />
                  </button>
                  {roteiroOpen.noite && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      {coupleData.roteiro.noite.map((place, idx) => (
                        <div key={idx} className="card overflow-hidden">
                          {place.fotoUrl && (
                            <img
                              src={place.fotoUrl}
                              alt={place.nome}
                              className="w-full aspect-[3/2] object-cover"
                            />
                          )}
                          <div className="p-5 flex flex-col gap-2">
                            <p className="eyebrow">{place.categoria}</p>
                            <h4 className="font-display text-lg font-semibold text-ink-900">{place.nome}</h4>
                            {(place.nota || place.preco) && (
                              <p className="text-sm text-ink-600">
                                {place.nota && `⭐ ${place.nota}`}{place.nota && place.preco && ' · '}{place.preco}
                              </p>
                            )}
                            {place.frase && (
                              <p className="font-display italic text-ink-600 text-sm">{place.frase}</p>
                            )}
                            {place.mapsUrl && (
                              <a
                                href={place.mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-wine-700 text-sm font-semibold mt-1"
                              >
                                Abrir no Maps →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* 8. Áudio + Cupido */}
        {(coupleData.cupidoComentario || coupleData.audioUrl) && (
          <ScrollReveal>
            <div className="card p-8">
              <p className="eyebrow mb-4">O veredito do cupido</p>
              {coupleData.cupidoComentario && (
                <p className="font-display italic text-lg text-ink-900 leading-relaxed mb-6">
                  {coupleData.cupidoComentario}
                </p>
              )}
              {coupleData.audioUrl && (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-cream-50 border border-cream-200 rounded-2xl p-4">
                  <button
                    onClick={handleToggleVoice}
                    className="w-14 h-14 rounded-full bg-wine-700 hover:bg-wine-600 text-white flex items-center justify-center flex-shrink-0 transition-colors active:scale-95 cursor-pointer"
                  >
                    {isVoicePlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-1" />}
                  </button>
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-ink-400 uppercase tracking-wider mb-2">
                      <span>Mensagem de áudio</span>
                      <span>
                        {Math.floor(voiceCurrentTime / 60)}:{(Math.floor(voiceCurrentTime) % 60).toString().padStart(2, '0')} / {voiceDuration ? `${Math.floor(voiceDuration / 60)}:${(Math.floor(voiceDuration) % 60).toString().padStart(2, '0')}` : '0:00'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={voiceDuration > 0 ? (voiceCurrentTime / voiceDuration) * 100 : 0}
                      onChange={handleVoiceProgressChange}
                      className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer accent-wine-700 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* 9. Conquistas — timeline */}
        {coupleData.conquistas && coupleData.conquistas.length > 0 && (
          <div className="card p-8">
            <p className="eyebrow mb-2">Nossa linha do tempo</p>
            <h2 className="font-display text-2xl font-semibold text-ink-900 mb-8">Grandes marcos juntos</h2>
            <div className="relative border-l-2 border-cream-200 ml-4 flex flex-col gap-10">
              {coupleData.conquistas.map((item, idx) => (
                <ScrollReveal key={idx}>
                  <div className="relative pl-8">
                    <div className="absolute -left-[11px] top-2 w-5 h-5 rounded-full bg-wine-700 border-2 border-white shadow flex items-center justify-center text-[9px] font-semibold text-white">
                      {idx + 1}
                    </div>
                    <div className="card overflow-hidden flex flex-col sm:flex-row gap-0">
                      {item.fotoUrl && (
                        <img
                          src={item.fotoUrl}
                          alt={item.titulo}
                          className="w-full sm:w-32 h-32 object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex flex-col justify-center gap-1.5 p-5">
                        <h4 className="font-display text-lg font-semibold text-ink-900">{item.titulo}</h4>
                        <p className="text-sm text-ink-600 leading-relaxed">{item.descricao}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {/* 10. Palavra Secreta */}
        {coupleData.palavraSecreta && (
          <ScrollReveal>
            <div className="card p-8">
              <p className="eyebrow mb-2">Jogo especial</p>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Decifre a palavra secreta</h2>

              {isWordCorrect ? (
                <div className="bg-cream-50 border border-cream-200 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
                  <span className="text-3xl">🎉</span>
                  <h4 className="font-display text-lg font-semibold text-ink-900">Parabéns! Você acertou!</h4>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    A palavra era: <span className="font-semibold text-wine-700">{coupleData.palavraSecreta}</span>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleWordSubmit} className="flex flex-col gap-4">
                  <div className="bg-cream-50 border border-cream-200 rounded-2xl p-4 text-sm text-ink-600">
                    Dica: &ldquo;{coupleData.palavraSecretaDica || 'Sem dica cadastrada'}&rdquo;
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Sua resposta..."
                      value={wordGuess}
                      onChange={e => setWordGuess(e.target.value)}
                      className="input-base flex-1"
                    />
                    <button type="submit" className="btn-primary">Decifrar</button>
                  </div>
                  {wordError && (
                    <p className="text-sm text-red-600 font-semibold">Palavra incorreta, tente novamente.</p>
                  )}
                </form>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* 11. Roleta */}
        {coupleData.opcoesRoleta && coupleData.opcoesRoleta.length > 0 && (
          <ScrollReveal>
            <div id="roleta" className="card p-8">
              <p className="eyebrow mb-2">O destino decide</p>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-6">Roleta do destino</h2>

              {coupleData.palavraSecreta && !isWordCorrect ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <span className="text-4xl">🔒</span>
                  <p className="font-display text-xl font-semibold text-ink-900">Roleta trancada</p>
                  <p className="text-ink-600 text-sm">Decifre a Palavra Secreta ali em cima para liberar a recompensa.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
                    {coupleData.opcoesRoleta.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 border rounded-2xl text-sm font-semibold transition-all ${
                          rouletteIndex === idx
                            ? 'border-wine-700 bg-wine-700 text-white scale-[1.03] shadow'
                            : 'border-cream-200 bg-cream-50 text-ink-600'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>

                  {rouletteWinner && (
                    <div className="mb-6 bg-wine-100 border border-wine-700/20 rounded-2xl p-5 text-center">
                      <p className="eyebrow mb-1">O destino escolheu</p>
                      <p className="font-display text-lg font-semibold text-wine-700">{rouletteWinner}</p>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <button
                      onClick={handleSpinRoulette}
                      disabled={isRouletteSpinning}
                      className="btn-primary"
                    >
                      {isRouletteSpinning ? 'Girando…' : 'Girar Roleta'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* 12. Gran Finale — Retrospectiva */}
        <ScrollReveal>
          <section className="card p-10 text-center flex flex-col items-center gap-5">
            <p className="eyebrow">O gran finale</p>
            <h2 className="font-display text-3xl font-semibold text-ink-900">A retrospectiva de vocês</h2>
            <p className="text-ink-600">Uma mini-série com a história do casal, em formato stories.</p>
            <button
              onClick={() => {
                if (coupleData.musicaUrl && audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(() => {});
                }
                setIsRetroOpen(true);
              }}
              className="btn-primary px-10 py-4 text-base"
            >
              ▶ Ver nossa retrospectiva
            </button>
          </section>
        </ScrollReveal>

      </main>

      <RetrospectiveStories
        isOpen={isRetroOpen}
        onClose={() => setIsRetroOpen(false)}
        coupleData={coupleData}
        timeDiff={timeDiff}
      />

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-ink-400 border-t border-cream-200 mt-8">
        Criado com carinho via <a href="/" className="font-semibold text-ink-600 hover:text-ink-900 underline">Chamego</a>
      </footer>
    </div>
  );
}
