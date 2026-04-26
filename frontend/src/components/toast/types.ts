export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'custom';

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface ToastAction {
  label: string;
  onClick: () => void;
  /** Dismiss toast after action click. Default: true */
  dismissOnClick?: boolean;
}

export interface ToastStyle {
  background?: string;
  color?: string;
  borderColor?: string;
  icon?: React.ReactNode;
  className?: string;
}

export interface ToastOptions {
  id?: string;
  title?: string;
  /** Duration in ms. 0 = persistent. Default varies by type. */
  duration?: number;
  position?: ToastPosition;
  action?: ToastAction;
  /** Show animated progress bar */
  showProgress?: boolean;
  /** Custom styling overrides */
  style?: ToastStyle;
  /** Render custom content instead of default layout */
  render?: (dismiss: () => void) => React.ReactNode;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  position: ToastPosition;
  setPosition: (p: ToastPosition) => void;
  add: (type: ToastType, message: string, opts?: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  update: (id: string, patch: Partial<Omit<ToastItem, 'id'>>) => void;
}
