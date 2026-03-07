/**
 * Pending Transactions Toast Notification Tests
 * 
 * Tests the user feedback system when adding transactions
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Toast from '@/components/Toast';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

describe('Toast Notification Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display success toast with correct styling', () => {
    const onClose = jest.fn();
    render(
      <Toast
        message="Transaction added successfully!"
        type="success"
        onClose={onClose}
        duration={3000}
      />
    );

    expect(screen.getByText('Transaction added successfully!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-green-50');
  });

  it('should display error toast with correct styling', () => {
    const onClose = jest.fn();
    render(
      <Toast
        message="Failed to add transaction"
        type="error"
        onClose={onClose}
        duration={3000}
      />
    );

    expect(screen.getByText('Failed to add transaction')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50');
  });

  it('should auto-dismiss after duration', async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    
    render(
      <Toast
        message="Test message"
        type="info"
        onClose={onClose}
        duration={1000}
      />
    );

    expect(onClose).not.toHaveBeenCalled();

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  it('should close when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <Toast
        message="Test message"
        type="success"
        onClose={onClose}
        duration={3000}
      />
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display warning toast with correct styling', () => {
    const onClose = jest.fn();
    render(
      <Toast
        message="Warning message"
        type="warning"
        onClose={onClose}
        duration={3000}
      />
    );

    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-orange-50');
  });

  it('should display info toast with correct styling', () => {
    const onClose = jest.fn();
    render(
      <Toast
        message="Info message"
        type="info"
        onClose={onClose}
        duration={3000}
      />
    );

    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-50');
  });

  it('should render correct icon for each toast type', () => {
    const onClose = jest.fn();
    
    const { rerender } = render(
      <Toast message="Success" type="success" onClose={onClose} />
    );
    expect(screen.getByRole('alert').querySelector('.text-green-600')).toBeInTheDocument();

    rerender(<Toast message="Error" type="error" onClose={onClose} />);
    expect(screen.getByRole('alert').querySelector('.text-red-600')).toBeInTheDocument();

    rerender(<Toast message="Warning" type="warning" onClose={onClose} />);
    expect(screen.getByRole('alert').querySelector('.text-orange-600')).toBeInTheDocument();

    rerender(<Toast message="Info" type="info" onClose={onClose} />);
    expect(screen.getByRole('alert').querySelector('.text-blue-600')).toBeInTheDocument();
  });
});
