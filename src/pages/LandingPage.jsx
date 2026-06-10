import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, Sparkles, MessageCircle, Mail, ChevronDown, Check, ArrowRight, BookOpen, Clock, Settings, Volume2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// FAQ list
const faqs = [
  {
    q: "Para quem posso criar um presente?",
    a: "Para namorado(a), marido/esposa, amigo(a), mãe, pai, ou qualquer pessoa especial. Funciona para qualquer ocasião: aniversário de namoro, dia dos namorados, aniversário, natal, ou simplesmente para declarar seu amor."
  },
  {
    q: "Preciso saber programar ou editar para criar?",
    a: "Não! Em poucos cliques você personaliza com suas fotos, mensagem e música. O resultado é profissional e gerado automaticamente — sem precisar de nenhum conhecimento técnico."
  },
  {
    q: "Por quanto tempo a página fica disponível?",
    a: "No plano 'Para Sempre', sua página fica disponível por tempo vitalício sem custos adicionais. No plano de '24 horas', o acesso é por 24 horas após a ativação."
  },
  {
    q: "Como a pessoa recebe a surpresa?",
    a: "Você recebe um link exclusivo e um QR Code personalizado. Compartilhe o link pelo WhatsApp, ou imprima o QR Code para colocar em uma carta física, cartão de presentes ou caixinha surpresa."
  },
  {
    q: "Posso alterar a página depois de criada?",
    a: "Sim! Após o pagamento você continua com acesso completo para alterar as fotos, a mensagem ou a música de fundo quando precisar."
  },
  {
    q: "O pagamento é seguro? Como funciona a garantia?",
    a: "Sim, processamos o pagamento através de gateways altamente seguros. Oferecemos uma garantia completa de 7 dias: se você não gostar da sua página, devolvemos seu dinheiro sem burocracias."
  }
];

// Interactive scenes list
const scenes = [
  {
    id: 1,
    title: "Lua do Nosso Encontro",
    icon: "🌙",
    desc: "Mostre a fase da lua exata da data especial de vocês em uma cena noturna, romântica e animada.",
    media: "https://images.unsplash.com/photo-1532693322450-2cb58f537c95?w=400&q=80"
  },
  {
    id: 2,
    title: "Conquistas do Casal",
    icon: "🏆",
    desc: "Exiba as grandes metas que vocês conquistaram juntos — a primeira viagem, a casa própria, o pet.",
    media: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80"
  },
  {
    id: 3,
    title: "Álbum em Polaroid",
    icon: "📸",
    desc: "Um carrossel de fotos vintage simulando Polaroids físicas com mensagens escritas à mão.",
    media: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80"
  },
  {
    id: 4,
    title: "Mapa Estelar",
    icon: "✨",
    desc: "O alinhamento das estrelas no céu na noite exata em que vocês se conheceram.",
    media: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&q=80"
  },
  {
    id: 5,
    title: "Reflexo da Alma",
    icon: "🔮",
    desc: "Um espaço de palavras cruzadas ou perguntas doces que revelam o quanto vocês se conhecem.",
    media: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80"
  },
  {
    id: 6,
    title: "Palavra Secreta",
    icon: "🔐",
    desc: "Esconda uma palavra romântica para seu amor decifrar digitando no celular.",
    media: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80"
  },
  {
    id: 7,
    title: "Nossa Jornada no Mapa",
    icon: "📍",
    desc: "Um mapa interativo traçando a linha de distância ou os locais mais marcantes de vocês.",
    media: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&q=80"
  },
  {
    id: 8,
    title: "Roleta do Destino",
    icon: "🎡",
    desc: "Uma roleta divertida contendo ideias de encontros e jantares românticos para o casal.",
    media: "https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?w=400&q=80"
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeScene, setActiveScene] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  
  // Typewriter effect states
  const typewriterPhrases = [
    "com um contador ao vivo",
    "com a música de vocês",
    "com fotos em Polaroid",
    "com mensagens do coração"
  ];
  const [currentPhrase, setCurrentPhrase] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(100);

  useEffect(() => {
    let timer;
    const fullPhrase = typewriterPhrases[phraseIndex];

    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentPhrase(fullPhrase.substring(0, currentPhrase.length - 1));
        setTypingSpeed(40);
      }, typingSpeed);
    } else {
      timer = setTimeout(() => {
        setCurrentPhrase(fullPhrase.substring(0, currentPhrase.length + 1));
        setTypingSpeed(100);
      }, typingSpeed);
    }

    if (!isDeleting && currentPhrase === fullPhrase) {
      timer = setTimeout(() => setIsDeleting(true), 2000); // Wait before delete
    } else if (isDeleting && currentPhrase === "") {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % typewriterPhrases.length);
      setTypingSpeed(300); // Delay before typing next
    }

    return () => clearTimeout(timer);
  }, [currentPhrase, isDeleting, phraseIndex]);

  const handleStart = () => {
    navigate('/classico/criar');
  };

  const handleNextScene = () => {
    setActiveScene((prev) => (prev + 1) % scenes.length);
  };

  const handlePrevScene = () => {
    setActiveScene((prev) => (prev - 1 + scenes.length) % scenes.length);
  };

  return (
    <div className="min-h-screen bg-sugar-50 text-slate-800 font-sans selection:bg-rose-200">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 overflow-hidden bg-gradient-to-tr from-pink-50/20 via-sugar-50 to-rose-50/30 border-b border-pink-100/60">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:26px_26px] opacity-[0.1]"></div>
        
        <div className="mx-auto max-w-5xl px-5 relative z-10">
          <div className="grid md:grid-cols-[1fr_420px] gap-10 items-center">
            
            {/* Left Content */}
            <div className="text-center md:text-left mx-auto md:mx-0 max-w-xl">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="h-[2px] w-5 bg-rose-300"></span>
                <span className="text-rose-500 text-sm md:text-base font-black tracking-wide uppercase">
                  Sua mini-série que emociona
                </span>
                <span className="h-[2px] w-5 bg-rose-300 md:hidden"></span>
              </div>

              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-slate-900 font-display">
                Declare seu amor
              </h1>

              {/* Typewriter text */}
              <div className="mt-2 text-2xl sm:text-3xl font-marker text-rose-500 h-[1.6em] flex items-center justify-center md:justify-start">
                <span>{currentPhrase}</span>
                <span className="w-[3px] h-8 bg-rose-500 ml-1 animate-pulse"></span>
              </div>

              <p className="mt-4 text-base md:text-lg text-slate-500 max-w-md mx-auto md:mx-0 leading-relaxed font-medium">
                Uma mini-série romântica com a história do casal — fotos, música, mensagem especial e contador ao vivo. Pronta em minutos para enviar por link ou QR Code.
              </p>

              <div className="mt-8 flex justify-center md:justify-start">
                <button onClick={handleStart} className="btn-3d-primary text-lg px-10 py-4.5">
                  ❤️ Surpreenda seu amor agora →
                </button>
              </div>

              {/* Trust Badge */}
              <div className="mt-6 flex items-center justify-center md:justify-start gap-3 bg-white/70 backdrop-blur border border-pink-100/80 rounded-2xl p-3 max-w-sm mx-auto md:mx-0 shadow-md shadow-pink-100/20">
                <p className="text-2xl">🎁</p>
                <div>
                  <p className="text-md font-black text-slate-900 leading-none">+100.543</p>
                  <p className="text-xs text-slate-500 leading-none mt-1 font-bold">Pessoas emocionadas de verdade!</p>
                </div>
              </div>
            </div>

            {/* Right Mockup Display */}
            <div className="relative flex items-end justify-center mx-auto w-full max-w-[360px] h-[480px]">
              {/* Floating Hearts */}
              <span className="absolute top-[8%] left-[4%] text-[40px] text-red-500/70 -rotate-12 animate-pulse">❤️</span>
              <span className="absolute top-[5%] right-[4%] text-[36px] text-red-400/60 rotate-12">❤️</span>
              <span className="absolute top-[40%] -left-8 text-[32px] text-red-500/50 -rotate-[20deg]">❤️</span>
              <span className="absolute top-[35%] -right-8 text-[30px] text-red-400/50 rotate-[15deg]">❤️</span>

              {/* Side cards (mockups) */}
              <div className="absolute left-[2%] bottom-[10%] rotate-[-12deg] z-10 scale-90 origin-bottom border border-pink-100 rounded-[30px] overflow-hidden shadow-xl bg-black w-[160px] h-[320px]">
                <img src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300&q=80" alt="polaroid-ex" className="w-full h-full object-cover opacity-90" />
                <div className="absolute bottom-4 left-0 right-0 text-center text-white font-marker text-xs">
                  Nossa Canção 🎵
                </div>
              </div>

              <div className="absolute right-[2%] bottom-[12%] rotate-[12deg] z-10 scale-90 origin-bottom border border-pink-100 rounded-[30px] overflow-hidden shadow-xl bg-black w-[160px] h-[320px]">
                <img src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=300&q=80" alt="puzzle-ex" className="w-full h-full object-cover opacity-90" />
                <div className="absolute bottom-4 left-0 right-0 text-center text-white font-bold text-[10px]">
                  Fase da Lua 🌙
                </div>
              </div>

              {/* Center Main phone mockup */}
              <div className="relative z-20 border border-pink-200 rounded-[36px] overflow-hidden shadow-2xl bg-white w-[210px] h-[410px] p-2 flex flex-col justify-between">
                <div className="w-full h-full rounded-[28px] overflow-hidden bg-rose-50 border border-pink-100 p-4 flex flex-col justify-between relative">
                  
                  {/* Hearts floating anim preview */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                    <span className="text-xl animate-bounce">❤️</span>
                  </div>

                  {/* Header preview */}
                  <div className="text-center">
                    <div className="text-[10px] font-black uppercase text-pink-500">Chamego</div>
                    <div className="font-marker text-sm mt-1 text-slate-850">Ana & Pedro</div>
                  </div>

                  {/* Polaroid preview */}
                  <div className="bg-white p-2 border border-pink-100 rounded-lg shadow-md rotate-2 my-2">
                    <div className="bg-slate-100 aspect-square rounded overflow-hidden">
                      <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80" alt="mockup-img" className="w-full h-full object-cover" />
                    </div>
                    <p className="font-marker text-[9px] text-center mt-1 text-slate-700">Primeiro Encontro!</p>
                  </div>

                  {/* Counter preview */}
                  <div className="bg-white/80 backdrop-blur border border-pink-100 rounded-xl p-2 text-center shadow-sm">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Tempo juntos</div>
                    <div className="font-black text-slate-800 text-sm mt-0.5">365 dias</div>
                    <div className="text-[7px] text-slate-400 font-bold mt-0.5">14h 25m 08s</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Como funciona Section */}
      <section id="como-funciona" className="py-24 bg-white border-b border-pink-100/50 relative">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-primary-500 font-black">COMO FUNCIONA</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display mt-2">
              Simples, rápido e emocionante
            </h2>
            <p className="mt-3 text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
              Você preenche, nós criamos. O link chega na hora no seu WhatsApp ou e-mail.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 relative">
            
            {/* Step 1 */}
            <div className="relative bg-white/90 backdrop-blur-md rounded-[32px] border border-pink-100/80 p-8 shadow-xl shadow-pink-100/20 hover:-translate-y-1 transition-transform">
              <span className="absolute top-4 right-5 text-5xl font-marker text-rose-200 select-none">01</span>
              <div className="w-14 h-14 rounded-2xl bg-white border border-pink-150 flex items-center justify-center mb-6 text-2xl shadow-sm">
                👆
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2 font-display">Clique em "Criar surpresa"</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-bold">
                Sem cadastro complicado ou cartão de crédito. Você começa em segundos direto no site.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-white/90 backdrop-blur-md rounded-[32px] border border-pink-100/80 p-8 shadow-xl shadow-pink-100/20 hover:-translate-y-1 transition-transform">
              <span className="absolute top-4 right-5 text-5xl font-marker text-rose-200 select-none">02</span>
              <div className="w-14 h-14 rounded-2xl bg-white border border-pink-150 flex items-center justify-center mb-6 text-2xl shadow-sm">
                📝
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2 font-display">Preencha os dados</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-bold">
                Escreva o nome de vocês, escolha a data de início, suba suas fotos do celular e escolha a música especial.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-white/90 backdrop-blur-md rounded-[32px] border border-pink-100/80 p-8 shadow-xl shadow-pink-100/20 hover:-translate-y-1 transition-transform">
              <span className="absolute top-4 right-5 text-5xl font-marker text-rose-200 select-none">03</span>
              <div className="w-14 h-14 rounded-2xl bg-white border border-pink-150 flex items-center justify-center mb-6 text-2xl shadow-sm">
                📲
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2 font-display">Receba o link e envie!</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-bold">
                O link e o QR Code chegam na hora. Pronto para enviar por mensagem ou imprimir em um cartão romântico.
              </p>
            </div>

          </div>

          <div className="text-center mt-12">
            <p className="text-sm text-slate-500 font-bold flex items-center justify-center gap-1.5">
              <span>⚡</span> Usuários conseguem criar a surpresa em <strong className="text-slate-950 font-black">menos de 3 minutos</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Experiencias Interativas Showcase */}
      <section className="py-24 bg-sugar-50 border-b border-pink-100/50 overflow-hidden">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-500">EXPERIÊNCIAS INTERATIVAS</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display mt-2">
              Transforme a página do seu amor
            </h2>
            <p className="mt-3 text-slate-500 font-bold max-w-md mx-auto">
              Além da página principal, você pode rechear o link com cenas interativas feitas sob medida para emocionar.
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_360px] gap-12 items-center">
            
            {/* Left selector */}
            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black self-start border border-pink-200 bg-pink-50 text-pink-600 mb-2">
                <span>✨</span><span>Cena {activeScene + 1} de {scenes.length}</span>
              </div>
              
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 font-display">
                {scenes[activeScene].icon} {scenes[activeScene].title}
              </h3>
              <p className="text-slate-500 font-bold leading-relaxed max-w-sm mt-1">
                {scenes[activeScene].desc}
              </p>

              {/* Tabs list */}
              <div className="grid grid-cols-4 gap-2 mt-6 max-w-md">
                {scenes.map((s, idx) => (
                  <button 
                    key={s.id}
                    onClick={() => setActiveScene(idx)}
                    className={`p-2 border text-xs font-black rounded-xl transition-all cursor-pointer ${
                      activeScene === idx 
                        ? 'border-pink-500 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20 -translate-y-[1px]' 
                        : 'border-pink-100 bg-white hover:border-pink-300 text-slate-600'
                    }`}
                  >
                    Cena {s.id}
                  </button>
                ))}
              </div>

              {/* Navigation controls */}
              <div className="flex items-center gap-3 mt-8">
                <button onClick={handlePrevScene} className="w-11 h-11 rounded-full border border-pink-200 bg-white flex items-center justify-center text-pink-600 hover:bg-rose-50 hover:scale-105 active:scale-95 transition-all shadow-md shadow-pink-100/30 cursor-pointer">
                  ←
                </button>
                <button onClick={handleNextScene} className="w-11 h-11 rounded-full border border-pink-200 bg-white flex items-center justify-center text-pink-600 hover:bg-rose-50 hover:scale-105 active:scale-95 transition-all shadow-md shadow-pink-100/30 cursor-pointer">
                  →
                </button>
                <button onClick={handleStart} className="btn-3d-primary text-sm px-6 py-3 ml-2">
                  Criar meu presente R$ 39,90 →
                </button>
              </div>
            </div>

            {/* Right Display phone frame */}
            <div className="flex justify-center">
              <div className="border border-pink-200 rounded-[40px] overflow-hidden bg-white shadow-xl shadow-pink-150/20 p-2 w-[240px] h-[460px]">
                <div className="w-full h-full rounded-[30px] overflow-hidden bg-slate-950 relative flex items-center justify-center">
                  <img 
                    src={scenes[activeScene].media} 
                    alt={scenes[activeScene].title} 
                    className="w-full h-full object-cover opacity-80 transition-all duration-300 transform scale-100 hover:scale-105" 
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-center">
                    <p className="text-white text-md font-marker">{scenes[activeScene].title}</p>
                    <p className="text-white/60 text-[8px] font-bold mt-1">Interação dinâmica ao vivo</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Recursos Section */}
      <section id="recursos" className="py-24 bg-white border-b border-pink-100/50">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-500">RECURSOS</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display mt-2">
              Crie um presente memorável e único
            </h2>
            <p className="mt-3 text-slate-500 font-bold max-w-md mx-auto">
              Nossa plataforma oferece tudo para criar uma experiência digital romântica de nível profissional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-white/90 backdrop-blur-md rounded-[32px] border border-pink-100/80 p-6 flex flex-col gap-4 shadow-xl shadow-pink-100/25 hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-150 flex items-center justify-center text-xl shadow-sm">
                ♾️
              </div>
              <h3 className="font-black text-slate-900 text-lg font-display">Para sempre no ar</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-bold">
                Sua página fica disponível vitaliciamente conforme o plano escolhido, sem taxas ocultas ou mensalidades.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/90 backdrop-blur-md rounded-[32px] border border-pink-100/80 p-6 flex flex-col gap-4 shadow-xl shadow-pink-100/25 hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-150 flex items-center justify-center text-xl shadow-sm">
                🎨
              </div>
              <h3 className="font-black text-slate-900 text-lg font-display">100% personalizável</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-bold">
                Escolha as fotos do casal, escreva a sua carta de amor e ajuste todos os pequenos detalhes para ficar com o estilo de vocês.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/90 backdrop-blur-md rounded-[32px] border border-pink-100/80 p-6 flex flex-col gap-4 shadow-xl shadow-pink-100/25 hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-150 flex items-center justify-center text-xl shadow-sm">
                🎵
              </div>
              <h3 className="font-black text-slate-900 text-lg font-display">Com trilha sonora especial</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-bold">
                Integre a música do casal diretamente no plano de fundo da página. Ela toca em autoplay ao abrir!
              </p>
            </div>

            {/* Big feature block */}
            <div className="md:col-span-2 bg-gradient-to-br from-pink-50 to-rose-50 rounded-[32px] border border-pink-100 p-8 flex flex-col md:flex-row justify-between gap-6 shadow-xl shadow-pink-100/20 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none select-none text-9xl">📸</div>
              <div className="flex flex-col justify-end max-w-sm gap-2">
                <h3 className="font-black text-slate-900 text-xl font-display">Relembre seus melhores momentos</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-bold">
                  Fotos Polaroid, carta romântica e o cronômetro do amor se reúnem em uma única página projetada para fazer chorar de emoção.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <img src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=300&q=80" alt="polaroid-grid" className="w-28 h-28 border border-pink-200 bg-white rotate-6 rounded-[20px] shadow-lg object-cover" />
              </div>
            </div>

            {/* Black Block preview */}
            <div className="bg-gradient-to-br from-pink-600 to-rose-600 text-white rounded-[32px] border border-pink-400 p-6 flex flex-col justify-between shadow-xl shadow-pink-500/25 hover:-translate-y-1 transition-transform">
              <div>
                <p className="text-[10px] font-black tracking-widest text-pink-200 mb-1 uppercase">RETROSPECTIVA</p>
                <h3 className="font-black text-white text-base font-display">Uma retrospectiva incrível</h3>
                <p className="text-pink-100 text-xs mt-2 leading-relaxed font-bold">
                  Uma retrospectiva interativa das datas marcantes do casal.
                </p>
              </div>
              <div className="flex items-center justify-center pt-4">
                <span className="text-4xl animate-bounce">🎬</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-5xl px-5">
          <div className="relative overflow-hidden rounded-[32px] py-12 px-8 md:px-14 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 border border-pink-400/50 shadow-xl shadow-pink-200/40">
            <div className="relative z-10">
              <p className="text-white/80 text-xs font-black uppercase tracking-widest mb-2">EXPERIMENTE GRÁTIS</p>
              <h2 className="text-2xl md:text-3xl font-black text-white font-display mb-2">Teste a criação agora</h2>
              <p className="text-white/80 text-sm font-bold max-w-sm">
                Veja o formulário e monte a página do seu casal antes mesmo de decidir.
              </p>
            </div>
            <div className="relative z-10">
              <button onClick={handleStart} className="btn-3d-secondary text-base px-8 py-4 !text-pink-600 border-pink-100 shadow-md">
                Criar página teste →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials (Client Reviews) */}
      <section className="py-24 bg-sugar-50 border-t border-b border-pink-100/50 overflow-hidden">
        <div className="mx-auto max-w-5xl px-5 mb-14 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-500">DEPOIMENTOS</p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 font-display mt-2">O que dizem os namorados</h2>
          <p className="mt-3 text-slate-500 font-bold max-w-md mx-auto">
            Histórias de quem usou o Chamego e surpreendeu seu amor com o presente digital.
          </p>
        </div>

        {/* Marquee style reviews */}
        <div className="w-full flex gap-6 overflow-x-auto pb-4 px-6 snap-x snap-mandatory scrollbar-none">
          <div className="flex-shrink-0 w-[280px] bg-white rounded-[32px] border border-pink-100/80 p-6 shadow-xl shadow-pink-100/20 snap-center">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-xs text-slate-600 font-bold italic mb-4 leading-relaxed">
              "Gente, fiz isso pro meu mozão e ele CHOROU 😭 Nunca vi ele assim. As fotos, a música, o texto... tudo ficou perfeito. Ele ainda abre o link até hoje!"
            </p>
            <hr className="border-slate-100 my-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">Mariana & João</span>
              <span className="text-emerald-600 font-black">✓ Verificado</span>
            </div>
          </div>

          <div className="flex-shrink-0 w-[280px] bg-white rounded-[32px] border border-pink-100/80 p-6 shadow-xl shadow-pink-100/20 snap-center">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-xs text-slate-600 font-bold italic mb-4 leading-relaxed">
              "Fiz em menos de 10 minutos e o resultado parece coisa de designer profissional. Ele ficou sem palavras 🤯❤️ Melhor presente que já dei na vida."
            </p>
            <hr className="border-slate-100 my-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">Ana & Pedro</span>
              <span className="text-emerald-600 font-black">✓ Verificado</span>
            </div>
          </div>

          <div className="flex-shrink-0 w-[280px] bg-white rounded-[32px] border border-pink-100/80 p-6 shadow-xl shadow-pink-100/20 snap-center">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-xs text-slate-600 font-bold italic mb-4 leading-relaxed">
              "Montei a surpresa com nossa história, as músicas da nossa viagem, e ela ficou emocionada demais!! Já faço pela segunda vez e vai ter terceira."
            </p>
            <hr className="border-slate-100 my-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">Lucas & Carol</span>
              <span className="text-emerald-600 font-black">✓ Verificado</span>
            </div>
          </div>

          <div className="flex-shrink-0 w-[280px] bg-white rounded-[32px] border border-pink-100/80 p-6 shadow-xl shadow-pink-100/20 snap-center">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-xs text-slate-600 font-bold italic mb-4 leading-relaxed">
              "Criei de surpresa e ele ficou sem acreditar que eu mesma fiz isso. Disse que foi o presente mais lindo que já recebeu ❤️ Recomendo 10/10!"
            </p>
            <hr className="border-slate-100 my-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">Vanessa & Ricardo</span>
              <span className="text-emerald-600 font-black">✓ Verificado</span>
            </div>
          </div>
        </div>
      </section>

      {/* Planos (Pricing) Section */}
      <section id="planos" className="py-24 bg-white border-b border-pink-100/50">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-500">TABELA DE PREÇOS</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 font-display mt-2">
              Escolha seu plano
            </h2>
            <p className="mt-3 text-slate-500 font-bold max-w-md mx-auto">
              Pague uma única vez e emocione quem você ama. Sem taxas recorrentes ou surpresas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            
            {/* Plan 24 Horas */}
            <div className="bg-white/90 backdrop-blur-md rounded-[32px] border border-pink-100/80 p-8 shadow-xl shadow-pink-100/25 flex flex-col justify-between hover:scale-[1.01] transition-all">
              <div>
                <h3 className="text-xl font-black text-slate-905 font-display text-pink-650">Acesso 24 Horas</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Perfeito para uma surpresa rápida de aniversário</p>
                <div className="my-6">
                  <span className="text-3xl font-black text-slate-900">R$ 24,90</span>
                  <span className="text-xs text-slate-500 font-bold ml-1">/ pagamento único</span>
                </div>
                <hr className="border-slate-100 my-4" />
                <ul className="flex flex-col gap-3 text-sm font-bold text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-500" /> Acesso por 24 horas no ar
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-500" /> Personalize após criar
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-500" /> QR Code exclusivo para impressão
                  </li>
                </ul>
              </div>
              <button onClick={handleStart} className="btn-3d-secondary w-full text-center mt-8 py-3">
                Selecionar plano →
              </button>
            </div>

            {/* Plan Para Sempre */}
            <div className="bg-rose-50/60 rounded-[32px] border border-pink-200 p-8 shadow-2xl shadow-pink-100/30 flex flex-col justify-between relative overflow-hidden hover:scale-[1.01] transition-all">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-[9px] uppercase px-3 py-1 rounded-full shadow-md shadow-pink-500/20">
                Mais popular 🔥
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-905 font-display text-pink-600">Para Sempre</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Sua história eternizada na internet para sempre</p>
                <div className="my-6">
                  <span className="text-3xl font-black text-slate-900">R$ 39,90</span>
                  <span className="text-xs text-slate-500 font-bold ml-1">/ pagamento único</span>
                </div>
                <hr className="border-pink-100 my-4" />
                <ul className="flex flex-col gap-3 text-sm font-bold text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-500" /> Acesso vitalício — não expira
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-500" /> Edição grátis a qualquer hora
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-500" /> QR Code exclusivo para presentes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-500" /> Suporte técnico humanizado
                  </li>
                </ul>
              </div>
              <button onClick={handleStart} className="btn-3d-primary w-full text-center mt-8 py-3">
                ❤️ Garantir vitalício →
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-sugar-50 border-b border-pink-100/50">
        <div className="mx-auto max-w-3xl px-5">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-500">DÚVIDAS FREQUENTES</p>
            <h2 className="text-3xl font-black text-slate-900 font-display mt-2">Tire suas Dúvidas</h2>
            <p className="mt-3 text-slate-500 font-bold">
              Separamos as perguntas mais comuns dos namorados.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-sm shadow-pink-100/10">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4.5 text-left focus:outline-none font-bold text-slate-800 hover:bg-pink-50/30 cursor-pointer"
                >
                  <span className="text-sm md:text-base">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-xs md:text-sm text-slate-500 font-medium border-t border-pink-100/50 leading-relaxed bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
