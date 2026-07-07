import { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const NavigationContext = createContext({ basePath: '/prototipo' });

export function screenPath(basePath, id) {
  const base = `/${String(basePath || '/prototipo').replace(/^\/+|\/+$/g, '')}`;
  return `${base}/${id}`;
}

export function NavigationProvider({ basePath = '/prototipo', children }) {
  return (
    <NavigationContext.Provider value={{ basePath }}>
      {children}
    </NavigationContext.Provider>
  );
}

// Navegação por id de tela, mesmo vocabulário do protótipo (go / goBack / goTab)
export function useGo() {
  const navigate = useNavigate();
  const { basePath } = useContext(NavigationContext);
  return (id, opts = {}) => navigate(screenPath(basePath, id), opts.replace ? { replace: true } : undefined);
}

export function useBack() {
  const navigate = useNavigate();
  return () => navigate(-1);
}
