import React from 'react';
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-pink-50 to-rose-100/50 text-slate-800 border-t border-pink-100 py-16 px-6 font-sans">
      <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Brand */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 border border-pink-200 flex items-center justify-center shadow-md">
              <Heart className="w-4.5 h-4.5 text-white fill-white" />
            </div>
            <span className="font-display font-black text-xl tracking-tight text-pink-600">Chamego</span>
          </div>
          <p className="text-slate-500 text-sm max-w-sm font-medium">
            Criando conexões significativas através de tecnologia humana e divertida. Surpreenda quem você ama em minutos.
          </p>
        </div>

        {/* Column Product */}
        <div className="flex flex-col gap-3">
          <h4 className="font-black text-sm text-pink-600 uppercase tracking-wider">Produto</h4>
          <a href="#recursos" className="text-slate-500 hover:text-pink-600 transition-colors text-sm font-semibold">Recursos</a>
          <a href="#planos" className="text-slate-500 hover:text-pink-600 transition-colors text-sm font-semibold">Planos</a>
          <a href="#faq" className="text-slate-500 hover:text-pink-600 transition-colors text-sm font-semibold">FAQ</a>
        </div>

        {/* Column Legal */}
        <div className="flex flex-col gap-3">
          <h4 className="font-black text-sm text-pink-600 uppercase tracking-wider">Legal</h4>
          <a href="#termos" className="text-slate-500 hover:text-pink-600 transition-colors text-sm font-semibold">Termos de Uso</a>
          <a href="#privacidade" className="text-slate-500 hover:text-pink-600 transition-colors text-sm font-semibold">Privacidade</a>
          <a href="#cookies" className="text-slate-500 hover:text-pink-600 transition-colors text-sm font-semibold">Cookies</a>
        </div>
      </div>

      <div className="mx-auto max-w-5xl border-t border-pink-100 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© 2026 Chamego. Todos os direitos reservados.</p>
        <p>Feito com ❤️ para comemorar o amor.</p>
      </div>
    </footer>
  );
}
