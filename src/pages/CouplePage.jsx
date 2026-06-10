import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Volume2, VolumeX, Sparkles, Loader2, Music, Calendar, Moon, Trophy, Key, RotateCcw, AlertCircle, CheckCircle2, ChevronDown, Play, Pause, MapPin, Coffee, Utensils } from 'lucide-react';
import confetti from 'canvas-confetti';

// Simple Scroll Reveal Helper Component
function ScrollReveal({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      });
    }, { threshold: 0.1 });
    
    const current = domRef.current;
    if (current) {
      observer.observe(current);
    }
    
    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 transform ease-out ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-95'
      }`}
    >
      {children}
    </div>
  );
}

// Moon Phase Calculator
const getMoonPhase = (dateString) => {
  if (!dateString) return { name: "Lua Cheia", icon: "🌕", desc: "O céu brilhando na noite mais feliz de todas." };
  const date = new Date(dateString);
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const diffMs = date.getTime() - knownNewMoon.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const cycle = 29.530588853;
  const rawPhase = (diffDays / cycle) % 1;
  const phase = rawPhase < 0 ? rawPhase + 1 : rawPhase;
  
  if (phase < 0.03 || phase > 0.97) return { name: "Lua Nova", icon: "🌑", desc: "O início da nossa jornada, onde tudo começou no silêncio e na promessa." };
  if (phase < 0.22) return { name: "Lua Crescente", icon: "🌒", desc: "Nosso amor começando a crescer forte, brilhante e cheio de expectativas." };
  if (phase < 0.28) return { name: "Quarto Crescente", icon: "🌓", desc: "A metade do céu iluminada, mostrando nossa força e certezas." };
  if (phase < 0.47) return { name: "Gibosa Crescente", icon: "🌔", desc: "Quase cheia, transbordando sentimentos e afeto em cada canto." };
  if (phase < 0.53) return { name: "Lua Cheia", icon: "🌕", desc: "O auge do nosso brilho, iluminando e abençoando nossa história inteira." };
  if (phase < 0.72) return { name: "Gibosa Minguante", icon: "🌖", desc: "O amor amadurecendo em serenidade, aconchego e paz profunda." };
  if (phase < 0.78) return { name: "Quarto Minguante", icon: "🌗", desc: "Tempo de recolhimento, união e cumplicidade silenciosa." };
  return { name: "Lua Minguante", icon: "🌘", desc: "Preparando o coração e a alma para novos ciclos juntos." };
};

export default function CouplePage() {
  const { slug } = useParams();
  
  const [coupleData, setCoupleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  // Real-time counter states
  const [timeDiff, setTimeDiff] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Photo Carousel State
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Emojis / Hearts rain states
  const [hearts, setHearts] = useState([]);
  const heartIdCounter = useRef(0);

  // Background audio player management
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  // Cupid voice audio states
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceCurrentTime, setVoiceCurrentTime] = useState(0);
  
  const voiceAudioRef = useRef(null);
  const wasBackgroundMusicPlayingRef = useRef(false);

  // Secret Wordgame states
  const [wordGuess, setWordGuess] = useState('');
  const [isWordCorrect, setIsWordCorrect] = useState(false);
  const [wordError, setWordError] = useState(false);

  // Roulette states
  const [isRouletteSpinning, setIsRouletteSpinning] = useState(false);
  const [rouletteIndex, setRouletteIndex] = useState(null);
  const [rouletteWinner, setRouletteWinner] = useState('');

  // Fetch page data on mount
  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/pages/${slug}`);
        if (!response.ok) throw new Error('Page not found');
        const data = await response.json();
        setCoupleData(data);
        
        // Launch a sweet initial burst of confetti!
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.85 }
        });
      } catch (e) {
        console.error(e);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  // Real-time counter interval
  useEffect(() => {
    if (!coupleData || !coupleData.dataInicio) return;

    const calculateTime = () => {
      const start = new Date(coupleData.dataInicio);
      const now = new Date();
      
      let diffMs = now.getTime() - start.getTime();
      if (diffMs < 0) diffMs = 0; // Prevent negative counters

      let years = now.getFullYear() - start.getFullYear();
      let months = now.getMonth() - start.getMonth();
      let days = now.getDate() - start.getDate();
      
      if (days < 0) {
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
      }
      
      if (months < 0) {
        months += 12;
        years--;
      }

      const hours = now.getHours() - start.getHours();
      const minutes = now.getMinutes() - start.getMinutes();
      const seconds = now.getSeconds() - start.getSeconds();

      let finalHours = hours;
      let finalMinutes = minutes;
      let finalSeconds = seconds;

      if (finalSeconds < 0) {
        finalSeconds += 60;
        finalMinutes--;
      }
      if (finalMinutes < 0) {
        finalMinutes += 60;
        finalHours--;
      }
      if (finalHours < 0) {
        finalHours += 24;
        days--;
      }

      setTimeDiff({
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        hours: Math.max(0, finalHours),
        minutes: Math.max(0, finalMinutes),
        seconds: Math.max(0, finalSeconds)
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [coupleData]);

  // Photo Carousel rotation interval
  useEffect(() => {
    if (!coupleData || !coupleData.fotos || coupleData.fotos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % coupleData.fotos.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [coupleData]);

  // Continuous floating hearts rain emitter
  useEffect(() => {
    if (isLoading || loadError) return;

    const emitHeart = () => {
      const id = heartIdCounter.current++;
      const left = Math.random() * 100; 
      const duration = 4 + Math.random() * 3; 
      const scale = 0.5 + Math.random() * 0.7; 
      const emojis = ['❤️', '💖', '💕', '💗', '💘', '🌸', '✨'];
      const text = emojis[Math.floor(Math.random() * emojis.length)];

      setHearts(prev => [...prev, { id, left, duration, scale, text }]);

      setTimeout(() => {
        setHearts(prev => prev.filter(h => h.id !== id));
      }, duration * 1000);
    };

    const interval = setInterval(emitHeart, 800);
    return () => clearInterval(interval);
  }, [isLoading, loadError]);

  // Handle audio player play/pause toggle
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
      audioRef.current.play().then(() => {
        setIsAudioPlaying(true);
      }).catch(err => {
        console.error("Audio blocked by browser policy.", err);
      });
    }
  };

  // Handle Cupid voice message play/pause toggle
  const handleToggleVoice = () => {
    if (!voiceAudioRef.current) return;
    
    if (isVoicePlaying) {
      voiceAudioRef.current.pause();
      setIsVoicePlaying(false);
      
      // Resume background music if it was playing before
      if (wasBackgroundMusicPlayingRef.current && audioRef.current) {
        audioRef.current.play().then(() => {
          setIsAudioPlaying(true);
        }).catch(e => console.log("Failed to resume background music:", e));
      }
    } else {
      // Pause background music if it is currently playing
      if (isAudioPlaying && audioRef.current) {
        wasBackgroundMusicPlayingRef.current = true;
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        wasBackgroundMusicPlayingRef.current = false;
      }
      
      voiceAudioRef.current.play().then(() => {
        setIsVoicePlaying(true);
      }).catch(err => {
        console.error("Voice audio play failed:", err);
      });
    }
  };

  const handleVoiceEnded = () => {
    setIsVoicePlaying(false);
    setVoiceCurrentTime(0);
    
    // Resume background music if it was playing before
    if (wasBackgroundMusicPlayingRef.current && audioRef.current) {
      audioRef.current.play().then(() => {
        setIsAudioPlaying(true);
      }).catch(e => console.log("Failed to resume background music:", e));
    }
  };

  const handleVoiceTimeUpdate = () => {
    if (voiceAudioRef.current) {
      setVoiceCurrentTime(voiceAudioRef.current.currentTime);
      // Fallback for Chrome's MediaRecorder duration bug where duration is Infinity or NaN initially
      if (voiceAudioRef.current.duration && !isNaN(voiceAudioRef.current.duration) && voiceAudioRef.current.duration !== Infinity && voiceDuration === 0) {
        setVoiceDuration(voiceAudioRef.current.duration);
      }
    }
  };

  const handleVoiceLoadedMetadata = () => {
    if (voiceAudioRef.current) {
      setVoiceDuration(voiceAudioRef.current.duration);
    }
  };

  const handleVoiceProgressChange = (e) => {
    const newPercent = parseFloat(e.target.value);
    if (voiceAudioRef.current && voiceDuration > 0) {
      const newTime = (newPercent / 100) * voiceDuration;
      voiceAudioRef.current.currentTime = newTime;
      setVoiceCurrentTime(newTime);
    }
  };

  // Pre-load audio track when coupleData loads
  useEffect(() => {
    if (coupleData && coupleData.musicaUrl && audioRef.current) {
      audioRef.current.src = coupleData.musicaUrl;
      audioRef.current.loop = true;
      
      const autoPlayTimer = setTimeout(() => {
        audioRef.current.play().then(() => {
          setIsAudioPlaying(true);
        }).catch(() => {
          console.log("Autoplay was blocked by browser.");
        });
      }, 1500);

      return () => clearTimeout(autoPlayTimer);
    }
  }, [coupleData]);

  // Word game check answer
  const handleWordSubmit = (e) => {
    e.preventDefault();
    setWordError(false);
    const normalizedGuess = wordGuess.toUpperCase().replace(/\s/g, '');
    const normalizedSolution = coupleData.palavraSecreta.toUpperCase().replace(/\s/g, '');

    if (normalizedGuess === normalizedSolution) {
      setIsWordCorrect(true);
      confetti({
        particleCount: 100,
        spread: 70,
        colors: ['#ff2957', '#ec4899', '#a855f7']
      });
    } else {
      setWordError(true);
    }
  };

  // Custom roulette spinner animation
  const handleSpinRoulette = () => {
    if (isRouletteSpinning || !coupleData.opcoesRoleta || coupleData.opcoesRoleta.length === 0) return;
    
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
        if (maxFlashes - flashesCount < 6) {
          speed += 60;
        }
        setTimeout(flash, speed);
      } else {
        const winningIndex = currentFlashIndex;
        setRouletteIndex(winningIndex);
        setRouletteWinner(coupleData.opcoesRoleta[winningIndex]);
        setIsRouletteSpinning(false);
        
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.75 }
        });
      }
    };
    
    flash();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sugar-50 flex flex-col items-center justify-center gap-4 text-slate-800">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="font-marker text-lg text-slate-500 animate-pulse">Carregando sua surpresa especial...</p>
      </div>
    );
  }

  if (loadError || !coupleData) {
    return (
      <div className="min-h-screen bg-sugar-50 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="bg-white/90 backdrop-blur-md border border-pink-100 rounded-[32px] p-8 max-w-sm shadow-xl shadow-pink-100/30 flex flex-col items-center gap-4">
          <span className="text-4xl">😿</span>
          <h1 className="text-xl font-black text-slate-900 font-display">Página Não Encontrada</h1>
          <p className="text-xs text-slate-500 font-bold leading-relaxed">
            Esta URL ainda não existe ou o pagamento da criação não foi confirmado. Caso tenha acabado de criar, por favor, clique no botão de "Simular Confirmação" na tela de checkout!
          </p>
          <a href="/" className="btn-3d-primary text-xs px-6 py-2.5 mt-2">
            Voltar para o Início
          </a>
        </div>
      </div>
    );
  }

  const moon = getMoonPhase(coupleData.dataInicio);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sugar-50 via-white to-sugar-100 text-slate-800 font-sans relative overflow-x-hidden flex flex-col justify-between py-16 px-5 select-none">
      
      <audio ref={audioRef} />
      {coupleData.audioUrl && (
        <audio 
          ref={voiceAudioRef} 
          src={coupleData.audioUrl.startsWith('http') ? coupleData.audioUrl : `http://localhost:3001${coupleData.audioUrl}`} 
          onEnded={handleVoiceEnded}
          onTimeUpdate={handleVoiceTimeUpdate}
          onLoadedMetadata={handleVoiceLoadedMetadata}
        />
      )}

      {/* Floating play/pause floating music widget */}
      {coupleData.musicaUrl && (
        <button 
          onClick={handleToggleAudio}
          className="fixed top-6 right-6 z-50 p-3.5 rounded-full border-2 border-rose-200/50 bg-white/80 backdrop-blur-md shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isAudioPlaying ? (
            <>
              <Volume2 className="w-4 h-4 text-primary-500 animate-bounce" />
              <span className="text-[9px] font-black uppercase text-slate-700 animate-pulse hidden sm:inline tracking-wider">Pausar Trilha</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-slate-400" />
              <span className="text-[9px] font-black uppercase text-slate-500 hidden sm:inline tracking-wider">Tocar Trilha</span>
            </>
          )}
        </button>
      )}

      {/* Floating Emojis / Hearts rain */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
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

      {/* Main Couple Card layout */}
      <main className="max-w-2xl mx-auto w-full flex flex-col gap-16 relative z-10">
        
        {/* Names Header (Hero Section) */}
        <div className="text-center min-h-[50vh] flex flex-col justify-center items-center">
          <div className="inline-flex items-center justify-center gap-1 px-4 py-1.5 rounded-full text-xs font-black bg-rose-50 border border-rose-200 text-rose-500 shadow-sm shadow-rose-100 animate-pulse">
            <Heart className="w-3.5 h-3.5 fill-current" /> Feliz {timeDiff.years} {timeDiff.years === 1 ? 'Ano' : 'Anos'} Juntos!
          </div>
          
          <h1 className="mt-8 text-5xl sm:text-7xl font-black text-slate-900 font-display tracking-tight leading-none">
            {coupleData.titulo}
          </h1>
          <p className="font-marker text-rose-400 text-xl mt-4 tracking-wide">Para todo o sempre ❤️</p>
          
          <div className="animate-bounce mt-16 text-slate-300">
            <p className="text-[9px] font-black uppercase tracking-widest mb-1">Rolar para ler</p>
            <ChevronDown className="w-5 h-5 mx-auto" />
          </div>
        </div>

        {/* Counter Live Widget (Reveal animation) */}
        <ScrollReveal>
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-[40px] p-8 shadow-2xl shadow-rose-100/50 text-center relative overflow-hidden">
            <div className="absolute -left-6 -top-6 w-24 h-24 bg-rose-50 rounded-full opacity-40"></div>
            
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-center gap-1.5">
              <span>⏰</span> Estamos construindo nossa história há
            </p>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="flex flex-col">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 font-display leading-none">{timeDiff.years}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide mt-2">{timeDiff.years === 1 ? 'Ano' : 'Anos'}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 font-display leading-none">{timeDiff.months}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide mt-2">{timeDiff.months === 1 ? 'Mês' : 'Meses'}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 font-display leading-none">{timeDiff.days}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide mt-2">{timeDiff.days === 1 ? 'Dia' : 'Dias'}</span>
              </div>
            </div>

            <hr className="border-slate-100/80 my-6" />

            <div className="grid grid-cols-3 gap-4 text-slate-600">
              <div className="flex flex-col">
                <span className="text-xl font-bold">{String(timeDiff.hours).padStart(2, '0')}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wide mt-1">Horas</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold">{String(timeDiff.minutes).padStart(2, '0')}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wide mt-1">Minutos</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-primary-500 animate-pulse">{String(timeDiff.seconds).padStart(2, '0')}</span>
                <span className="text-[8px] font-black uppercase text-rose-400 tracking-wide mt-1">Segundos</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Polaroid Photos Carousel */}
        {coupleData.fotos && coupleData.fotos.length > 0 && (
          <ScrollReveal>
            <div className="relative flex justify-center">
              <div className="bg-white border border-slate-200 p-5 pb-12 rounded-[32px] shadow-2xl shadow-rose-100/40 max-w-sm w-full rotate-[-1.5deg] transition-all transform hover:rotate-0">
                <div className="bg-slate-50 aspect-square rounded-2xl overflow-hidden border border-slate-150 relative shadow-inner">
                  {coupleData.fotos.map((photo, index) => (
                    <img 
                      key={index}
                      src={`http://localhost:3001${photo}`} 
                      alt={`slide-${index}`} 
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                        currentPhotoIndex === index ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-95'
                      }`}
                    />
                  ))}
                </div>

                <p className="font-marker text-slate-500 text-center text-sm mt-6 leading-none">
                  {coupleData.fotos.length > 1 ? `Nossas memórias (${currentPhotoIndex + 1}/${coupleData.fotos.length}) 📸` : 'Nossos Momentos ✨'}
                </p>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Message Card */}
        {coupleData.mensagem && (
          <ScrollReveal>
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-[40px] p-8 shadow-2xl shadow-rose-100/40 relative">
              <span className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shadow-lg text-lg">✍️</span>
              <p className="font-marker text-slate-700 text-base leading-loose whitespace-pre-line text-center md:text-left px-2">
                {coupleData.mensagem}
              </p>
            </div>
          </ScrollReveal>
        )}

        {/* Cupid's Commentary & Audio message Card (PREMIUM celestial glassmorphism styling) */}
        {(coupleData.cupidoComentario || coupleData.audioUrl) && (
          <ScrollReveal>
            <div className="bg-gradient-to-br from-white/95 via-rose-50/70 to-amber-50/75 backdrop-blur-md border border-pink-200/80 rounded-[40px] p-8 shadow-2xl shadow-rose-100/40 relative overflow-hidden">
              {/* Cute glowing lights in background */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-200/20 rounded-full blur-2xl"></div>
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-rose-250/20 rounded-full blur-2xl"></div>

              <span className="absolute -top-4 -left-4 w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shadow-lg shadow-amber-100/40 text-xl">👼</span>
              
              <div className="flex flex-col gap-6 relative z-10">
                <div className="text-center md:text-left border-b border-slate-200/60 pb-4">
                  <h3 className="font-black text-slate-900 text-2xl font-display flex items-center justify-center md:justify-start gap-2">
                    O Veredito do Cupido <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Análise celestial do amor de vocês</p>
                </div>

                {coupleData.cupidoComentario && (
                  <div className="relative">
                    <span className="absolute -left-2 -top-4 text-5xl text-rose-200/40 font-serif font-black select-none">“</span>
                    <p className="font-serif italic text-slate-700 text-lg leading-relaxed text-center md:text-left px-4">
                      {coupleData.cupidoComentario}
                    </p>
                    <span className="absolute -right-2 -bottom-6 text-5xl text-rose-200/40 font-serif font-black select-none">”</span>
                  </div>
                )}

                {coupleData.audioUrl && (
                  <div className="mt-4 bg-white/90 backdrop-blur-sm border border-pink-100 rounded-3xl p-5 shadow-lg shadow-rose-100/30 flex flex-col sm:flex-row items-center gap-4">
                    {/* Play/Pause Button */}
                    <button
                      onClick={handleToggleVoice}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/25 cursor-pointer transition-all active:scale-95 flex-shrink-0"
                    >
                      {isVoicePlaying ? (
                        <Pause className="w-6 h-6 fill-white" />
                      ) : (
                        <Play className="w-6 h-6 fill-white ml-1" />
                      )}
                    </button>

                    {/* Scrubbable Track Progress Bar */}
                    <div className="flex-1 w-full">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        <span>Áudio gravado pelo casal</span>
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
                        className="w-full h-2 bg-pink-100 border border-pink-200 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Horoscope & Celestial Sinastry Card (PREMIUM dark-sky styling) */}
        {coupleData.horoscopoTexto && (
          <ScrollReveal>
            <div className="bg-slate-950 border border-indigo-900/30 text-white rounded-[40px] p-8 shadow-2xl shadow-indigo-950/40 relative overflow-hidden">
              {/* Star-like particle effects in CSS */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black pointer-events-none opacity-90 z-0"></div>
              
              {/* Glowing decorative gradients */}
              <div className="absolute -right-20 -top-20 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl z-0"></div>
              <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl z-0"></div>

              <div className="relative z-10 flex flex-col gap-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-5 gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="font-black text-white text-2xl font-display flex items-center justify-center sm:justify-start gap-2">
                      Sinastria Estelar <Sparkles className="w-5 h-5 text-purple-400 fill-purple-400/20" />
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Conexão sob a regência dos astros</p>
                  </div>
                  
                  {/* Zodiac badges display */}
                  {coupleData.signo1 && coupleData.signo2 && (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-2xl shadow">
                        <span className="text-xl leading-none">{coupleData.signo1.symbol}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-1">{coupleData.signo1.name}</span>
                      </div>
                      <span className="text-slate-600 font-black text-sm">+</span>
                      <div className="flex flex-col items-center bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-2xl shadow">
                        <span className="text-xl leading-none">{coupleData.signo2.symbol}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-1">{coupleData.signo2.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Horoscope Text */}
                <div className="font-serif italic text-slate-300 text-base leading-relaxed whitespace-pre-line text-center sm:text-left px-2">
                  {coupleData.horoscopoTexto}
                </div>

                {/* Highlighted Strong Points */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800">
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 flex gap-3.5 hover:scale-[1.01] transition-transform">
                    <span className="text-2xl flex-shrink-0 mt-0.5">🤝</span>
                    <div>
                      <h4 className="font-black text-white text-xs uppercase tracking-wider">Pontos Fortes do Casal</h4>
                      <p className="text-[11px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                        Sintonizados na mesma frequência cósmica, vocês dividem os pesos com leveza e amplificam as alegrias do caminho.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 flex gap-3.5 hover:scale-[1.01] transition-transform">
                    <span className="text-2xl flex-shrink-0 mt-0.5">🔮</span>
                    <div>
                      <h4 className="font-black text-white text-xs uppercase tracking-wider">Destino Compartilhado</h4>
                      <p className="text-[11px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                        A união dos seus elementos astrológicos blinda a relação e nutre uma parceria inabalável no dia a dia.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Romantic Date Suggestions Card (Sunset premium glassmorphism styling) */}
        {coupleData.sugestaoDates && (
          <ScrollReveal>
            <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-rose-50/90 backdrop-blur-md border border-amber-200/60 rounded-[40px] p-8 shadow-2xl shadow-amber-100/40 relative overflow-hidden">
              
              <div className="absolute -right-20 -top-20 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl z-0"></div>
              <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-rose-400/20 rounded-full blur-3xl z-0"></div>

              <div className="relative z-10 flex flex-col gap-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200/60 pb-5 gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="font-black text-slate-900 text-2xl font-display flex items-center justify-center sm:justify-start gap-2">
                      Roteiro de Dates Românticos <Sparkles className="w-5 h-5 text-orange-500 fill-orange-500/20 animate-pulse" />
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Nossa rota de amor sob medida</p>
                  </div>
                  
                  {coupleData.cidade && coupleData.bairro && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/80 backdrop-blur-sm border border-amber-200/60 shadow-md shadow-amber-100/20 text-[10px] font-black uppercase text-slate-800 tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 fill-orange-500/10" />
                      {coupleData.bairro}, {coupleData.cidade}
                    </div>
                  )}
                </div>

                {/* Suggestions Text Content */}
                <div className="font-serif italic text-slate-700 text-base leading-relaxed whitespace-pre-line text-center sm:text-left px-2">
                  {coupleData.sugestaoDates}
                </div>

                {/* Styled Summary Row with icons */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200/60 text-slate-650 text-center">
                  <div className="bg-white/60 border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 hover:scale-105 transition-transform">
                    <Coffee className="w-5 h-5 text-amber-600" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Café da Manhã</span>
                  </div>
                  <div className="bg-white/60 border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 hover:scale-105 transition-transform">
                    <Utensils className="w-5 h-5 text-rose-500" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Almoço</span>
                  </div>
                  <div className="bg-white/60 border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 hover:scale-105 transition-transform">
                    <Moon className="w-5 h-5 text-indigo-500 fill-indigo-500/10" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Jantar</span>
                  </div>
                </div>

              </div>
            </div>
          </ScrollReveal>
        )}

        {/* 🏆 Conquistas do Casal Timeline Section (PREMIUM & Scrolling reveal animations) */}
        {coupleData.conquistas && coupleData.conquistas.length > 0 && (
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-[40px] p-8 shadow-2xl shadow-rose-100/40">
            <div className="flex items-center gap-3 mb-10 border-b pb-4 border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-sm">
                <Trophy className="w-6 h-6 text-rose-500 fill-rose-500/20" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-xl font-display">Nossa Linha do Tempo</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Grandes marcos e conquistas juntas</p>
              </div>
            </div>

            {/* Vertical timeline path */}
            <div className="relative border-l-2 border-dashed border-rose-200 ml-4 flex flex-col gap-10">
              {coupleData.conquistas.map((item, idx) => (
                <ScrollReveal key={idx}>
                  <div className="relative pl-8">
                    {/* Timeline dot circle */}
                    <div className="absolute -left-[11px] top-2 w-5 h-5 rounded-full bg-rose-500 border-2 border-white shadow flex items-center justify-center text-[9px] font-black text-white">
                      {idx + 1}
                    </div>
                    
                    {/* Achievement Card */}
                    <div className="bg-white border border-slate-200/70 rounded-3xl p-5 shadow-lg shadow-slate-100/50 flex flex-col sm:flex-row gap-5 hover:scale-[1.01] transition-transform">
                      <img 
                        src={`http://localhost:3001${item.fotoUrl}`} 
                        alt={item.titulo} 
                        className="w-full sm:w-32 h-32 object-cover rounded-2xl border border-slate-100 flex-shrink-0 shadow-sm"
                      />
                      <div className="flex flex-col justify-center gap-1.5">
                        <h4 className="font-black text-slate-900 text-lg font-display">{item.titulo}</h4>
                        <p className="text-xs text-slate-500 font-bold leading-relaxed">
                          {item.descricao}
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {/* 🔐 Palavra Secreta Game Section (PREMIUM & Reveal animation) */}
        {coupleData.palavraSecreta && (
          <ScrollReveal>
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-[40px] p-8 shadow-2xl shadow-rose-100/40">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                  <Key className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg font-display">Decifre a Palavra Secreta</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Um jogo rápido feito para você</p>
                </div>
              </div>

              {isWordCorrect ? (
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-6 text-center flex flex-col items-center gap-2.5 shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
                  <h4 className="font-black text-emerald-950 text-md font-display">Parabéns! Você decifrou!</h4>
                  <p className="text-xs text-emerald-800 font-bold max-w-xs leading-relaxed">
                    A palavra era: <span className="underline decoration-2 underline-offset-4 decoration-emerald-500 font-black">{coupleData.palavraSecreta}</span>. Eu amo cada pedaço da nossa história! ❤️
                  </p>
                </div>
              ) : (
                <form onSubmit={handleWordSubmit} className="flex flex-col gap-4">
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 font-bold flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>Dica: "{coupleData.palavraSecretaDica || 'Sem dica cadastrada'}"</span>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Sua resposta..."
                      value={wordGuess}
                      onChange={(e) => setWordGuess(e.target.value)}
                      className="flex-1 px-4 py-3.5 border border-pink-200 rounded-2xl font-bold text-sm bg-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-colors"
                    />
                    <button 
                      type="submit"
                      className="px-6 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black rounded-2xl text-xs hover:from-pink-600 hover:to-rose-600 active:translate-y-[1px] shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
                    >
                      Decifrar
                    </button>
                  </div>

                  {wordError && (
                    <p className="text-xs text-red-500 font-black flex items-center gap-1 animate-pulse">
                      ❌ Palavra incorreta, tente novamente!
                    </p>
                  )}
                </form>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* 🎡 Roleta do Destino Section (PREMIUM & Reveal animation) */}
        {coupleData.opcoesRoleta && coupleData.opcoesRoleta.length > 0 && (
          <ScrollReveal>
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-[40px] p-8 shadow-2xl shadow-rose-100/40 text-center">
              <div className="flex items-center gap-3 mb-8 text-left">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg font-display">Roleta do Destino</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">O que vamos fazer no nosso encontro?</p>
                </div>
              </div>

              {/* List interface for flash roulette */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
                {coupleData.opcoesRoleta.map((opt, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3.5 border rounded-2xl text-xs font-black transition-all ${
                      rouletteIndex === idx 
                        ? 'border-rose-350 bg-rose-500 text-white scale-[1.03] shadow-lg shadow-rose-100' 
                        : 'border-slate-100 bg-slate-50/50 text-slate-400'
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>

              {/* Winning message */}
              {rouletteWinner && (
                <div className="mb-8 bg-rose-50/60 border border-rose-200 rounded-2xl p-5 animate-pulse max-w-sm mx-auto">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">O Destino escolheu:</p>
                  <p className="font-black text-slate-800 text-base mt-1.5">{rouletteWinner} 🎉</p>
                </div>
              )}

              <button 
                onClick={handleSpinRoulette}
                disabled={isRouletteSpinning}
                className="btn-3d-primary text-xs px-8 py-3.5 flex items-center justify-center gap-2 mx-auto"
              >
                <RotateCcw className={`w-4 h-4 ${isRouletteSpinning ? 'animate-spin' : ''}`} />
                {isRouletteSpinning ? 'Girando Roleta...' : 'Girar Roleta!'}
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* Moon Phase Section (Reveal animation) */}
        {coupleData.dataInicio && (
          <ScrollReveal>
            <div className="bg-slate-950 border border-indigo-900/30 text-white rounded-[40px] p-8 shadow-2xl shadow-indigo-950/40 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-4xl flex-shrink-0 animate-pulse shadow-md shadow-black">
                {moon.icon}
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-450 flex items-center justify-center md:justify-start gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-rose-400 fill-current" /> Lua do Nosso Encontro
                </p>
                <h4 className="font-black text-white text-lg mt-1.5 font-display">A lua estava em fase {moon.name}</h4>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed font-bold italic">
                  "{moon.desc}"
                </p>
              </div>
            </div>
          </ScrollReveal>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="text-center py-8 text-xs text-slate-400 mt-20 border-t border-slate-100">
        Criado com carinho via <a href="/" className="font-black text-slate-500 hover:text-slate-700 underline">Chamego</a> ❤️
      </footer>

    </div>
  );
}
