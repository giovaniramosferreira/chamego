import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import { SessionContext } from './session-context.js';

const EMPTY = { loading: false, user: null, couple: null, partner: null };

export function SessionProvider({ children }) {
  const [state, setState] = useState({ ...EMPTY, loading: true });

  const refresh = useCallback(async () => {
    try {
      const me = await api('/api/me');
      setState({ loading: false, ...me });
    } catch {
      setState(EMPTY);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api('/api/me')
      .then((me) => { if (!cancelled) setState({ loading: false, ...me }); })
      .catch(() => { if (!cancelled) setState(EMPTY); });
    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setState(EMPTY);
  }, []);

  return (
    <SessionContext.Provider value={{ ...state, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
