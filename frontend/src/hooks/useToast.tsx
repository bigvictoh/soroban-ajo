'use client';

import { useCallback } from 'react';
import { useToastContext } from '@/components/toast';
import { useNotificationStore } from '@/store/notificationStore';
import type { ToastOptions, ToastPosition, ToastType } from '@/components/toast';

export type { ToastOptions, ToastPosition, ToastType };

/**
 * useToast — elegant toast notification hook.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Saved!');
 *   toast.error('Something went wrong', { title: 'Error', duration: 8000 });
 *   toast.loading('Processing...');
 *   const id = toast.loading('Uploading...');
 *   toast.update(id, 'success', 'Done!');
 *   toast.promise(fetchData(), { loading: '...', success: 'Done', error: 'Failed' });
 *   toast.custom(<MyComponent />, { position: 'bottom-center' });
 */
export function useToast() {
  const { add, dismiss, dismissAll, update, setPosition } = useToastContext();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const show = useCallback(
    (type: ToastType, message: string, opts?: ToastOptions): string => {
      // Persist non-loading toasts to notification history
      if (type !== 'loading' && type !== 'custom') {
        addNotification({ type: type as 'success' | 'error' | 'warning' | 'info', message });
      }
      return add(type, message, opts);
    },
    [add, addNotification]
  );

  const promise = useCallback(
    async <T,>(
      p: Promise<T>,
      msgs: { loading: string; success: string | ((data: T) => string); error: string | ((err: unknown) => string) },
      opts?: Omit<ToastOptions, 'duration'>
    ): Promise<T> => {
      const id = show('loading', msgs.loading, { ...opts, id: opts?.id });
      try {
        const data = await p;
        const successMsg = typeof msgs.success === 'function' ? msgs.success(data) : msgs.success;
        update(id, { type: 'success', message: successMsg, duration: 4000 });
        addNotification({ type: 'success', message: successMsg });
        return data;
      } catch (err) {
        const errorMsg = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
        update(id, { type: 'error', message: errorMsg, duration: 6000 });
        addNotification({ type: 'error', message: errorMsg });
        throw err;
      }
    },
    [show, update, addNotification]
  );

  return {
    success: (msg: string, opts?: ToastOptions) => show('success', msg, opts),
    error: (msg: string, opts?: ToastOptions) => show('error', msg, opts),
    warning: (msg: string, opts?: ToastOptions) => show('warning', msg, opts),
    info: (msg: string, opts?: ToastOptions) => show('info', msg, opts),
    loading: (msg: string, opts?: ToastOptions) => show('loading', msg, opts),
    custom: (render: (dismiss: () => void) => React.ReactNode, opts?: ToastOptions) => {
      const id = add('custom', '', { ...opts, render });
      return id;
    },
    /** Update an existing toast (e.g. loading → success) */
    update: (id: string, type: ToastType, message: string, opts?: ToastOptions) =>
      update(id, { type, message, duration: opts?.duration, ...opts }),
    dismiss,
    dismissAll,
    /** Change the global toast position */
    setPosition,
    promise,
  };
}
