/**
 * Badge Component Unit Tests
 * 
 * Tests specific examples and edge cases for the Badge component.
 * Complements property-based tests for comprehensive coverage.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge } from '../Badge';

describe('Badge Component', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<Badge>3</Badge>);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders text content', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders count content', () => {
      render(<Badge>9+</Badge>);
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  describe('Variants (Requirement 8.5, 18.5)', () => {
    it('renders default variant', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-neutral-100', 'text-neutral-700');
    });

    it('renders success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-success-100', 'text-success-700');
    });

    it('renders warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-warning-100', 'text-warning-700');
    });

    it('renders error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-error-100', 'text-error-700');
    });

    it('renders info variant', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-info-100', 'text-info-700');
    });
  });

  describe('Styling', () => {
    it('has compact design with correct padding', () => {
      render(<Badge>Compact</Badge>);
      const badge = screen.getByText('Compact');
      expect(badge).toHaveClass('px-2', 'py-0.5');
    });

    it('has small text size', () => {
      render(<Badge>Small Text</Badge>);
      const badge = screen.getByText('Small Text');
      expect(badge).toHaveClass('text-xs');
    });

    it('has medium font weight', () => {
      render(<Badge>Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('font-medium');
    });

    it('has rounded-full shape', () => {
      render(<Badge>Rounded</Badge>);
      const badge = screen.getByText('Rounded');
      expect(badge).toHaveClass('rounded-full');
    });

    it('uses inline-flex display', () => {
      render(<Badge>Inline</Badge>);
      const badge = screen.getByText('Inline');
      expect(badge).toHaveClass('inline-flex', 'items-center');
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
      expect(badge).toHaveClass('inline-flex'); // Default class should still be present
    });

    it('forwards HTML span attributes', () => {
      render(<Badge data-testid="test-badge" title="Test Badge">Test</Badge>);
      const badge = screen.getByTestId('test-badge');
      expect(badge).toHaveAttribute('title', 'Test Badge');
    });

    it('forwards onClick handler', () => {
      const handleClick = jest.fn();
      render(<Badge onClick={handleClick}>Clickable</Badge>);
      const badge = screen.getByText('Clickable');
      badge.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Use Cases', () => {
    it('renders count badge for navigation (Requirement 8.5)', () => {
      render(<Badge variant="warning">5</Badge>);
      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-warning-100', 'text-warning-700');
    });

    it('renders 9+ for counts greater than 9', () => {
      render(<Badge variant="warning">9+</Badge>);
      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('renders status label badge', () => {
      render(<Badge variant="error">Overdue</Badge>);
      const badge = screen.getByText('Overdue');
      expect(badge).toHaveClass('bg-error-100', 'text-error-700');
    });

    it('renders success indicator', () => {
      render(<Badge variant="success">Paid</Badge>);
      const badge = screen.getByText('Paid');
      expect(badge).toHaveClass('bg-success-100', 'text-success-700');
    });

    it('renders info badge', () => {
      render(<Badge variant="info">New</Badge>);
      const badge = screen.getByText('New');
      expect(badge).toHaveClass('bg-info-100', 'text-info-700');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      const { container } = render(<Badge />);
      const badge = container.querySelector('span');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('inline-flex');
    });

    it('handles numeric children', () => {
      render(<Badge>{123}</Badge>);
      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('handles zero as children', () => {
      render(<Badge>{0}</Badge>);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles multiple children', () => {
      render(
        <Badge>
          <span>Part 1</span>
          <span>Part 2</span>
        </Badge>
      );
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Part 2')).toBeInTheDocument();
    });

    it('handles long text content', () => {
      render(<Badge>Very Long Badge Text</Badge>);
      expect(screen.getByText('Very Long Badge Text')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('renders as a span element', () => {
      const { container } = render(<Badge>Accessible</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toBeInTheDocument();
    });

    it('supports aria-label', () => {
      render(<Badge aria-label="3 pending items">3</Badge>);
      const badge = screen.getByLabelText('3 pending items');
      expect(badge).toBeInTheDocument();
    });

    it('supports role attribute', () => {
      render(<Badge role="status">Status</Badge>);
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Semantic Color Usage', () => {
    it('uses neutral colors for default variant', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-neutral-100', 'text-neutral-700');
    });

    it('uses green colors for success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-success-100', 'text-success-700');
    });

    it('uses orange/yellow colors for warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-warning-100', 'text-warning-700');
    });

    it('uses red colors for error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-error-100', 'text-error-700');
    });

    it('uses blue colors for info variant', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-info-100', 'text-info-700');
    });
  });
});
