import { createContext, useContext } from 'react';

export const ToastContext = createContext({
  toast: () => {},
  undoable: async () => {},
});

export function useToast() {
  return useContext(ToastContext);
}
