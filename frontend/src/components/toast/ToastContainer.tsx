'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ToastItem } from './ToastItem';
import type { ToastItem as ToastItemType, ToastPosition } from './types';

const POSITION_CLASSES: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4 items-end',
  'top-left': 'top-4 left-4 items-start',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
  'bottom-right': 'bottom-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
};

interface Props {
  toasts: ToastItemType[];
  position: ToastPosition;
  onDismiss: (id: string) => void;
  /** Max visible toasts before queuing. Default: 5 */
  maxVisible?: number;
}

export function ToastContainer({ toasts, position, onDismiss, maxVisible = 5 }: Props) {
  const isBottom = position.startsWith('bottom');
  // For bottom positions, newest toast should appear at bottom (reverse order)
  const visible = toasts.slice(0, maxVisible);
  const ordered = isBottom ? [...visible].reverse() : visible;

  return (
    <div
      className={clsx(
        'fixed z-[9999] flex flex-col gap-2 pointer-events-none',
        POSITION_CLASSES[position]
      )}
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {ordered.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} position={position} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>

      {/* Queue indicator */}
      {toasts.length > maxVisible && (
        <div
          className={clsx(
            'pointer-events-auto self-center px-3 py-1 rounded-full text-xs font-medium',
            'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 shadow-md'
          )}
        >
          +{toasts.length - maxVisible} more
        </div>
      )}
    </div>
  );
}
