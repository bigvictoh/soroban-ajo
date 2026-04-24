'use client';

import { useCallback } from 'react';
import toast, { ToastPosition } from 'react-hot-toast';
import { useNotificationStore } from '@/store/notificationStore';
import { ToastType } from '@/components/Toast';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title?: string;
  /** Duration in ms. 0 = persistent until dismissed. */
  duration?: number;
  position?: ToastPosition;
  action?: ToastAction;
}

const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

const BG: Record<ToastType, string> = {
  success: '#f0fdf4',
  error: '#fef2f2',
  warning: '#fffbeb',
  info: '#eff6ff',
};

const BORDER: Record<ToastType, string> = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export function useToast() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  const show = useCallback(
    (type: ToastType, message: string, opts?: ToastOptions) => {
      const duration = opts?.duration === 0 ? Infinity : (opts?.duration ?? DEFAULT_DURATION[type]);

      // Persist to notification history
      addNotification({ type, message });

      return toast(
        (t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 320 }}>
            {opts?.title && (
              <span style={{ fontWeight: 600, fontSize: 14 }}>{opts.title}</span>
            )}
            <span style={{ fontSize: 14 }}>{message}</span>
            {opts?.action && (
              <button
                onClick={() => {
                  opts.action!.onClick();
                  toast.dismiss(t.id);
                }}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 4,
                  padding: '2px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: `1px solid ${BORDER[type]}`,
                  background: 'transparent',
                  color: BORDER[type],
                  cursor: 'pointer',
                }}
              >
                {opts.action.label}
              </button>
            )}
          </div>
        ),
        {
          icon: ICONS[type],
          duration,
          position: opts?.position,
          style: {
            background: BG[type],
            borderLeft: `4px solid ${BORDER[type]}`,
            padding: '12px 16px',
            maxWidth: 380,
          },
          ariaProps: {
            role: type === 'error' ? 'alert' : 'status',
            'aria-live': type === 'error' ? 'assertive' : 'polite',
          },
        }
      );
    },
    [addNotification]
  );

  return {
    success: (msg: string, opts?: ToastOptions) => show('success', msg, opts),
    error: (msg: string, opts?: ToastOptions) => show('error', msg, opts),
    warning: (msg: string, opts?: ToastOptions) => show('warning', msg, opts),
    info: (msg: string, opts?: ToastOptions) => show('info', msg, opts),
    dismiss: (id?: string) => toast.dismiss(id),
    dismissAll: () => toast.dismiss(),
    /** Wrap a promise: shows loading → success/error automatically */
    promise: <T,>(
      p: Promise<T>,
      msgs: { loading: string; success: string; error: string },
      opts?: Pick<ToastOptions, 'position'>
    ) => {
      addNotification({ type: 'info', message: msgs.loading });
      return toast.promise(p, msgs, { position: opts?.position });
    },
  };
}
