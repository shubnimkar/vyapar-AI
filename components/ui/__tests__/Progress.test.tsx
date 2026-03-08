/**
 * Progress Component Unit Tests
 * 
 * Tests specific examples and edge cases for the Progress component.
 * Complements property-based tests for comprehensive coverage.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Progress } from '../Progress';

describe('Progress Component', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      const { container } = render(<Progress value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('renders progress bar with correct value', () => {
      const { container } = render(<Progress value={75} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('renders with aria attributes', () => {
      const { container } = render(<Progress value={60} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Value Clamping', () => {
    it('clamps value to 0 when negative', () => {
      const { container } = render(<Progress value={-10} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      const fill = container.querySelector('.transition-all');
      expect(fill).toHaveStyle({ width: '0%' });
    });

    it('clamps value to 100 when over 100', () => {
      const { container } = render(<Progress value={150} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      const fill = container.querySelector('.transition-all');
      expect(fill).toHaveStyle({ width: '100%' });
    });

    it('accepts value of 0', () => {
      const { container } = render(<Progress value={0} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      const fill = container.querySelector('.transition-all');
      expect(fill).toHaveStyle({ width: '0%' });
    });

    it('accepts value of 100', () => {
      const { container } = render(<Progress value={100} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      const fill = container.querySelector('.transition-all');
      expect(fill).toHaveStyle({ width: '100%' });
    });

    it('accepts decimal values', () => {
      const { container } = render(<Progress value={45.7} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '45.7');
      const fill = container.querySelector('.transition-all');
      expect(fill).toHaveStyle({ width: '45.7%' });
    });
  });

  describe('Variants (Requirement 18.5)', () => {
    it('renders default variant', () => {
      const { container } = render(<Progress value={50} variant="default" />);
      const fill = container.querySelector('.bg-primary-600');
      expect(fill).toBeInTheDocument();
    });

    it('renders success variant', () => {
      const { container } = render(<Progress value={50} variant="success" />);
      const fill = container.querySelector('.bg-success-600');
      expect(fill).toBeInTheDocument();
    });

    it('renders warning variant', () => {
      const { container } = render(<Progress value={50} variant="warning" />);
      const fill = container.querySelector('.bg-warning-600');
      expect(fill).toBeInTheDocument();
    });

    it('renders error variant', () => {
      const { container } = render(<Progress value={50} variant="error" />);
      const fill = container.querySelector('.bg-error-600');
      expect(fill).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<Progress value={50} size="sm" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('h-1');
    });

    it('renders medium size (default)', () => {
      const { container } = render(<Progress value={50} size="md" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('h-2');
    });

    it('renders large size', () => {
      const { container } = render(<Progress value={50} size="lg" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('h-3');
    });
  });

  describe('Label Display (Requirement 18.5)', () => {
    it('does not show label by default', () => {
      render(<Progress value={75} />);
      expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });

    it('shows label when showLabel is true', () => {
      render(<Progress value={75} showLabel />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('shows label with correct percentage', () => {
      render(<Progress value={42} showLabel />);
      expect(screen.getByText('42%')).toBeInTheDocument();
    });

    it('shows label with rounded percentage for decimals', () => {
      render(<Progress value={45.7} showLabel />);
      expect(screen.getByText('46%')).toBeInTheDocument();
    });

    it('shows 0% for clamped negative values', () => {
      render(<Progress value={-10} showLabel />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('shows 100% for clamped over-100 values', () => {
      render(<Progress value={150} showLabel />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('label has correct styling', () => {
      render(<Progress value={75} showLabel />);
      const label = screen.getByText('75%');
      expect(label).toHaveClass('text-sm', 'font-medium', 'text-neutral-700');
    });
  });

  describe('Styling', () => {
    it('has full width container', () => {
      const { container } = render(<Progress value={50} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('w-full');
    });

    it('has neutral background', () => {
      const { container } = render(<Progress value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('bg-neutral-200');
    });

    it('has rounded-full shape', () => {
      const { container } = render(<Progress value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('rounded-full');
    });

    it('has overflow-hidden', () => {
      const { container } = render(<Progress value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('overflow-hidden');
    });

    it('fill has smooth transition', () => {
      const { container } = render(<Progress value={50} />);
      const fill = container.querySelector('.transition-all');
      expect(fill).toHaveClass('transition-all', 'duration-base');
    });
  });

  describe('Custom Props', () => {
    it('applies custom className to container', () => {
      const { container } = render(<Progress value={50} className="custom-class" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
      expect(wrapper).toHaveClass('w-full'); // Default class should still be present
    });
  });

  describe('Use Cases', () => {
    it('renders stress index progress (Requirement 18.5)', () => {
      const { container } = render(<Progress value={65} variant="warning" showLabel />);
      expect(screen.getByText('65%')).toBeInTheDocument();
      const fill = container.querySelector('.bg-warning-600');
      expect(fill).toBeInTheDocument();
    });

    it('renders affordability index progress (Requirement 18.5)', () => {
      const { container } = render(<Progress value={80} variant="success" showLabel />);
      expect(screen.getByText('80%')).toBeInTheDocument();
      const fill = container.querySelector('.bg-success-600');
      expect(fill).toBeInTheDocument();
    });

    it('renders low score with error variant', () => {
      const { container } = render(<Progress value={25} variant="error" showLabel />);
      expect(screen.getByText('25%')).toBeInTheDocument();
      const fill = container.querySelector('.bg-error-600');
      expect(fill).toBeInTheDocument();
    });

    it('renders compact progress without label', () => {
      const { container } = render(<Progress value={50} size="sm" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('h-1');
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has progressbar role', () => {
      const { container } = render(<Progress value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('has aria-valuenow attribute', () => {
      const { container } = render(<Progress value={75} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('has aria-valuemin attribute', () => {
      const { container } = render(<Progress value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    });

    it('has aria-valuemax attribute', () => {
      const { container } = render(<Progress value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has aria-label when label is not shown', () => {
      const { container } = render(<Progress value={75} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-label', '75%');
    });

    it('does not have aria-label when label is shown', () => {
      const { container } = render(<Progress value={75} showLabel />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).not.toHaveAttribute('aria-label');
    });
  });

  describe('Edge Cases', () => {
    it('handles very small values', () => {
      const { container } = render(<Progress value={0.1} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0.1');
      const fill = container.querySelector('.transition-all');
      expect(fill).toHaveStyle({ width: '0.1%' });
    });

    it('handles very large values', () => {
      const { container } = render(<Progress value={999} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      const fill = container.querySelector('.transition-all');
      expect(fill).toHaveStyle({ width: '100%' });
    });

    it('handles NaN gracefully', () => {
      const { container } = render(<Progress value={NaN} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      // NaN comparisons always return false, so it should clamp to 0
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Semantic Color Usage', () => {
    it('uses primary color for default variant', () => {
      const { container } = render(<Progress value={50} variant="default" />);
      const fill = container.querySelector('.bg-primary-600');
      expect(fill).toBeInTheDocument();
    });

    it('uses green color for success variant', () => {
      const { container } = render(<Progress value={50} variant="success" />);
      const fill = container.querySelector('.bg-success-600');
      expect(fill).toBeInTheDocument();
    });

    it('uses orange/yellow color for warning variant', () => {
      const { container } = render(<Progress value={50} variant="warning" />);
      const fill = container.querySelector('.bg-warning-600');
      expect(fill).toBeInTheDocument();
    });

    it('uses red color for error variant', () => {
      const { container } = render(<Progress value={50} variant="error" />);
      const fill = container.querySelector('.bg-error-600');
      expect(fill).toBeInTheDocument();
    });
  });
});
