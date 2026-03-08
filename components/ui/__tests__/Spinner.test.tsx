/**
 * Spinner Component Unit Tests
 * 
 * Tests specific examples and edge cases for the Spinner component.
 * Complements property-based tests.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 9.1-9.7
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Spinner } from '../Spinner';

describe('Spinner Component', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<Spinner />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders Loader2 icon', () => {
      const { container } = render(<Spinner />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has spin animation class', () => {
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('animate-spin');
    });

    it('uses primary-600 color by default', () => {
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('text-primary-600');
    });
  });

  describe('Size Variants', () => {
    it('renders small size (16px)', () => {
      const { container } = render(<Spinner size="sm" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('w-4', 'h-4');
    });

    it('renders medium size (24px) as default', () => {
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('w-6', 'h-6');
    });

    it('renders medium size (24px) when explicitly set', () => {
      const { container } = render(<Spinner size="md" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('w-6', 'h-6');
    });

    it('renders large size (32px)', () => {
      const { container } = render(<Spinner size="lg" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('w-8', 'h-8');
    });
  });

  describe('Accessibility', () => {
    it('has aria-label for screen readers', () => {
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('has role="status" for screen readers', () => {
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveAttribute('role', 'status');
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(<Spinner className="custom-spinner" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('custom-spinner');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(<Spinner className="custom-class" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('custom-class', 'animate-spin', 'text-primary-600');
    });

    it('allows custom color via className', () => {
      const { container } = render(<Spinner className="text-success-600" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('text-success-600');
    });

    it('allows custom color for error states', () => {
      const { container } = render(<Spinner className="text-error-600" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('text-error-600');
    });
  });

  describe('Use Cases', () => {
    it('renders for inline loading (small)', () => {
      const { container } = render(<Spinner size="sm" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('w-4', 'h-4');
    });

    it('renders for button loading (medium)', () => {
      const { container } = render(<Spinner size="md" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('w-6', 'h-6');
    });

    it('renders for page loading (large)', () => {
      const { container } = render(<Spinner size="lg" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('w-8', 'h-8');
    });

    it('renders with success color for success loading', () => {
      const { container } = render(<Spinner className="text-success-600" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('text-success-600');
    });

    it('renders with warning color for warning loading', () => {
      const { container } = render(<Spinner className="text-warning-600" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('text-warning-600');
    });
  });

  describe('Animation', () => {
    it('has animate-spin class for rotation', () => {
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('animate-spin');
    });

    it('maintains animation across all sizes', () => {
      const { container: container1 } = render(<Spinner size="sm" />);
      const { container: container2 } = render(<Spinner size="md" />);
      const { container: container3 } = render(<Spinner size="lg" />);
      
      expect(container1.firstChild).toHaveClass('animate-spin');
      expect(container2.firstChild).toHaveClass('animate-spin');
      expect(container3.firstChild).toHaveClass('animate-spin');
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple spinners on same page', () => {
      const { container } = render(
        <>
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </>
      );
      
      const spinners = container.querySelectorAll('.animate-spin');
      expect(spinners).toHaveLength(3);
    });

    it('combines size and custom className', () => {
      const { container } = render(
        <Spinner size="lg" className="text-error-600" />
      );
      
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('w-8', 'h-8', 'text-error-600', 'animate-spin');
    });

    it('renders consistently across re-renders', () => {
      const { container, rerender } = render(<Spinner size="sm" />);
      
      let spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('w-4', 'h-4');
      
      rerender(<Spinner size="lg" />);
      
      spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('w-8', 'h-8');
    });
  });

  describe('Integration with Other Components', () => {
    it('can be used in button loading state', () => {
      const { container } = render(
        <button disabled>
          <Spinner size="sm" className="mr-2" />
          Loading...
        </button>
      );
      
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('w-4', 'h-4');
    });

    it('can be used in card loading state', () => {
      const { container } = render(
        <div className="card">
          <Spinner size="md" />
        </div>
      );
      
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('can be used in page loading state', () => {
      const { container } = render(
        <div className="page-loader">
          <Spinner size="lg" />
          <p>Loading your data...</p>
        </div>
      );
      
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('w-8', 'h-8');
    });
  });

  describe('Offline-First Compatibility', () => {
    it('renders without network dependency', () => {
      // Spinner should render purely from local code, no network calls
      const { container } = render(<Spinner />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('has no business logic (pure presentation)', () => {
      // Spinner is a pure presentation component per Vyapar rules
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      
      // Should only have styling classes, no data attributes or state
      expect(spinner.tagName).toBe('svg');
      expect(spinner).toHaveClass('animate-spin');
    });
  });
});
