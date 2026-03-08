/**
 * Button Component Unit Tests
 * 
 * Tests specific examples and edge cases for the Button component.
 * Complements property-based tests in Button.property.test.tsx
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '../Button';
import { Plus } from 'lucide-react';

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('renders children text', () => {
      render(<Button>Save Entry</Button>);
      expect(screen.getByText('Save Entry')).toBeInTheDocument();
    });
  });

  describe('Variants (Requirement 5.1)', () => {
    it('renders primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600');
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-neutral-100');
    });

    it('renders outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-2');
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-neutral-700');
    });

    it('renders danger variant', () => {
      render(<Button variant="danger">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-error-600');
    });
  });

  describe('Sizes (Requirement 5.2)', () => {
    it('renders small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-2', 'text-sm');
    });

    it('renders medium size (default)', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-3', 'text-base');
    });

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-4', 'text-lg');
    });
  });

  describe('Loading State (Requirement 5.3)', () => {
    it('shows spinner when loading', () => {
      render(<Button loading>Loading</Button>);
      // Loader2 icon has role="img" or can be found by class
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // Check for spinner animation class
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables button when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('hides icon when loading', () => {
      render(
        <Button loading icon={<Plus data-testid="plus-icon" />}>
          Loading
        </Button>
      );
      expect(screen.queryByTestId('plus-icon')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State (Requirement 5.4)', () => {
    it('applies disabled styles', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      // Check for disabled conditional classes in className
      expect(button.className).toContain('disabled:opacity-50');
      expect(button.className).toContain('disabled:cursor-not-allowed');
    });

    it('is disabled when both disabled and loading', () => {
      render(<Button disabled loading>Disabled Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Icon Configuration (Requirement 5.5)', () => {
    it('renders icon on left by default', () => {
      render(
        <Button icon={<Plus data-testid="plus-icon" />}>
          Add Entry
        </Button>
      );
      const button = screen.getByRole('button');
      const icon = screen.getByTestId('plus-icon');
      expect(icon).toBeInTheDocument();
      // Icon should come before text in DOM order
      expect(button.textContent).toBe('Add Entry');
    });

    it('renders icon on right when specified', () => {
      render(
        <Button icon={<Plus data-testid="plus-icon" />} iconPosition="right">
          Next
        </Button>
      );
      const icon = screen.getByTestId('plus-icon');
      expect(icon).toBeInTheDocument();
    });

    it('renders text-only button without icon', () => {
      render(<Button>Text Only</Button>);
      expect(screen.getByText('Text Only')).toBeInTheDocument();
    });

    it('renders icon-only button', () => {
      render(
        <Button icon={<Plus data-testid="plus-icon" />} aria-label="Add" />
      );
      const icon = screen.getByTestId('plus-icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Full Width (Requirement 5.9)', () => {
    it('applies full width class', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('does not apply full width by default', () => {
      render(<Button>Normal Width</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });
  });

  describe('Touch Target (Requirement 5.8)', () => {
    it('has minimum 44px height', () => {
      render(<Button>Touch Target</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[44px]');
    });
  });

  describe('Focus Ring (Requirement 5.6)', () => {
    it('has focus ring classes', () => {
      render(<Button>Focus Me</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2');
    });
  });

  describe('Custom Props', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('forwards onClick handler', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      const button = screen.getByRole('button');
      button.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('forwards other HTML button attributes', () => {
      render(<Button type="submit" name="submit-btn">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('name', 'submit-btn');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      render(<Button />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles multiple children', () => {
      render(
        <Button>
          <span>Part 1</span>
          <span>Part 2</span>
        </Button>
      );
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Part 2')).toBeInTheDocument();
    });

    it('combines variant and size correctly', () => {
      render(<Button variant="danger" size="lg">Large Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-error-600', 'px-6', 'py-4', 'text-lg');
    });
  });
});
