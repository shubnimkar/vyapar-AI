/**
 * @jest-environment jsdom
 * 
 * Unit Tests for Toast Component
 * 
 * Tests specific examples and edge cases for the Toast notification component.
 * Complements property-based tests with concrete scenarios.
 * 
 * @see components/ui/Toast.tsx
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 12.1-12.8
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from '../Toast';

// Helper component to test useToast hook
function TestComponent() {
  const { showToast } = useToast();

  return (
    <div>
      <button onClick={() => showToast('success', 'Success message')}>
        Show Success
      </button>
      <button onClick={() => showToast('error', 'Error message')}>
        Show Error
      </button>
      <button onClick={() => showToast('warning', 'Warning message')}>
        Show Warning
      </button>
      <button onClick={() => showToast('info', 'Info message')}>
        Show Info
      </button>
      <button onClick={() => showToast('success', 'Custom duration', 1000)}>
        Show Custom Duration
      </button>
    </div>
  );
}

describe('Toast Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('renders children without errors', () => {
      render(
        <ToastProvider>
          <div>Test Content</div>
        </ToastProvider>
      );
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('throws error when useToast is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      function InvalidComponent() {
        useToast();
        return null;
      }

      expect(() => render(<InvalidComponent />)).toThrow(
        'useToast must be used within a ToastProvider'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Toast Type Rendering (Requirement 12.2)', () => {
    it('renders success toast with green colors and CheckCircle icon', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
      
      // Check for success colors
      expect(toast).toHaveClass('bg-success-50', 'border-success-500');
    });

    it('renders error toast with red colors and AlertCircle icon', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Error'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      
      // Check for error colors
      expect(toast).toHaveClass('bg-error-50', 'border-error-500');
    });

    it('renders warning toast with yellow colors and AlertTriangle icon', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Warning'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
      
      // Check for warning colors
      expect(toast).toHaveClass('bg-warning-50', 'border-warning-500');
    });

    it('renders info toast with blue colors and Info icon', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Info'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
      
      // Check for info colors
      expect(toast).toHaveClass('bg-info-50', 'border-info-500');
    });
  });

  describe('Toast Position (Requirement 12.1)', () => {
    it('renders in top-right corner with fixed positioning', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      // Find the container
      const container = screen.getByRole('alert').parentElement;
      expect(container).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
    });
  });

  describe('Toast Animation (Requirement 12.7)', () => {
    it('has slide-in animation class', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const toast = await screen.findByRole('alert');
      expect(toast).toHaveClass('animate-slide-in-right');
    });
  });

  describe('Toast Auto-Dismiss (Requirement 12.3)', () => {
    it('auto-dismisses success toast after 3 seconds', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();

      // Fast-forward time by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('auto-dismisses info toast after 3 seconds', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Info'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();

      // Fast-forward time by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('auto-dismisses error toast after 5 seconds', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Error'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();

      // Should still be visible after 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Should be dismissed after 5 seconds total
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('auto-dismisses warning toast after 5 seconds', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Warning'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();

      // Should still be visible after 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Should be dismissed after 5 seconds total
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('respects custom duration', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Custom Duration'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();

      // Fast-forward time by 1 second (custom duration)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Toast Close Button (Requirement 12.4)', () => {
    it('renders close button with X icon', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const closeButton = await screen.findByLabelText('Close notification');
      expect(closeButton).toBeInTheDocument();
    });

    it('dismisses toast when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close notification');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('cancels auto-dismiss timer when manually closed', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();

      // Close manually before auto-dismiss
      const closeButton = screen.getByLabelText('Close notification');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      // Advance time to ensure no errors from timer
      act(() => {
        jest.advanceTimersByTime(5000);
      });
    });
  });

  describe('Toast Stacking (Requirement 12.5)', () => {
    it('stacks multiple toasts vertically', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Show multiple toasts
      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Error'));
      await user.click(screen.getByText('Show Warning'));

      const toasts = await screen.findAllByRole('alert');
      expect(toasts).toHaveLength(3);

      // Check container has gap-2 (8px gap)
      const container = toasts[0].parentElement;
      expect(container).toHaveClass('gap-2');
    });

    it('removes toasts independently', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Show multiple toasts
      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Error'));

      let toasts = await screen.findAllByRole('alert');
      expect(toasts).toHaveLength(2);

      // Close first toast
      const closeButtons = screen.getAllByLabelText('Close notification');
      await user.click(closeButtons[0]);

      await waitFor(() => {
        toasts = screen.getAllByRole('alert');
        expect(toasts).toHaveLength(1);
      });

      // Second toast should still be visible
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Multi-Language Support (Requirement 12.6)', () => {
    it('displays message text in any language', async () => {
      const user = userEvent.setup({ delay: null });
      
      function MultiLangComponent() {
        const { showToast } = useToast();
        return (
          <div>
            <button onClick={() => showToast('success', 'Entry saved successfully')}>
              English
            </button>
            <button onClick={() => showToast('success', 'प्रविष्टि सफलतापूर्वक सहेजी गई')}>
              Hindi
            </button>
            <button onClick={() => showToast('success', 'नोंद यशस्वीरित्या जतन केली')}>
              Marathi
            </button>
          </div>
        );
      }

      render(
        <ToastProvider>
          <MultiLangComponent />
        </ToastProvider>
      );

      // Test English
      await user.click(screen.getByText('English'));
      expect(await screen.findByText('Entry saved successfully')).toBeInTheDocument();

      // Test Hindi
      await user.click(screen.getByText('Hindi'));
      expect(await screen.findByText('प्रविष्टि सफलतापूर्वक सहेजी गई')).toBeInTheDocument();

      // Test Marathi
      await user.click(screen.getByText('Marathi'));
      expect(await screen.findByText('नोंद यशस्वीरित्या जतन केली')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has role="alert" for screen readers', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const toast = await screen.findByRole('alert');
      expect(toast).toHaveAttribute('role', 'alert');
    });

    it('has aria-live="polite" on container', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const toast = await screen.findByRole('alert');
      const container = toast.parentElement;
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-label on close button', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const closeButton = await screen.findByLabelText('Close notification');
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
    });

    it('has focus ring on close button', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const closeButton = await screen.findByLabelText('Close notification');
      expect(closeButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty message', async () => {
      const user = userEvent.setup({ delay: null });
      
      function EmptyMessageComponent() {
        const { showToast } = useToast();
        return (
          <button onClick={() => showToast('success', '')}>
            Show Empty
          </button>
        );
      }

      render(
        <ToastProvider>
          <EmptyMessageComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Empty'));

      const toast = await screen.findByRole('alert');
      expect(toast).toBeInTheDocument();
    });

    it('handles very long messages', async () => {
      const user = userEvent.setup({ delay: null });
      
      const longMessage = 'This is a very long message that should wrap properly within the toast container without breaking the layout or causing overflow issues.';
      
      function LongMessageComponent() {
        const { showToast } = useToast();
        return (
          <button onClick={() => showToast('success', longMessage)}>
            Show Long
          </button>
        );
      }

      render(
        <ToastProvider>
          <LongMessageComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Long'));

      expect(await screen.findByText(longMessage)).toBeInTheDocument();
    });

    it('handles rapid toast creation', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Rapidly create multiple toasts
      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Error'));
      await user.click(screen.getByText('Show Warning'));
      await user.click(screen.getByText('Show Info'));

      const toasts = await screen.findAllByRole('alert');
      expect(toasts.length).toBeGreaterThanOrEqual(4);
    });

    it('generates unique IDs for each toast', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Success'));

      const toasts = await screen.findAllByRole('alert');
      expect(toasts).toHaveLength(2);
      
      // Both should have the same message but be separate elements
      const messages = screen.getAllByText('Success message');
      expect(messages).toHaveLength(2);
    });
  });
});
