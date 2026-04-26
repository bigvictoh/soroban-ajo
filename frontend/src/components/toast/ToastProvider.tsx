'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { ToastContainer } from './ToastContainer';
import type { ToastContextValue, ToastItem, ToastOptions, ToastPosition, ToastType } from './types';

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
  loading: 0,
  custom: 4000,
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used inside <ToastProvider>');
  return ctx;
}

interface Props {
  children: React.ReactNode;
  defaultPosition?: ToastPosition;
  maxVisible?: number;
}

export function ToastProvider({ children, defaultPosition = 'top-right', maxVisible = 5 }: Props) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [position, setPosition] = useState<ToastPosition>(defaultPosition);

  const add = useCallback((type: ToastType, message: string, opts?: ToastOptions): string => {
    const id = opts?.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = opts?.duration !== undefined ? opts.duration : DEFAULT_DURATION[type];

    const item: ToastItem = {
      ...opts,
      id,
      type,
      message,
      duration,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      // Replace if same id already exists
      const exists = prev.findIndex((t) => t.id === id);
      if (exists !== -1) {
        const next = [...prev];
        next[exists] = item;
        return next;
      }
      return [item, ...prev];
    });

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const update = useCallback((id: string, patch: Partial<Omit<ToastItem, 'id'>>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }, []);

  const ctx: ToastContextValue = { toasts, position, setPosition, add, dismiss, dismissAll, update };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastContainer
        toasts={toasts}
        position={position}
        onDismiss={dismiss}
        maxVisible={maxVisible}
      />
    </ToastContext.Provider>
  );
}
