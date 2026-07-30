import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../ui/kit.jsx';
import { GRATIS, PAGO, PLANO_NOME } from '../lib/plan.js';
import abraco from '../assets/abraco.png';
import encontro from '../assets/encontro.png';
import janela from '../assets/janela.png';
import onibus from '../assets/onibus.png';

const STEPS = [
  { num: '01', title: 'Criem o espaço', text: 'Escolham um nome carinhoso, a data que virou o começo de tudo e pronto: o cantinho de vocês existe.' },
  { num: '02', title: 'Convide seu par', text: 'Um link ou código de pareamento conecta os dois. Dá pra começar sozinho(a) e convidar depois, sem pressa.' },
  { num: '03', title: 'Organizem juntos', text: 'Agenda, listas e memórias compartilhadas — tudo que é de vocês dois, finalmente num lugar só.' },
];

const SCENES = [
  { img: encontro, idx: 'Agenda', title: 'Para nunca mais esquecer', text: 'Aniversários, consultas, jantares. Um calendário só do casal, com lembretes pros dois.' },
  { img: janela, idx: 'Listas', title: 'Para dividir a vida real', text: 'Mercado, casa, presentes, sonhos. Listas compartilhadas onde cada um faz a sua parte.' },
  { img: onibus, idx: 'Momentos', title: 'Para guardar o que importa', text: 'A linha do tempo das memórias de vocês: fotos, notas e datas que merecem ser lembradas.' },
  { img: abraco, idx: 'Vocês', title: 'Para cuidar da conexão', text: 'Check-ins de humor, metas a dois e um chat privado. Carinho também se organiza.' },
];

const QUOTES = [
  { text: '“A gente vivia esquecendo compromisso um do outro. Agora a agenda é nossa, não minha e dele.”', name: 'Mariana & Pedro', place: 'São Paulo' },
  { text: '“Namoro à distância: o contador de dias e o check-in diário deixaram tudo mais perto.”', name: 'Letícia & Bruno', place: 'Recife/Lisboa' },
  { text: '“Lista de mercado compartilhada salvou nosso sábado. Parece pouco. Não é.”', name: 'Camila & Jé', place: 'Belo Horizonte' },
  { text: '“Achei que era só mais um app. Virou o lugar onde a gente planeja a vida.”', name: 'João & Rafa', place: 'Curitiba' },
];

const FAQ = [
  { q: 'O Chamego é grátis?', a: 'O essencial é grátis pra sempre: agenda, listas, momentos, check-in, chat e convite do par, sem prazo e sem cartão. O Chamego Juntos (R$ 14,90/mês ou R$ 89/ano por casal) abre fotos e cápsulas ilimitadas, álbuns, retrospectiva e todos os packs de conteúdo.' },
  { q: 'Dá pra dar de presente?', a: 'Dá — e sem precisar criar conta. Você escolhe o tempo (3, 6 ou 12 meses), paga uma vez e recebe um código no email. O casal resgata quando quiser, no próprio app. O código não expira.' },
  { q: 'Posso cancelar quando quiser?', a: 'Pode, em dois toques dentro do app, e você tem 7 dias de arrependimento garantidos por lei. Cancelar não apaga nada: seu conteúdo continua lá, só os recursos pagos deixam de abrir.' },
  { q: 'Preciso de senha?', a: 'Não. Você entra com sua conta Google ou recebe um link mágico no e-mail. Sem senha pra esquecer.' },
  { q: 'Meu par precisa baixar algo?', a: 'Não — o Chamego funciona no navegador do celular e do computador. Seu par entra pelo link do convite e pronto.' },
  { q: 'Quem vê o que a gente registra?', a: 'Só vocês dois. O espaço é privado por padrão: nada de feed, nada de terceiros.' },
  { q: 'E se eu quiser começar sozinho(a)?', a: 'Pode! Crie o espaço, use no seu ritmo e convide seu par quando fizer sentido.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-line last:border-b">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-6 py-5 text-left font-display text-lg">
        {q}
        <span className={`flex-none text-accent transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <p className="pb-6 text-ink-2 max-w-[62ch]">{a}</p>}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="font-sans">
      <header className={`fixed inset-x-0 top-0 z-50 transition-all ${scrolled ? 'bg-bg/80 backdrop-blur-md shadow-[0_1px_0_var(--line)]' : ''}`}>
        <div className="max-w-[1120px] mx-auto px-5 md:px-10 h-[72px] flex items-center justify-between">
          <Logo className="text-2xl" />
          <nav className="flex items-center gap-6">
            <a href="#como" className="hidden md:block text-[.95rem] text-ink-2 hover:text-ink font-medium">Como funciona</a>
            <a href="#areas" className="hidden md:block text-[.95rem] text-ink-2 hover:text-ink font-medium">O que tem</a>
            <a href="#preco" className="hidden md:block text-[.95rem] text-ink-2 hover:text-ink font-medium">Preço</a>
            <a href="#faq" className="hidden md:block text-[.95rem] text-ink-2 hover:text-ink font-medium">Dúvidas</a>
            <Link to="/entrar" className="bg-accent text-accent-ink font-semibold rounded-btn px-4 py-2 text-[.95rem] hover:bg-accent-press transition-colors">Criar nosso espaço</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="pt-32 md:pt-44 pb-20 md:pb-28 text-center">
          <div className="max-w-[880px] mx-auto px-5">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-5">Feito para a vida a dois</p>
            <h1 className="font-display font-normal tracking-tight leading-[1.04] text-[2.7rem] md:text-[4.5rem] mb-4">
              A vida de vocês,<br />organizada com <em className="text-accent">carinho</em>.
            </h1>
            <p className="text-lg text-ink-2 max-w-[50ch] mx-auto mb-8">
              Agenda, listas, memórias e conexão num espaço privado do casal.
              Menos "esqueci de te falar", mais tempo de qualidade juntos.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Link to="/entrar" className="bg-accent text-accent-ink font-semibold rounded-btn px-8 py-4 text-lg hover:bg-accent-press hover:-translate-y-0.5 transition-all shadow-lg">
                Criar nosso espaço →
              </Link>
              <p className="text-[.95rem] text-ink-2">Grátis pra começar · sem senha · pronto em 2 minutos</p>
            </div>
            <div className="mt-14 md:mt-20 relative max-w-[760px] mx-auto">
              <img src={abraco} alt="Casal abraçado" className="w-full max-h-[560px] object-cover rounded-img shadow-2xl" />
              <div className="absolute top-[6%] left-2 md:-left-4 bg-surface rounded-card px-4 py-3 shadow-xl flex items-center gap-3 text-sm font-medium">
                <span className="w-8 h-8 rounded-full bg-accent-soft grid place-items-center text-accent">♥</span>
                <span className="text-left"><span className="block text-[.7rem] uppercase tracking-wider text-ink-3 font-semibold">Juntos há</span>743 dias</span>
              </div>
              <div className="absolute bottom-[8%] right-2 md:-right-4 bg-surface rounded-card px-4 py-3 shadow-xl text-sm text-left">
                <span className="block text-[.7rem] uppercase tracking-wider text-ink-3 font-semibold">Próximo evento</span>
                <span className="font-semibold">Jantar de aniversário 🎂</span>
              </div>
            </div>
          </div>
        </section>

        <section id="como" className="scroll-mt-24 py-20 md:py-28">
          <div className="max-w-[1120px] mx-auto px-5 md:px-10">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-4">Como funciona</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight max-w-[20ch]">Três passos e o espaço está <em className="text-accent">no ar</em>.</h2>
            <div className="grid md:grid-cols-3 gap-8 md:gap-14 mt-14">
              {STEPS.map((s) => (
                <div key={s.num} className="pt-6 border-t border-line">
                  <span className="font-display italic text-5xl text-accent block mb-2">{s.num}</span>
                  <h3 className="font-display text-xl mb-2">{s.title}</h3>
                  <p className="text-ink-2">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="areas" className="scroll-mt-24 py-20 md:py-28 bg-tint">
          <div className="max-w-[1120px] mx-auto px-5 md:px-10">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-4">O que tem dentro</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight max-w-[22ch]">Tudo que é de vocês dois num <em className="text-accent">lugar só</em>.</h2>
            <div className="grid md:grid-cols-2 gap-6 mt-14">
              {SCENES.map((s) => (
                <article key={s.idx} className="bg-surface rounded-card overflow-hidden shadow hover:-translate-y-1 transition-transform">
                  <img src={s.img} alt="" className="w-full h-[210px] object-cover" />
                  <div className="p-6">
                    <span className="text-[.74rem] font-semibold tracking-[.18em] uppercase text-ink-3">{s.idx}</span>
                    <h3 className="font-display text-2xl mt-2 mb-1">{s.title}</h3>
                    <p className="text-ink-2">{s.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="max-w-[1120px] mx-auto px-5 md:px-10">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-4">Quem já usa</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight max-w-[20ch]">Casais que pararam de se <em className="text-accent">desencontrar</em>.</h2>
            <div className="grid md:grid-cols-2 gap-6 mt-14">
              {QUOTES.map((q) => (
                <figure key={q.name} className="bg-surface rounded-card p-8 shadow flex flex-col gap-5">
                  <p className="font-display italic text-xl leading-relaxed">{q.text}</p>
                  <figcaption className="text-[.92rem] text-ink-2"><span className="font-semibold text-ink not-italic">{q.name}</span> · {q.place}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="preco" className="scroll-mt-24 py-20 md:py-28">
          <div className="max-w-[1120px] mx-auto px-5 md:px-10">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-4">Preço</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight max-w-[22ch]">Grátis de verdade — e um plano pra quem <em className="text-accent">quer guardar tudo</em>.</h2>
            <div className="grid md:grid-cols-2 gap-6 mt-14">
              <div className="bg-surface rounded-card p-8 shadow">
                <h3 className="font-display text-2xl mb-1">Chamego Grátis</h3>
                <p className="font-display text-4xl text-accent mb-6">R$ 0<span className="font-sans text-base text-ink-2">/sempre</span></p>
                <ul className="space-y-2.5 mb-8">
                  {GRATIS.map((g) => (
                    <li key={g} className="flex items-start gap-2.5 text-ink-2"><span className="text-accent mt-0.5">✓</span>{g}</li>
                  ))}
                </ul>
                <Link to="/entrar" className="inline-block rounded-btn px-6 py-3 font-semibold shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-[inset_0_0_0_1px_var(--ink)] transition-shadow">Criar nosso espaço</Link>
              </div>
              <div className="bg-surface rounded-card p-8 shadow-xl shadow-[inset_0_0_0_2px_var(--accent)]">
                <h3 className="font-display text-2xl mb-1">{PLANO_NOME}</h3>
                <p className="font-display text-4xl text-accent mb-1">R$ 14,90<span className="font-sans text-base text-ink-2">/mês</span></p>
                <p className="text-[.92rem] text-ink-2 mb-6">ou R$ 89/ano — por casal, não por pessoa</p>
                <ul className="space-y-2.5 mb-8">
                  <li className="flex items-start gap-2.5 text-ink-2"><span className="text-accent mt-0.5">✓</span>Tudo do grátis</li>
                  {PAGO.map((g) => (
                    <li key={g} className="flex items-start gap-2.5 text-ink-2"><span className="text-accent mt-0.5">✓</span>{g}</li>
                  ))}
                </ul>
                <Link to="/entrar" className="inline-block bg-accent text-accent-ink rounded-btn px-6 py-3 font-semibold hover:bg-accent-press transition-colors">Testar 14 dias grátis</Link>
                <p className="text-sm text-ink-3 mt-3">Sem cartão no teste. Cancele em dois toques.</p>
                <p className="text-[.92rem] text-ink-2 mt-4 pt-4 border-t border-line">
                  Quer dar de presente pra um casal?{' '}
                  <Link to="/presente" className="text-accent underline">Presentear o Chamego</Link>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 py-20 md:py-28 bg-tint">
          <div className="max-w-[760px] mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-4">Dúvidas</p>
              <h2 className="font-display text-3xl md:text-4xl">O que todo casal pergunta antes.</h2>
            </div>
            {FAQ.map((f) => <FaqItem key={f.q} {...f} />)}
          </div>
        </section>

        <section className="py-20 md:py-28 text-center">
          <div className="max-w-[760px] mx-auto px-5">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-5">Comece agora</p>
            <h2 className="font-display text-4xl md:text-6xl leading-tight mb-8">A vida a dois merece um <em className="text-accent">chamego</em>.</h2>
            <Link to="/entrar" className="inline-block bg-accent text-accent-ink font-semibold rounded-btn px-8 py-4 text-lg hover:bg-accent-press transition-colors shadow-lg">
              Criar nosso espaço →
            </Link>
            <p className="text-[.92rem] text-ink-2 mt-4">Grátis · sem senha · privado por padrão</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-12">
        <div className="max-w-[1120px] mx-auto px-5 md:px-10 flex flex-wrap items-center justify-between gap-4">
          <Logo className="text-xl" />
          <nav className="flex gap-6 text-[.92rem] text-ink-2">
            <a href="#como" className="hover:text-ink">Como funciona</a>
            <a href="#areas" className="hover:text-ink">O que tem</a>
            <a href="#preco" className="hover:text-ink">Preço</a>
            <Link to="/presente" className="hover:text-ink">Presentear</Link>
            <a href="#faq" className="hover:text-ink">Dúvidas</a>
          </nav>
          <span className="text-sm text-ink-3">© 2026 Chamego · feito com carinho</span>
        </div>
      </footer>
    </div>
  );
}
