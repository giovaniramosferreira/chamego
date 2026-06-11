export default function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-cream-50/90 backdrop-blur border-b border-ink-900/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        {/* Wordmark */}
        <a href="/" className="font-display italic font-semibold text-2xl text-wine-700 leading-none">
          Chamego
        </a>

        {/* CTA */}
        <a
          href="/criar"
          className="btn-primary px-5 py-2.5 min-h-[40px] text-sm"
        >
          Criar página
        </a>
      </div>
    </header>
  );
}
