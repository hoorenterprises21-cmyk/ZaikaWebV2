import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type Variant = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; variant: Variant }

const ToastContext = createContext<(message: string, variant?: Variant) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, variant: Variant = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  const colors: Record<Variant, string> = {
    success: 'bg-green-600',
    error: 'bg-red-500',
    info: 'bg-neutral-900',
  };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`fade-in ${colors[t.variant]} pointer-events-auto rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
