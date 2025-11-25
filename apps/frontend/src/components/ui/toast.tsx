'use client';

import * as React from "react"
import { cn } from "@/lib/utils"

type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
}

const ToastContext = React.createContext<{
  toast: (props: ToastProps) => void;
}>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: number })[]>([]);

  const toast = React.useCallback((props: ToastProps) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...props, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-lg p-4 shadow-lg",
              t.variant === 'success' && "bg-green-600 text-white",
              t.variant === 'error' && "bg-red-600 text-white",
              (!t.variant || t.variant === 'default') && "bg-white border"
            )}
          >
            {t.title && <div className="font-semibold">{t.title}</div>}
            {t.description && <div className="text-sm">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};
