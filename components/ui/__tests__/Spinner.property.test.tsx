/**
 * Property-based tests for Spinner Component
 * Feature: ui-ux-redesign
 * 
 * These tests validate universal correctness properties for the Spinner component
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
import { Spinner, SpinnerSize } from '../Spinner';

// Arbitraries for Spinner props
const spinnerSizeArb = fc.constantFrom<SpinnerSize>('sm', 'md', 'lg');

describe('Property 23: Loading Component Animation - Spinner', () => {
  /**
   * **Validates: Requirements 9.5**
   * 
   * For any Spinner component, the component SHALL have animate-spin class
   * to indicate loading activity.
   */
  it('should always have animate-spin class for any size', () => {
    fc.assert(
      fc.property(spinnerSizeArb, (size) => {
        const { container } = render(<Spinner size={size} />);
        const spinner = container.querySelector('.animate-spin');
        
        expect(spinner).toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });

  it('should have animate-spin class with default props', () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector('.animate-spin');
    
    expect(spinner).toBeInTheDocument();
  });

  it('should have animate-spin class with custom className', () => {
    fc.assert(
      fc.property(
        spinnerSizeArb,
        fc.string({ minLength: 1, maxLength: 30 }).filter(
          (str) => !str.includes(' ') && /^[a-z-]+$/.test(str)
        ),
        (size, className) => {
          const { container } = render(<Spinner size={size} className={className} />);
          const spinner = container.querySelector('.animate-spin');
          
          expect(spinner).toBeInTheDocument();
          expect(spinner).toHaveClass('animate-spin');
          expect(spinner).toHaveClass(className);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have text-primary-600 color by default for any size', () => {
    fc.assert(
      fc.property(spinnerSizeArb, (size) => {
        const { container } = render(<Spinner size={size} />);
        const spinner = container.querySelector('.animate-spin');
        
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass('text-primary-600');
      }),
      { numRuns: 100 }
    );
  });

  it('should apply correct size classes for any size', () => {
    fc.assert(
      fc.property(spinnerSizeArb, (size) => {
        const { container } = render(<Spinner size={size} />);
        const spinner = container.querySelector('.animate-spin');
        
        expect(spinner).toBeInTheDocument();
        
        // Verify size-specific classes
        const sizeClasses: Record<SpinnerSize, string[]> = {
          sm: ['w-4', 'h-4'],
          md: ['w-6', 'h-6'],
          lg: ['w-8', 'h-8'],
        };
        
        const expectedClasses = sizeClasses[size];
        expectedClasses.forEach(cls => {
          expect(spinner).toHaveClass(cls);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain animation consistency across all sizes', () => {
    fc.assert(
      fc.property(spinnerSizeArb, (size) => {
        const { container } = render(<Spinner size={size} />);
        const spinner = container.querySelector('.animate-spin');
        
        expect(spinner).toBeInTheDocument();
        
        // All sizes should have the same animation class
        expect(spinner).toHaveClass('animate-spin');
        
        // Animation should be consistent regardless of size
        // Verify the class is present in the classList
        expect(spinner?.classList.contains('animate-spin')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should have aria-label for accessibility', () => {
    fc.assert(
      fc.property(spinnerSizeArb, (size) => {
        const { container } = render(<Spinner size={size} />);
        const spinner = container.querySelector('[aria-label="Loading"]');
        
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveAttribute('aria-label', 'Loading');
      }),
      { numRuns: 100 }
    );
  });

  it('should have role="status" for accessibility', () => {
    fc.assert(
      fc.property(spinnerSizeArb, (size) => {
        const { container } = render(<Spinner size={size} />);
        const spinner = container.querySelector('[role="status"]');
        
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveAttribute('role', 'status');
      }),
      { numRuns: 100 }
    );
  });

  it('should allow custom color via className', () => {
    fc.assert(
      fc.property(
        spinnerSizeArb,
        fc.constantFrom(
          'text-success-600',
          'text-error-600',
          'text-warning-600',
          'text-neutral-600'
        ),
        (size, colorClass) => {
          const { container } = render(<Spinner size={size} className={colorClass} />);
          const spinner = container.querySelector('.animate-spin');
          
          expect(spinner).toBeInTheDocument();
          expect(spinner).toHaveClass('animate-spin');
          expect(spinner).toHaveClass(colorClass);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render Loader2 icon component', () => {
    fc.assert(
      fc.property(spinnerSizeArb, (size) => {
        const { container } = render(<Spinner size={size} />);
        const spinner = container.querySelector('.animate-spin');
        
        expect(spinner).toBeInTheDocument();
        
        // Loader2 from lucide-react renders as an SVG
        expect(spinner?.tagName).toBe('svg');
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain animation when re-rendered with different sizes', () => {
    fc.assert(
      fc.property(
        spinnerSizeArb,
        spinnerSizeArb,
        (size1, size2) => {
          const { container, rerender } = render(<Spinner size={size1} />);
          let spinner = container.querySelector('.animate-spin');
          
          expect(spinner).toBeInTheDocument();
          expect(spinner).toHaveClass('animate-spin');
          
          // Re-render with different size
          rerender(<Spinner size={size2} />);
          spinner = container.querySelector('.animate-spin');
          
          // Animation should still be present
          expect(spinner).toBeInTheDocument();
          expect(spinner).toHaveClass('animate-spin');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should combine all required classes for any size', () => {
    fc.assert(
      fc.property(spinnerSizeArb, (size) => {
        const { container } = render(<Spinner size={size} />);
        const spinner = container.querySelector('.animate-spin');
        
        expect(spinner).toBeInTheDocument();
        
        // Should have all required classes
        expect(spinner).toHaveClass('animate-spin');
        expect(spinner).toHaveClass('text-primary-600');
        
        // Should have size-specific classes
        const sizeClasses: Record<SpinnerSize, string[]> = {
          sm: ['w-4', 'h-4'],
          md: ['w-6', 'h-6'],
          lg: ['w-8', 'h-8'],
        };
        
        sizeClasses[size].forEach(cls => {
          expect(spinner).toHaveClass(cls);
        });
      }),
      { numRuns: 100 }
    );
  });
});

describe('Spinner Animation Consistency', () => {
  /**
   * Tests that animation is consistent across different rendering scenarios.
   */
  it('should have animation for default props', () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector('.animate-spin');
    
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
    expect(spinner).toHaveClass('text-primary-600');
    expect(spinner).toHaveClass('w-6'); // Default size is md
    expect(spinner).toHaveClass('h-6');
  });

  it('should maintain animation with multiple prop changes', () => {
    fc.assert(
      fc.property(
        spinnerSizeArb,
        spinnerSizeArb,
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (str) => !str.includes(' ') && /^[a-z-]+$/.test(str)
        ),
        (size1, size2, className) => {
          const { container, rerender } = render(<Spinner size={size1} />);
          let spinner = container.querySelector('.animate-spin');
          
          expect(spinner).toHaveClass('animate-spin');
          
          // Re-render with different size and className
          rerender(<Spinner size={size2} className={className} />);
          spinner = container.querySelector('.animate-spin');
          
          // Animation should still be present
          expect(spinner).toHaveClass('animate-spin');
          expect(spinner).toHaveClass(className);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be usable in different contexts (inline, block, flex)', () => {
    fc.assert(
      fc.property(spinnerSizeArb, (size) => {
        // Test inline context
        const { container: inlineContainer } = render(
          <span>
            <Spinner size={size} />
          </span>
        );
        const inlineSpinner = inlineContainer.querySelector('.animate-spin');
        expect(inlineSpinner).toHaveClass('animate-spin');
        
        // Test block context
        const { container: blockContainer } = render(
          <div>
            <Spinner size={size} />
          </div>
        );
        const blockSpinner = blockContainer.querySelector('.animate-spin');
        expect(blockSpinner).toHaveClass('animate-spin');
        
        // Test flex context
        const { container: flexContainer } = render(
          <div className="flex items-center">
            <Spinner size={size} />
          </div>
        );
        const flexSpinner = flexContainer.querySelector('.animate-spin');
        expect(flexSpinner).toHaveClass('animate-spin');
      }),
      { numRuns: 50 }
    );
  });
});

describe('Spinner Integration with Button (Loading State)', () => {
  /**
   * Tests that Spinner works correctly when used in Button loading state.
   * This validates the integration pattern used in the Button component.
   */
  it('should maintain animation when used in button context', () => {
    fc.assert(
      fc.property(spinnerSizeArb, (size) => {
        const { container } = render(
          <button disabled>
            <Spinner size={size} />
            Loading...
          </button>
        );
        const spinner = container.querySelector('.animate-spin');
        
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass('animate-spin');
      }),
      { numRuns: 100 }
    );
  });

  it('should work with different button states', () => {
    fc.assert(
      fc.property(
        spinnerSizeArb,
        fc.boolean(),
        (size, disabled) => {
          const { container } = render(
            <button disabled={disabled}>
              <Spinner size={size} />
              Loading...
            </button>
          );
          const spinner = container.querySelector('.animate-spin');
          
          expect(spinner).toBeInTheDocument();
          expect(spinner).toHaveClass('animate-spin');
        }
      ),
      { numRuns: 100 }
    );
  });
});
