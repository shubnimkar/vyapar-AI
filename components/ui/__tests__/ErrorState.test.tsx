/**
 * ErrorState Component Unit Tests
 * 
 * Tests specific examples and edge cases for the ErrorState component.
 * Complements property-based tests.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 11.1-11.7
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ErrorState } from '../ErrorState';

describe('ErrorState Component', () => {
  describe('Basic Rendering', () => {
    it('renders with required props', () => {
      render(
        <ErrorState
          title="Error occurred"
          message="Something went wrong"
        />
      );
      
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders within a Card component', () => {
      const { container } = render(
        <ErrorState
          title="Error"
          message="Error message"
        />
      );
      
      // Card should have white background and rounded corners
      const card = container.querySelector('.bg-white.rounded-lg');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Error Icon Display (Requirement 11.1)', () => {
    it('displays AlertCircle icon', () => {
      const { container } = render(
        <ErrorState
          title="Error"
          message="Error message"
        />
      );
      
      // AlertCircle icon should be present
      const icon = container.querySelector('.text-error-600');
      expect(icon).toBeInTheDocument();
    });

    it('displays icon with 48px size container', () => {
      const { container } = render(
        <ErrorState
          title="Error"
          message="Error message"
        />
      );
      
      const iconContainer = container.querySelector('.w-12.h-12.rounded-full.bg-error-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('displays icon with error-500 color background', () => {
      const { container } = render(
        <ErrorState
          title="Error"
          message="Error message"
        />
      );
      
      const iconContainer = container.querySelector('.bg-error-100');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Title Display (Requirement 11.2)', () => {
    it('displays title with text-lg font-semibold error-900', () => {
      render(
        <ErrorState
          title="Failed to load data"
          message="Error message"
        />
      );
      
      const title = screen.getByText('Failed to load data');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'text-error-900');
    });

    it('renders title as h3 element', () => {
      render(
        <ErrorState
          title="Error Title"
          message="Error message"
        />
      );
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Error Title');
    });
  });

  describe('Error Message Display (Requirement 11.3)', () => {
    it('displays message with text-sm error-600', () => {
      render(
        <ErrorState
          title="Error"
          message="Unable to fetch your daily entries. Please check your connection."
        />
      );
      
      const message = screen.getByText(/Unable to fetch your daily entries/);
      expect(message).toBeInTheDocument();
      expect(message).toHaveClass('text-sm', 'text-error-600', 'max-w-md');
    });

    it('centers message text', () => {
      render(
        <ErrorState
          title="Error"
          message="Error message"
        />
      );
      
      const message = screen.getByText('Error message');
      expect(message.parentElement).toHaveClass('text-center');
    });

    it('constrains message width with max-w-md', () => {
      render(
        <ErrorState
          title="Error"
          message="This is a very long error message that should be constrained"
        />
      );
      
      const message = screen.getByText(/This is a very long error message/);
      expect(message).toHaveClass('max-w-md');
    });
  });

  describe('Recovery Actions (Requirement 11.4)', () => {
    it('displays primary action button when provided', () => {
      const handleRetry = jest.fn();
      
      render(
        <ErrorState
          title="Error"
          message="Error message"
          action={{ label: 'Try Again', onClick: handleRetry }}
        />
      );
      
      const button = screen.getByRole('button', { name: /try again/i });
      expect(button).toBeInTheDocument();
    });

    it('calls onClick when primary action is clicked', async () => {
      const user = userEvent.setup();
      const handleRetry = jest.fn();
      
      render(
        <ErrorState
          title="Error"
          message="Error message"
          action={{ label: 'Try Again', onClick: handleRetry }}
        />
      );
      
      const button = screen.getByRole('button', { name: /try again/i });
      await user.click(button);
      
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('displays secondary action button when provided', () => {
      const handleGoBack = jest.fn();
      
      render(
        <ErrorState
          title="Error"
          message="Error message"
          secondaryAction={{ label: 'Go Back', onClick: handleGoBack }}
        />
      );
      
      const button = screen.getByRole('button', { name: /go back/i });
      expect(button).toBeInTheDocument();
    });

    it('calls onClick when secondary action is clicked', async () => {
      const user = userEvent.setup();
      const handleGoBack = jest.fn();
      
      render(
        <ErrorState
          title="Error"
          message="Error message"
          secondaryAction={{ label: 'Go Back', onClick: handleGoBack }}
        />
      );
      
      const button = screen.getByRole('button', { name: /go back/i });
      await user.click(button);
      
      expect(handleGoBack).toHaveBeenCalledTimes(1);
    });

    it('displays both primary and secondary actions', () => {
      render(
        <ErrorState
          title="Error"
          message="Error message"
          action={{ label: 'Try Again', onClick: jest.fn() }}
          secondaryAction={{ label: 'Go Back', onClick: jest.fn() }}
        />
      );
      
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('does not render buttons when no actions provided', () => {
      render(
        <ErrorState
          title="Error"
          message="Error message"
        />
      );
      
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('applies primary variant to primary action button', () => {
      render(
        <ErrorState
          title="Error"
          message="Error message"
          action={{ label: 'Try Again', onClick: jest.fn() }}
        />
      );
      
      const button = screen.getByRole('button', { name: /try again/i });
      expect(button).toHaveClass('bg-primary-600');
    });

    it('applies outline variant to secondary action button', () => {
      render(
        <ErrorState
          title="Error"
          message="Error message"
          secondaryAction={{ label: 'Go Back', onClick: jest.fn() }}
        />
      );
      
      const button = screen.getByRole('button', { name: /go back/i });
      expect(button).toHaveClass('border-2');
    });
  });

  describe('Content Centering (Requirement 11.5)', () => {
    it('centers content vertically and horizontally', () => {
      const { container } = render(
        <ErrorState
          title="Error"
          message="Error message"
        />
      );
      
      const contentContainer = container.querySelector('.flex.flex-col.items-center.justify-center');
      expect(contentContainer).toBeInTheDocument();
      expect(contentContainer).toHaveClass('text-center');
    });
  });

  describe('Multi-Language Support (Requirement 11.6)', () => {
    it('displays English text', () => {
      render(
        <ErrorState
          title="Failed to load data"
          message="Unable to fetch your daily entries. Please check your connection."
          action={{ label: 'Try Again', onClick: jest.fn() }}
          secondaryAction={{ label: 'Go Back', onClick: jest.fn() }}
        />
      );
      
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      expect(screen.getByText(/Unable to fetch your daily entries/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('displays Hindi text via props', () => {
      render(
        <ErrorState
          title="डेटा लोड करने में विफल"
          message="आपकी दैनिक प्रविष्टियाँ प्राप्त करने में असमर्थ। कृपया अपना कनेक्शन जांचें।"
          action={{ label: 'पुनः प्रयास करें', onClick: jest.fn() }}
        />
      );
      
      expect(screen.getByText('डेटा लोड करने में विफल')).toBeInTheDocument();
    });

    it('displays Marathi text via props', () => {
      render(
        <ErrorState
          title="डेटा लोड करण्यात अयशस्वी"
          message="तुमच्या दैनिक नोंदी मिळवण्यात अक्षम. कृपया तुमचे कनेक्शन तपासा."
          action={{ label: 'पुन्हा प्रयत्न करा', onClick: jest.fn() }}
        />
      );
      
      expect(screen.getByText('डेटा लोड करण्यात अयशस्वी')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className to Card', () => {
      const { container } = render(
        <ErrorState
          title="Error"
          message="Error message"
          className="custom-error-state"
        />
      );
      
      const card = container.querySelector('.custom-error-state');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Complete Examples', () => {
    it('renders complete error state with all props', () => {
      const handleRetry = jest.fn();
      const handleGoBack = jest.fn();
      
      render(
        <ErrorState
          title="Failed to load data"
          message="Unable to fetch your daily entries. Please check your connection and try again."
          action={{ label: 'Try Again', onClick: handleRetry }}
          secondaryAction={{ label: 'Go Back', onClick: handleGoBack }}
          className="custom-class"
        />
      );
      
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      expect(screen.getByText(/Unable to fetch your daily entries/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('renders minimal error state with only required props', () => {
      render(
        <ErrorState
          title="Error"
          message="Something went wrong"
        />
      );
      
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Common Error Scenarios', () => {
    it('renders network error state', () => {
      render(
        <ErrorState
          title="Network Error"
          message="Unable to connect to the server. Please check your internet connection."
          action={{ label: 'Retry', onClick: jest.fn() }}
        />
      );
      
      expect(screen.getByText('Network Error')).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
    });

    it('renders access denied error state', () => {
      render(
        <ErrorState
          title="Access Denied"
          message="You don't have permission to view this page."
          secondaryAction={{ label: 'Go Back', onClick: jest.fn() }}
        />
      );
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You don't have permission/)).toBeInTheDocument();
    });

    it('renders not found error state', () => {
      render(
        <ErrorState
          title="Page Not Found"
          message="The page you're looking for doesn't exist."
          action={{ label: 'Go Home', onClick: jest.fn() }}
        />
      );
      
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long title text', () => {
      const longTitle = 'This is a very long error title that might wrap to multiple lines in the error state component';
      
      render(
        <ErrorState
          title={longTitle}
          message="Error message"
        />
      );
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles very long message text', () => {
      const longMessage = 'This is a very long error message that provides detailed information about what went wrong and what the user should do to resolve the issue. It should be constrained by max-w-md class.';
      
      render(
        <ErrorState
          title="Error"
          message={longMessage}
        />
      );
      
      const message = screen.getByText(longMessage);
      expect(message).toHaveClass('max-w-md');
    });

    it('handles empty string message', () => {
      const { container } = render(
        <ErrorState
          title="Error"
          message=""
        />
      );
      
      const message = container.querySelector('.text-sm.text-error-600');
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent('');
    });
  });
});
