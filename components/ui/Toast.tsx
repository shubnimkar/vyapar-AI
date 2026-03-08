/**
 * Toast Notification Component
 * 
 * Displays temporary notifications for action feedback.
 * Supports success, error, warning, and info types with auto-dismiss.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 12.1-12.8
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/design-system/utils';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * ToastProvider - Manages toast queue and provides context
 * 
 * Wrap your app with this provider to enable toast notifications.
 * 
 * @example
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Default duration based on type (Requirement 12.3)
    const defaultDuration = type === 'error' || type === 'warning' ? 5000 : 3000;
    const finalDuration = duration ?? defaultDuration;

    const newToast: Toast = {
      id,
      type,
      message,
      duration: finalDuration,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

/**
 * useToast - Hook for showing toasts from components
 * 
 * @example
 * const { showToast } = useToast();
 * showToast('success', 'Entry saved successfully');
 * showToast('error', 'Failed to save entry', 5000);
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/**
 * ToastContainer - Renders all active toasts
 * 
 * Positioned in top-right corner with vertical stacking (Requirement 12.1, 12.5)
 */
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/**
 * ToastItem - Individual toast notification
 * 
 * Displays with slide-in animation and auto-dismisses after duration.
 */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  const config = getToastConfig(toast.type);

  return (
    <div
      role="alert"
      className={cn(
        // Base styles
        'flex items-start gap-3 p-4 rounded-lg shadow-lg',
        'min-w-[320px] max-w-[420px]',
        'pointer-events-auto',
        
        // Animation (Requirement 12.7, 12.8)
        'animate-slide-in-right',
        
        // Type-specific colors (Requirement 12.2)
        config.bgColor,
        config.borderColor,
        'border-l-4'
      )}
    >
      {/* Icon (Requirement 12.2) */}
      <div className={cn('flex-shrink-0', config.iconColor)}>
        {config.icon}
      </div>

      {/* Message (Requirement 12.6) */}
      <p className={cn('flex-1 text-sm font-medium', config.textColor)}>
        {toast.message}
      </p>

      {/* Close button (Requirement 12.4) */}
      <button
        onClick={() => onDismiss(toast.id)}
        className={cn(
          'flex-shrink-0 p-1 rounded-md',
          'hover:bg-black/10 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          config.closeButtonFocusRing
        )}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Get toast configuration based on type
 * Returns colors and icon for each toast type (Requirement 12.2)
 */
function getToastConfig(type: ToastType) {
  const configs = {
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      bgColor: 'bg-success-50',
      borderColor: 'border-success-500',
      iconColor: 'text-success-600',
      textColor: 'text-success-900',
      closeButtonFocusRing: 'focus:ring-success-500',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" />,
      bgColor: 'bg-error-50',
      borderColor: 'border-error-500',
      iconColor: 'text-error-600',
      textColor: 'text-error-900',
      closeButtonFocusRing: 'focus:ring-error-500',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-500',
      iconColor: 'text-warning-600',
      textColor: 'text-warning-900',
      closeButtonFocusRing: 'focus:ring-warning-500',
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      bgColor: 'bg-info-50',
      borderColor: 'border-info-500',
      iconColor: 'text-info-600',
      textColor: 'text-info-900',
      closeButtonFocusRing: 'focus:ring-info-500',
    },
  };

  return configs[type];
}
