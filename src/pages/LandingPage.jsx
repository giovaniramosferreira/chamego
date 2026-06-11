import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import heroImg from '../assets/hero.png';

// FAQ list
const faqs = [
  {
    q: "Para quem posso criar?",
    a: "Para namorado(a), marido/esposa, amigo(a), mãe, pai, ou qualquer pessoa especial. Funciona para qualquer ocasião: aniversário de namoro, dia dos namorados, aniversário, natal, ou simplesmente para declarar seu amor."
  },
  {
    q: "Preciso saber programar?",
    a: "Não! Em poucos cliques você personaliza com suas fotos, mensagem e música. O resultado é profissional e gerado automaticamente — sem precisar de nenhum conhecimento técnico."
  },
  {
    q: "Por quanto tempo a página fica no ar?",
    a: "Para sempre. Você paga R$19,90 uma única vez e a página fica no ar por tempo indeterminado, sem mensalidades."
  },
  {
    q: "Como funciona o pagamento?",
    a: "Via Pix, com aprovação na hora. Assim que o pagamento é confirmado, sua página é publicada automaticamente e o link liberado."
  },
  {
    q: "Como a pessoa recebe a surpresa?",
    a: "Você recebe um link exclusivo e um QR Code personalizado. Compartilhe o link pelo WhatsApp, ou imprima o QR Code para colocar em uma carta física, cartão de presentes ou caixinha surpresa."
  },
  {
    q: "Posso excluir a página depois?",
    a: "Sim. É só falar com a gente no suporte que removemos sua página quando você quiser."
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
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && currentPhrase === "") {
      timer = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % typewriterPhrases.length);
      }, 300);
    }

    return () => clearTimeout(timer);
  }, [currentPhrase, isDeleting, phraseIndex]);

  return (
    <div className="min-h-screen bg-cream-50 text-ink-900 font-sans pb-24 md:pb-0">
      <Header />

      {/* ── 1. Hero ── */}
      <section className="pt-32 pb-20 px-5">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow mb-4">Presente digital para casais</p>

          <h1 className="font-display text-5xl md:text-6xl tracking-tight leading-[1.05] text-ink-900 max-w-2xl">
            Sua história de{' '}
            <em className="italic text-wine-700">amor</em>{' '}
            merece uma página
          </h1>

          {/* Typewriter */}
          <div className="mt-4 font-display italic text-wine-600 text-2xl h-[1.6em] flex items-center">
            <span>{currentPhrase}</span>
            <span className="w-[2px] h-7 bg-wine-600 ml-1 animate-pulse" />
          </div>

          <p className="mt-5 text-ink-600 text-base max-w-md leading-relaxed">
            Crie uma página inesquecível para presentear quem você ama — em minutos, direto do celular.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start">
            <button
              onClick={() => navigate('/criar')}
              className="btn-primary"
            >
              Criar nossa página — R$19,90
            </button>
          </div>

          <p className="mt-4 text-ink-400 text-sm">+100 mil pessoas emocionadas</p>

          {/* Hero image */}
          <div className="mt-12">
            <img
              src={heroImg}
              alt="Casal feliz com página Chamego"
              className="w-full aspect-[4/3] md:aspect-[16/9] object-cover rounded-[2rem] ring-1 ring-ink-900/10"
            />
          </div>
        </div>
      </section>

      {/* ── 2. Como funciona ── */}
      <section className="bg-white py-24 px-5">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow mb-4">Como funciona</p>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight text-ink-900 mb-16">
            Simples, rápido e emocionante
          </h2>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                n: "01",
                title: "Conte a história de vocês",
                body: "Nomes, data, fotos e mensagem em poucos minutos, direto do celular."
              },
              {
                n: "02",
                title: "Veja a mágica acontecer",
                body: "IA escreve a carta, calcula a sinastria e monta um roteiro de dates com lugares reais perto de vocês."
              },
              {
                n: "03",
                title: "Pague no Pix e compartilhe",
                body: "Link exclusivo e QR Code na hora, para presentear como quiser."
              }
            ].map((step) => (
              <div key={step.n} className="relative">
                <span className="font-display text-6xl text-cream-200 leading-none select-none block mb-4">
                  {step.n}
                </span>
                <h3 className="font-display text-xl text-ink-900 mb-2">{step.title}</h3>
                <p className="text-ink-600 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Cenas ── */}
      <section className="bg-cream-50 py-24 px-5">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow mb-4">O que vai na página</p>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight text-ink-900 mb-12">
            Capítulos da história de vocês
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {scenes.map((scene) => (
              <div key={scene.id} className="card overflow-hidden">
                <img
                  src={scene.media}
                  alt={scene.title}
                  className="w-full aspect-[3/2] object-cover rounded-t-[1.5rem]"
                />
                <div className="p-6">
                  <h3 className="font-display text-lg text-ink-900 mb-2">
                    {scene.icon} {scene.title}
                  </h3>
                  <p className="text-ink-600 text-sm leading-relaxed">{scene.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Depoimentos ── */}
      <section className="bg-white py-24 px-5">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow mb-4">Depoimentos</p>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight text-ink-900 mb-12">
            Quem fez, chorou junto
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                quote: "Gente, fiz isso pro meu mozão e ele CHOROU. Nunca vi ele assim. As fotos, a música, o texto... tudo ficou perfeito. Ele ainda abre o link até hoje!",
                name: "Mariana & João"
              },
              {
                quote: "Fiz em menos de 10 minutos e o resultado parece coisa de designer profissional. Ele ficou sem palavras. Melhor presente que já dei na vida.",
                name: "Ana & Pedro"
              },
              {
                quote: "Montei a surpresa com nossa história, as músicas da nossa viagem, e ela ficou emocionada demais!! Já faço pela segunda vez e vai ter terceira.",
                name: "Lucas & Carol"
              },
              {
                quote: "Criei de surpresa e ele ficou sem acreditar que eu mesma fiz isso. Disse que foi o presente mais lindo que já recebeu. Recomendo 10/10!",
                name: "Vanessa & Ricardo"
              }
            ].map((t, i) => (
              <div key={i} className="card p-8">
                <p className="font-display italic text-lg text-ink-900 leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink-900">{t.name}</span>
                  <span className="text-wine-700">✓ Verificado</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Preço ── */}
      <section className="bg-cream-100 py-24 px-5">
        <div className="mx-auto max-w-6xl flex justify-center">
          <div className="card max-w-md w-full p-10 text-center">
            <p className="eyebrow mb-6">Investimento único</p>

            <div className="mb-2">
              <span className="line-through text-ink-400 text-lg mr-2">R$39,90</span>
            </div>
            <div className="font-display text-6xl text-ink-900 tracking-tight leading-none mb-3">
              R$19,90
            </div>
            <p className="text-ink-600 text-sm mb-8">
              pagamento único via Pix · página vitalícia
            </p>

            <ul className="text-left flex flex-col gap-3 mb-10">
              {[
                "Todas as cenas interativas",
                "Carta de amor escrita por IA",
                "Roteiro de dates com lugares reais",
                "Retrospectiva em stories",
                "Link + QR Code para presentear",
                "No ar para sempre"
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-ink-900">
                  <span className="text-wine-700 font-semibold">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate('/criar')}
              className="btn-primary w-full"
            >
              Criar nossa página
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. FAQ ── */}
      <section className="bg-white py-24 px-5">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow mb-4">Dúvidas frequentes</p>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight text-ink-900 mb-12">
            Tire suas dúvidas
          </h2>

          <div className="flex flex-col gap-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none text-ink-900 font-semibold hover:bg-cream-50 transition-colors cursor-pointer min-h-[44px]"
                >
                  <span className="text-sm md:text-base">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-ink-400 transition-transform flex-shrink-0 ml-4 ${openFaq === idx ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-sm text-ink-600 border-t border-ink-900/10 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. CTA final ── */}
      <section className="bg-cream-50 py-24 px-5 text-center">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-4xl tracking-tight text-ink-900 mb-8">
            Pronto para <em className="italic text-wine-700">emocionar</em>?
          </h2>
          <button
            onClick={() => navigate('/criar')}
            className="btn-primary"
          >
            Criar nossa página — R$19,90
          </button>
        </div>
      </section>

      <Footer />

      {/* ── Sticky mobile CTA ── */}
      <div className="fixed bottom-0 inset-x-0 md:hidden bg-cream-50/95 backdrop-blur border-t border-ink-900/10 p-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => navigate('/criar')}
          className="btn-primary w-full"
        >
          Criar página — R$19,90
        </button>
      </div>
    </div>
  );
}
