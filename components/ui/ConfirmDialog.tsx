 'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Card } from './Card';
import { Button, type ButtonVariant } from './Button';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLoading?: boolean;
  confirmVariant?: ButtonVariant;
};

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
  ].join(',');

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((el) => !el.hasAttribute('disabled'));
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmLoading = false,
  confirmVariant = 'danger',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const { titleId, messageId } = useMemo(() => {
    const base = `confirm-dialog-${Math.random().toString(36).slice(2)}`;
    return { titleId: `${base}-title`, messageId: `${base}-message` };
  }, []);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Prefer focusing the confirm action for destructive flows.
    const t = window.setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;

      const focusable = getFocusableElements(root);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      const active = document.activeElement as HTMLElement | null;
      if (!active) return;

      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !root.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        // Click outside closes.
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <Card
        elevation="elevated"
        density="comfortable"
        className="max-w-md w-full"
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
        >
          <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-error-100 flex items-center justify-center">
              <span className="text-error-600 font-bold">!</span>
            </div>
            <h2 id={titleId} className="text-section-heading">
              {title}
            </h2>
          </div>

          <p id={messageId} className="text-neutral-600 mb-6">
            {message}
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => onCancel()}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={confirmVariant}
              size="md"
              fullWidth
              loading={confirmLoading}
              onClick={() => onConfirm()}
              ref={confirmButtonRef}
            >
              {confirmLabel}
            </Button>
          </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

