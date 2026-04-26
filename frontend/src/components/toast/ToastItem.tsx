'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { ToastItem as ToastItemType, ToastPosition } from './types';

// ─── Type config ────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    bar: 'bg-emerald-500',
    border: 'border-emerald-500',
    iconCls: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    title: 'text-emerald-800 dark:text-emerald-200',
    msg: 'text-emerald-700 dark:text-emerald-300',
  },
  error: {
    icon: <XCircle className="w-5 h-5" />,
    bar: 'bg-red-500',
    border: 'border-red-500',
    iconCls: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/40',
    title: 'text-red-800 dark:text-red-200',
    msg: 'text-red-700 dark:text-red-300',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bar: 'bg-amber-500',
    border: 'border-amber-500',
    iconCls: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    title: 'text-amber-800 dark:text-amber-200',
    msg: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    bar: 'bg-blue-500',
    border: 'border-blue-500',
    iconCls: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    title: 'text-blue-800 dark:text-blue-200',
    msg: 'text-blue-700 dark:text-blue-300',
  },
  loading: {
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    bar: 'bg-violet-500',
    border: 'border-violet-500',
    iconCls: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    title: 'text-violet-800 dark:text-violet-200',
    msg: 'text-violet-700 dark:text-violet-300',
  },
  custom: {
    icon: null,
    bar: 'bg-gray-500',
    border: 'border-gray-300 dark:border-gray-600',
    iconCls: 'text-gray-500',
    bg: 'bg-white dark:bg-gray-900',
    title: 'text-gray-900 dark:text-gray-100',
    msg: 'text-gray-600 dark:text-gray-400',
  },
} as const;

// ─── Slide direction by position ────────────────────────────────────────────

function slideVariants(position: ToastPosition) {
  const fromRight = position.includes('right');
  const fromLeft = position.includes('left');
  const fromTop = position === 'top-center';
  const fromBottom = position === 'bottom-center';

  const x = fromRight ? 80 : fromLeft ? -80 : 0;
  const y = fromTop ? -40 : fromBottom ? 40 : 0;

  return {
    initial: { opacity: 0, x, y, scale: 0.92 },
    animate: { opacity: 1, x: 0, y: 0, scale: 1 },
    exit: { opacity: 0, x, y, scale: 0.92 },
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  toast: ToastItemType;
  position: ToastPosition;
  onDismiss: (id: string) => void;
}

export function ToastItem({ toast, position, onDismiss }: Props) {
  const cfg = TYPE_CONFIG[toast.type];
  const duration = toast.duration ?? (toast.type === 'loading' ? 0 : 5000);
  const showProgress = (toast.showProgress ?? true) && duration > 0 && toast.type !== 'loading';

  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  // Progress bar via rAF
  useEffect(() => {
    if (!showProgress) return;
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct > 0) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [duration, showProgress]);

  // Auto-dismiss
  useEffect(() => {
    if (duration === 0) return;
    const t = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(t);
  }, [duration, toast.id, onDismiss]);

  const dismiss = () => onDismiss(toast.id);
  const variants = slideVariants(position);

  // Custom style overrides
  const customBg = toast.style?.background;
  const customBorder = toast.style?.borderColor;
  const customIcon = toast.style?.icon ?? cfg.icon;

  return (
    <motion.div
      layout
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={clsx(
        'relative w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border-l-4',
        'shadow-lg shadow-black/10 dark:shadow-black/30 overflow-hidden',
        toast.style?.className ?? [cfg.bg, cfg.border],
      )}
      style={customBg ? { background: customBg, borderColor: customBorder } : undefined}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {/* Progress bar */}
      {showProgress && (
        <div
          className={clsx('absolute bottom-0 left-0 h-[3px] transition-none', cfg.bar)}
          style={{ width: `${progress}%` }}
        />
      )}

      {/* Custom render */}
      {toast.render ? (
        <div className="p-4">{toast.render(dismiss)}</div>
      ) : (
        <div className="flex items-start gap-3 p-4">
          {/* Icon */}
          {customIcon && (
            <span
              className={clsx('flex-shrink-0 mt-0.5', cfg.iconCls)}
              style={toast.style?.color ? { color: toast.style.color } : undefined}
            >
              {customIcon}
            </span>
          )}

          {/* Body */}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className={clsx('text-sm font-semibold leading-snug', cfg.title)}>
                {toast.title}
              </p>
            )}
            <p
              className={clsx('text-sm leading-snug', cfg.msg, toast.title && 'mt-0.5')}
              style={toast.style?.color ? { color: toast.style.color } : undefined}
            >
              {toast.message}
            </p>

            {/* Action button */}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  if (toast.action!.dismissOnClick !== false) dismiss();
                }}
                className={clsx(
                  'mt-2 text-xs font-semibold px-3 py-1 rounded-md border transition-colors',
                  'hover:bg-black/5 dark:hover:bg-white/10',
                  cfg.iconCls,
                  'border-current'
                )}
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            aria-label="Dismiss notification"
            className={clsx(
              'flex-shrink-0 p-1 rounded-md transition-colors',
              'hover:bg-black/5 dark:hover:bg-white/10',
              cfg.iconCls
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
