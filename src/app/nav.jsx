import { useNavigate } from 'react-router-dom';

// Navegação por id de tela, mesmo vocabulário do protótipo (go / goBack / goTab)
export function useGo() {
  const navigate = useNavigate();
  return (id, opts = {}) => navigate(`/prototipo/${id}`, opts.replace ? { replace: true } : undefined);
}

export function useBack() {
  const navigate = useNavigate();
  return () => navigate(-1);
}
