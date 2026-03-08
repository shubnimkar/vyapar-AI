/**
 * @jest-environment jsdom
 * 
 * Unit Tests for Input Component
 * 
 * Tests specific examples and edge cases for the Input component.
 * Complements property-based tests with concrete scenarios.
 * 
 * @see components/ui/Input.tsx
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 6.1-6.10
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from '../Input';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('renders a text input by default', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders with a label', () => {
      render(<Input label="Username" placeholder="Enter username" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    });

    it('shows required indicator when required prop is true', () => {
      render(<Input label="Email" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('*')).toHaveClass('text-error-500');
    });
  });

  describe('Input Types', () => {
    it('renders number input', () => {
      render(<Input type="number" placeholder="Enter amount" />);
      const input = screen.getByPlaceholderText('Enter amount');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('renders date input', () => {
      const { container } = render(<Input type="date" />);
      const input = container.querySelector('input[type="date"]');
      expect(input).toHaveAttribute('type', 'date');
    });

    it('renders email input', () => {
      render(<Input type="email" placeholder="Enter email" />);
      const input = screen.getByPlaceholderText('Enter email');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders password input', () => {
      render(<Input type="password" placeholder="Enter password" />);
      const input = screen.getByPlaceholderText('Enter password');
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('Textarea', () => {
    it('renders textarea when as="textarea"', () => {
      render(<Input as="textarea" placeholder="Enter description" />);
      const textarea = screen.getByPlaceholderText('Enter description');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('renders textarea with custom rows', () => {
      render(<Input as="textarea" rows={6} placeholder="Enter text" />);
      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveAttribute('rows', '6');
    });

    it('renders textarea with default 4 rows when rows not specified', () => {
      render(<Input as="textarea" placeholder="Enter text" />);
      const textarea = screen.getByPlaceholderText('Enter text');
      expect(textarea).toHaveAttribute('rows', '4');
    });
  });

  describe('Select', () => {
    it('renders select when as="select"', () => {
      render(
        <Input as="select">
          <option value="">Select option</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Input>
      );
      const select = screen.getByRole('combobox');
      expect(select.tagName).toBe('SELECT');
      expect(screen.getByText('Select option')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('renders error state with error message', () => {
      render(<Input label="Email" error="Invalid email address" />);
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      expect(screen.getByText('Invalid email address')).toHaveClass('text-error-600');
    });

    it('renders success state with success message', () => {
      render(<Input label="Email" success="Email is valid" />);
      expect(screen.getByText('Email is valid')).toBeInTheDocument();
      expect(screen.getByText('Email is valid')).toHaveClass('text-success-600');
    });

    it('renders helper text when no error or success', () => {
      render(<Input label="Password" helperText="Must be at least 8 characters" />);
      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
      expect(screen.getByText('Must be at least 8 characters')).toHaveClass('text-neutral-500');
    });

    it('does not show helper text when error is present', () => {
      render(
        <Input 
          label="Password" 
          helperText="Must be at least 8 characters"
          error="Password is too short"
        />
      );
      expect(screen.queryByText('Must be at least 8 characters')).not.toBeInTheDocument();
      expect(screen.getByText('Password is too short')).toBeInTheDocument();
    });

    it('does not show helper text when success is present', () => {
      render(
        <Input 
          label="Password" 
          helperText="Must be at least 8 characters"
          success="Password is strong"
        />
      );
      expect(screen.queryByText('Must be at least 8 characters')).not.toBeInTheDocument();
      expect(screen.getByText('Password is strong')).toBeInTheDocument();
    });
  });

  describe('Prefix and Suffix', () => {
    it('renders with prefix text', () => {
      render(<Input prefix="₹" placeholder="Enter amount" />);
      expect(screen.getByText('₹')).toBeInTheDocument();
    });

    it('renders with suffix text', () => {
      render(<Input suffix="kg" placeholder="Enter weight" />);
      expect(screen.getByText('kg')).toBeInTheDocument();
    });

    it('renders with both prefix and suffix', () => {
      render(<Input prefix="$" suffix="USD" placeholder="Enter amount" />);
      expect(screen.getByText('$')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('renders disabled input', () => {
      render(<Input disabled placeholder="Disabled input" />);
      const input = screen.getByPlaceholderText('Disabled input');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:bg-neutral-100');
      expect(input).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('Touch Target Accessibility', () => {
    it('has minimum 44px height for touch targets', () => {
      render(<Input placeholder="Touch target test" />);
      const input = screen.getByPlaceholderText('Touch target test');
      expect(input).toHaveClass('min-h-[44px]');
    });
  });

  describe('Focus States', () => {
    it('has focus ring classes', () => {
      render(<Input placeholder="Focus test" />);
      const input = screen.getByPlaceholderText('Focus test');
      expect(input).toHaveClass('focus:outline-none');
      expect(input).toHaveClass('focus:ring-2');
      expect(input).toHaveClass('focus:ring-offset-0');
    });
  });

  describe('Custom className', () => {
    it('merges custom className with default classes', () => {
      render(<Input className="custom-class" placeholder="Custom class test" />);
      const input = screen.getByPlaceholderText('Custom class test');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('w-full'); // Default class should still be present
    });
  });
});
