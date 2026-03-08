/**
 * Property-based tests for Skeleton Component
 * Feature: ui-ux-redesign
 * 
 * These tests validate universal correctness properties for the Skeleton component
 * across all possible prop combinations using fast-check.
 * 
 * Properties tested:
 * - Property 23: Loading Component Animation (Requirement 9.5)
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { Skeleton } from '../Skeleton';

// Arbitraries for Skeleton props
const skeletonVariantArb = fc.constantFrom<'text' | 'circular' | 'rectangular'>(
  'text',
  'circular',
  'rectangular'
);

const widthStringArb = fc.oneof(
  fc.constantFrom('100%', '50%', '75%', '25%', '200px', '100px', '50px'),
  fc.integer({ min: 50, max: 500 }).map(n => `${n}px`)
);

const widthNumberArb = fc.integer({ min: 50, max: 500 });

const heightStringArb = fc.oneof(
  fc.constantFrom('100%', '50%', '75%', '25%', '200px', '100px', '50px'),
  fc.integer({ min: 20, max: 300 }).map(n => `${n}px`)
);

const heightNumberArb = fc.integer({ min: 20, max: 300 });

describe('Property 23: Loading Component Animation - Skeleton', () => {
  /**
   * **Validates: Requirements 9.5**
   * 
   * For any Skeleton component, the component SHALL have animate-pulse class
   * to indicate loading activity.
   */
  it('should always have animate-pulse class for any variant', () => {
    fc.assert(
      fc.property(skeletonVariantArb, (variant) => {
        const { container } = render(<Skeleton variant={variant} />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toBeInTheDocument();
        expect(skeleton).toHaveClass('animate-pulse');
      }),
      { numRuns: 100 }
    );
  });

  it('should have animate-pulse class with any width (string)', () => {
    fc.assert(
      fc.property(skeletonVariantArb, widthStringArb, (variant, width) => {
        const { container } = render(<Skeleton variant={variant} width={width} />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toBeInTheDocument();
        expect(skeleton).toHaveClass('animate-pulse');
      }),
      { numRuns: 100 }
    );
  });

  it('should have animate-pulse class with any width (number)', () => {
    fc.assert(
      fc.property(skeletonVariantArb, widthNumberArb, (variant, width) => {
        const { container } = render(<Skeleton variant={variant} width={width} />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toBeInTheDocument();
        expect(skeleton).toHaveClass('animate-pulse');
      }),
      { numRuns: 100 }
    );
  });

  it('should have animate-pulse class with any height (string)', () => {
    fc.assert(
      fc.property(skeletonVariantArb, heightStringArb, (variant, height) => {
        const { container } = render(<Skeleton variant={variant} height={height} />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toBeInTheDocument();
        expect(skeleton).toHaveClass('animate-pulse');
      }),
      { numRuns: 100 }
    );
  });

  it('should have animate-pulse class with any height (number)', () => {
    fc.assert(
      fc.property(skeletonVariantArb, heightNumberArb, (variant, height) => {
        const { container } = render(<Skeleton variant={variant} height={height} />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toBeInTheDocument();
        expect(skeleton).toHaveClass('animate-pulse');
      }),
      { numRuns: 100 }
    );
  });

  it('should have animate-pulse class with any combination of props', () => {
    fc.assert(
      fc.property(
        skeletonVariantArb,
        fc.oneof(widthStringArb, widthNumberArb),
        fc.oneof(heightStringArb, heightNumberArb),
        (variant, width, height) => {
          const { container } = render(
            <Skeleton variant={variant} width={width} height={height} />
          );
          const skeleton = container.firstChild as HTMLElement;
          
          expect(skeleton).toBeInTheDocument();
          expect(skeleton).toHaveClass('animate-pulse');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have animate-pulse class with custom className', () => {
    fc.assert(
      fc.property(
        skeletonVariantArb,
        fc.string({ minLength: 1, maxLength: 30 }).filter(
          (str) => !str.includes(' ') && /^[a-z-]+$/.test(str)
        ),
        (variant, className) => {
          const { container } = render(
            <Skeleton variant={variant} className={className} />
          );
          const skeleton = container.firstChild as HTMLElement;
          
          expect(skeleton).toBeInTheDocument();
          expect(skeleton).toHaveClass('animate-pulse');
          expect(skeleton).toHaveClass(className);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have bg-neutral-200 background color for any variant', () => {
    fc.assert(
      fc.property(skeletonVariantArb, (variant) => {
        const { container } = render(<Skeleton variant={variant} />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toBeInTheDocument();
        expect(skeleton).toHaveClass('bg-neutral-200');
      }),
      { numRuns: 100 }
    );
  });

  it('should apply correct variant-specific shape classes', () => {
    fc.assert(
      fc.property(skeletonVariantArb, (variant) => {
        const { container } = render(<Skeleton variant={variant} />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toBeInTheDocument();
        
        // Verify variant-specific shape classes
        const variantClasses: Record<'text' | 'circular' | 'rectangular', string[]> = {
          text: ['h-4', 'rounded'],
          circular: ['rounded-full'],
          rectangular: ['rounded-lg'],
        };
        
        const expectedClasses = variantClasses[variant];
        expectedClasses.forEach(cls => {
          expect(skeleton).toHaveClass(cls);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain animation consistency across all variants', () => {
    fc.assert(
      fc.property(skeletonVariantArb, (variant) => {
        const { container } = render(<Skeleton variant={variant} />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toBeInTheDocument();
        
        // All variants should have the same animation class
        expect(skeleton).toHaveClass('animate-pulse');
        
        // Animation should be consistent regardless of variant
        const computedStyle = window.getComputedStyle(skeleton);
        expect(skeleton.className).toContain('animate-pulse');
      }),
      { numRuns: 100 }
    );
  });

  it('should apply width and height styles correctly', () => {
    fc.assert(
      fc.property(
        skeletonVariantArb,
        widthNumberArb,
        heightNumberArb,
        (variant, width, height) => {
          const { container } = render(
            <Skeleton variant={variant} width={width} height={height} />
          );
          const skeleton = container.firstChild as HTMLElement;
          
          expect(skeleton).toBeInTheDocument();
          expect(skeleton).toHaveClass('animate-pulse');
          
          // Verify inline styles are applied
          expect(skeleton.style.width).toBe(`${width}px`);
          expect(skeleton.style.height).toBe(`${height}px`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply string width and height styles correctly', () => {
    fc.assert(
      fc.property(
        skeletonVariantArb,
        widthStringArb,
        heightStringArb,
        (variant, width, height) => {
          const { container } = render(
            <Skeleton variant={variant} width={width} height={height} />
          );
          const skeleton = container.firstChild as HTMLElement;
          
          expect(skeleton).toBeInTheDocument();
          expect(skeleton).toHaveClass('animate-pulse');
          
          // Verify inline styles are applied
          expect(skeleton.style.width).toBe(width);
          expect(skeleton.style.height).toBe(height);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should pass through HTML attributes while maintaining animation', () => {
    fc.assert(
      fc.property(
        skeletonVariantArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (variant, dataTestId, ariaLabel) => {
          const { container } = render(
            <Skeleton
              variant={variant}
              data-testid={dataTestId}
              aria-label={ariaLabel}
            />
          );
          const skeleton = container.firstChild as HTMLElement;
          
          expect(skeleton).toBeInTheDocument();
          expect(skeleton).toHaveClass('animate-pulse');
          expect(skeleton).toHaveAttribute('data-testid', dataTestId);
          expect(skeleton).toHaveAttribute('aria-label', ariaLabel);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Skeleton Animation Consistency', () => {
  /**
   * Tests that animation is consistent across different rendering scenarios.
   */
  it('should maintain animation when re-rendered with different props', () => {
    fc.assert(
      fc.property(
        skeletonVariantArb,
        skeletonVariantArb,
        (variant1, variant2) => {
          const { container, rerender } = render(<Skeleton variant={variant1} />);
          let skeleton = container.firstChild as HTMLElement;
          
          expect(skeleton).toHaveClass('animate-pulse');
          
          // Re-render with different variant
          rerender(<Skeleton variant={variant2} />);
          skeleton = container.firstChild as HTMLElement;
          
          // Animation should still be present
          expect(skeleton).toHaveClass('animate-pulse');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have animation for default props', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('bg-neutral-200');
    expect(skeleton).toHaveClass('rounded-lg'); // Default variant is rectangular
  });
});
