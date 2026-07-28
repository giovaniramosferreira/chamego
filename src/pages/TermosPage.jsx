import { Link } from 'react-router-dom';
import { Logo } from '../ui/kit.jsx';

// Texto completo dos termos, sempre acessível: no login, nas Configurações e
// por link direto. Aceitar acontece no "continuar" da entrada — sem uma tela
// só para isso no meio do caminho.
export default function TermosPage() {
  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[640px] px-6 py-10 screen-enter">
        <Link to="/" className="inline-block mb-8"><Logo className="text-2xl" /></Link>
        <h1 className="font-display text-3xl mb-2">Termos e privacidade</h1>
        <p className="text-ink-3 text-sm mb-8">Atualizado em julho de 2026.</p>

        <div className="space-y-5 text-[.98rem] text-ink-2 leading-relaxed">
          <section>
            <h2 className="font-display text-xl text-ink mb-1.5">O espaço é de vocês dois</h2>
            <p>Tudo que vocês registram no Chamego — eventos, listas, momentos, fotos, mensagens, check-ins — fica visível apenas para as duas pessoas do Espaço do Casal. Não existe feed, perfil público nem compartilhamento com terceiros.</p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink mb-1.5">Seus dados são seus</h2>
            <p>A qualquer momento, em <strong className="text-ink">Configurações → Seus dados</strong>, você pode baixar tudo do espaço em um arquivo, sair do espaço (o conteúdo fica com quem ficou) ou excluir o espaço inteiro — a exclusão apaga eventos, listas, momentos, fotos e conversas, e não tem volta.</p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink mb-1.5">Entrada sem senha</h2>
            <p>O acesso é por conta Google ou por link mágico enviado ao seu email — um link de uso único, válido por 15 minutos. Não guardamos senhas.</p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink mb-1.5">Emails que enviamos</h2>
            <p>Além do link de acesso e do convite ao par, o Chamego pode enviar a agenda do dia seguinte e o resumo semanal. Os dois são opcionais e ficam em <strong className="text-ink">Configurações → Avisos</strong>.</p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink mb-1.5">O que esperamos de você</h2>
            <p>Use o Chamego para a vida a dois de vocês, sem conteúdo ilegal e sem tentar acessar o espaço de outras pessoas. Podemos encerrar espaços que descumpram isso.</p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink mb-1.5">Falar com a gente</h2>
            <p>Dúvidas, pedidos de dados ou reclamações: <a className="text-accent underline" href="mailto:ola@chamego.online">ola@chamego.online</a>.</p>
          </section>
        </div>

        <p className="mt-10 text-sm text-ink-3">
          <Link to="/entrar" className="underline">Voltar para a entrada</Link>
        </p>
      </div>
    </div>
  );
}
