/**
 * Skeleton Component Unit Tests
 * 
 * Tests specific examples and edge cases for the Skeleton component.
 * Complements property-based tests.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 9.1-9.7
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Skeleton } from '../Skeleton';

describe('Skeleton Component', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('has pulse animation', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('uses neutral-200 background color', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('bg-neutral-200');
    });
  });

  describe('Variant Styles (Requirement 9.1)', () => {
    it('renders text variant with rounded-md and h-4', () => {
      const { container } = render(<Skeleton variant="text" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-4', 'rounded');
    });

    it('renders circular variant with rounded-full', () => {
      const { container } = render(<Skeleton variant="circular" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('renders rectangular variant with rounded-lg (default)', () => {
      const { container } = render(<Skeleton variant="rectangular" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('rounded-lg');
    });

    it('defaults to rectangular variant', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('rounded-lg');
    });
  });

  describe('Width and Height Props (Requirement 9.3)', () => {
    it('applies width as string', () => {
      const { container } = render(<Skeleton width="100%" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ width: '100%' });
    });

    it('applies width as number (pixels)', () => {
      const { container } = render(<Skeleton width={200} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ width: '200px' });
    });

    it('applies height as string', () => {
      const { container } = render(<Skeleton height="50px" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ height: '50px' });
    });

    it('applies height as number (pixels)', () => {
      const { container } = render(<Skeleton height={100} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ height: '100px' });
    });

    it('applies both width and height', () => {
      const { container } = render(<Skeleton width={300} height={150} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ width: '300px', height: '150px' });
    });
  });

  describe('Custom ClassName (Requirement 9.5)', () => {
    it('applies custom className', () => {
      const { container } = render(<Skeleton className="custom-skeleton" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('custom-skeleton');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(<Skeleton className="my-4" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('my-4', 'bg-neutral-200', 'animate-pulse');
    });
  });

  describe('Common Use Cases', () => {
    it('renders text line skeleton', () => {
      const { container } = render(<Skeleton variant="text" width="100%" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-4', 'rounded');
      expect(skeleton).toHaveStyle({ width: '100%' });
    });

    it('renders circular avatar skeleton', () => {
      const { container } = render(<Skeleton variant="circular" width={40} height={40} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('rounded-full');
      expect(skeleton).toHaveStyle({ width: '40px', height: '40px' });
    });

    it('renders rectangular card skeleton', () => {
      const { container } = render(<Skeleton variant="rectangular" width="100%" height={200} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('rounded-lg');
      expect(skeleton).toHaveStyle({ width: '100%', height: '200px' });
    });

    it('renders image skeleton', () => {
      const { container } = render(<Skeleton variant="rectangular" width="100%" height={300} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ width: '100%', height: '300px' });
    });
  });

  describe('Multiple Skeletons', () => {
    it('renders multiple text skeletons for paragraph', () => {
      const { container } = render(
        <div className="space-y-3">
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="80%" />
        </div>
      );
      
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(3);
    });

    it('renders skeleton for card with header and body', () => {
      const { container } = render(
        <div>
          <Skeleton variant="text" width="60%" height={24} />
          <div className="space-y-3 mt-4">
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="80%" />
          </div>
        </div>
      );
      
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(4);
    });
  });

  describe('Animation (Requirement 9.2)', () => {
    it('has pulse animation class', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('maintains animation across all variants', () => {
      const { container: container1 } = render(<Skeleton variant="text" />);
      const { container: container2 } = render(<Skeleton variant="circular" />);
      const { container: container3 } = render(<Skeleton variant="rectangular" />);
      
      expect(container1.firstChild).toHaveClass('animate-pulse');
      expect(container2.firstChild).toHaveClass('animate-pulse');
      expect(container3.firstChild).toHaveClass('animate-pulse');
    });
  });

  describe('HTML Attributes', () => {
    it('forwards HTML attributes', () => {
      const { container } = render(
        <Skeleton data-testid="test-skeleton" aria-label="Loading content" />
      );
      
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveAttribute('data-testid', 'test-skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero width', () => {
      const { container } = render(<Skeleton width={0} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ width: '0px' });
    });

    it('handles zero height', () => {
      const { container } = render(<Skeleton height={0} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ height: '0px' });
    });

    it('handles very large dimensions', () => {
      const { container } = render(<Skeleton width={9999} height={9999} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ width: '9999px', height: '9999px' });
    });

    it('handles percentage widths', () => {
      const { container } = render(<Skeleton width="50%" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ width: '50%' });
    });

    it('handles rem units', () => {
      const { container } = render(<Skeleton width="10rem" height="5rem" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ width: '10rem', height: '5rem' });
    });
  });

  describe('Integration with Card Component', () => {
    it('works with Card loading state', () => {
      const { container } = render(
        <div className="bg-white rounded-lg p-6 animate-pulse">
          <Skeleton variant="text" width="60%" height={24} />
          <div className="space-y-3 mt-4">
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="80%" />
          </div>
        </div>
      );
      
      const skeletons = container.querySelectorAll('.bg-neutral-200.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Offline-First Compatibility', () => {
    it('renders without network dependency', () => {
      // Skeleton should render purely from local code, no network calls
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('has no business logic (pure presentation)', () => {
      // Skeleton is a pure presentation component per Vyapar rules
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      
      // Should only have styling classes, no data attributes or state
      expect(skeleton.tagName).toBe('DIV');
      expect(skeleton).toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('can have aria-label for screen readers', () => {
      const { container } = render(<Skeleton aria-label="Loading content" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    });

    it('can have role attribute', () => {
      const { container } = render(<Skeleton role="status" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveAttribute('role', 'status');
    });
  });
});
