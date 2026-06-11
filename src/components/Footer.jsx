export default function Footer() {
  return (
    <footer className="bg-cream-100 border-t border-ink-900/10 py-12 px-5 font-sans">
      <div className="mx-auto max-w-6xl flex flex-col items-center gap-3 text-center">
        <a href="/" className="font-display italic font-semibold text-2xl text-wine-700 leading-none">
          Chamego
        </a>
        <p className="text-ink-400 text-sm">Feito com ❤️ no Brasil.</p>
        <p className="text-ink-400 text-sm">© 2026 Chamego. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
