import { Link } from 'react-router-dom';
import { hasClaims } from '../lib/claims';

/**
 * Aviso discreto enquanto houver página criada neste navegador ainda não
 * reivindicada. Some sozinho depois da Reivindicação (token sai do localStorage).
 */
export default function ClaimBanner() {
  if (!hasClaims()) return null;
  return (
    <div className="bg-wine-700 text-cream-50 text-sm text-center px-4 py-2.5">
      Você criou uma página aqui —{' '}
      <Link to="/minhas-paginas" className="underline underline-offset-4 font-semibold">
        entre para gerenciá-la
      </Link>
    </div>
  );
}
