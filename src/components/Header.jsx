import { useState } from 'react';
import { Heart, Menu, X, Globe } from 'lucide-react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-6 z-50 px-4 translate-y-0 select-none">
      <div className="mx-auto flex max-w-5xl items-center justify-between bg-white/80 backdrop-blur-md border border-pink-100/80 rounded-full shadow-lg shadow-pink-100/20 px-6 py-3 transition-all duration-300">
        
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 text-slate-900 hover:scale-105 transition-transform">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 border border-pink-200/50 flex items-center justify-center shadow-md shadow-pink-500/20">
            <Heart className="w-4.5 h-4.5 text-white fill-white animate-pulse" />
          </div>
          <span className="font-display font-black text-xl tracking-tight text-pink-600">Chamego</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
          <a className="hover:text-pink-500 transition-colors" href="#como-funciona">Como funciona</a>
          <a className="hover:text-pink-500 transition-colors" href="#recursos">Recursos</a>
          <a className="hover:text-pink-500 transition-colors" href="#planos">Planos</a>
          <a className="hover:text-pink-500 transition-colors" href="#faq">FAQ</a>
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer" title="Change language">
            <div className="relative w-6 h-6 rounded-full bg-slate-100 shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <span className="text-xs font-bold text-slate-500">PT</span>
          </div>
          <a 
            href="/classico/criar" 
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-5 py-2 rounded-full font-bold hover:scale-[1.02] shadow-md shadow-pink-500/20 text-sm transition-all text-center flex items-center"
          >
            Criar Surpresa
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5 text-slate-900" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-md border border-pink-100 rounded-3xl p-6 shadow-xl shadow-pink-150/20 flex flex-col gap-4">
          <a onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-slate-800 hover:text-pink-500 py-1" href="#como-funciona">Como funciona</a>
          <a onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-slate-800 hover:text-pink-500 py-1" href="#recursos">Recursos</a>
          <a onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-slate-800 hover:text-pink-500 py-1" href="#planos">Planos</a>
          <a onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-slate-800 hover:text-pink-500 py-1" href="#faq">FAQ</a>
          <hr className="border-slate-100" />
          <a 
            onClick={() => setMobileMenuOpen(false)}
            href="/classico/criar"
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-full font-bold shadow-md shadow-pink-500/20 text-center block text-sm"
          >
            Criar Surpresa
          </a>
        </div>
      )}
    </header>
  );
}
