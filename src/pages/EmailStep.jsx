import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Heart, Mail, Phone, ArrowRight, AlertCircle } from 'lucide-react';

export default function EmailStep() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const slug = searchParams.get('slug') || '';
  const plan = searchParams.get('plan') || 'forever';

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleContinue = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }
    if (!phone.trim() || phone.length < 9) {
      setError('Por favor, insira um telefone celular válido.');
      return;
    }

    // Redirect to checkout with details
    navigate(`/criar/checkout?slug=${slug}&plan=${plan}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`);
  };

  return (
    <div className="min-h-screen bg-sugar-50 text-slate-800 font-sans flex flex-col justify-between select-none">
      
      <header className="border-b border-pink-100 bg-white/80 backdrop-blur-md py-4 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
          <span className="font-display font-black text-lg text-pink-600 tracking-tight">Chamego</span>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-12 flex flex-col justify-center">
        
        <form onSubmit={handleContinue} className="bg-white border border-pink-100 rounded-[32px] p-8 shadow-xl shadow-pink-100/30 flex flex-col gap-5">
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center mx-auto mb-4 text-xl shadow-sm">
              ✉️
            </div>
            <h1 className="text-2xl font-black text-slate-905 font-display">Onde enviamos seu link?</h1>
            <p className="text-xs text-slate-400 font-bold mt-1">Preencha os dados abaixo para receber o acesso da sua página.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-800 font-bold">
              <AlertCircle className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-pink-400" /> E-mail
            </label>
            <input 
              type="email" 
              placeholder="exemplo@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-pink-200 rounded-xl bg-white font-semibold text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </div>

          {/* Phone Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-pink-400" /> WhatsApp
            </label>
            <input 
              type="tel" 
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-pink-200 rounded-xl bg-white font-semibold text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <button 
            type="submit"
            className="btn-3d-primary text-base py-3.5 w-full mt-4 flex items-center justify-center gap-2"
          >
            Ir para o Checkout <ArrowRight className="w-4 h-4" />
          </button>

        </form>

      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-pink-100 bg-white">
        © 2026 Chamego · Seguro e Criptografado 🔒
      </footer>

    </div>
  );
}
