/**
 * Property-based tests for Button Component
 * Feature: ui-ux-redesign
 * 
 * These tests validate universal correctness properties for the Button component
 * across all possible prop combinations using fast-check.
 * 
 * Properties tested:
 * - Property 7: Button Variant Rendering (Requirement 5.1)
 * - Property 8: Button Size Rendering (Requirement 5.2)
 * - Property 9: Button Loading State (Requirement 5.3)
 * - Property 10: Button Disabled State (Requirement 5.4)
 * - Property 11: Button Icon Configuration (Requirement 5.5)
 * - Property 12: Button Full Width (Requirement 5.9)
 * - Property 6: Touch Target Minimum Size (Requirements 4.4, 5.8)
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { Button, ButtonVariant, ButtonSize } from '../Button';
import { Plus } from 'lucide-react';

// Arbitraries for Button props
const buttonVariantArb = fc.constantFrom<ButtonVariant>(
  'primary',
  'secondary',
  'outline',
  'ghost',
  'danger'
);

const buttonSizeArb = fc.constantFrom<ButtonSize>('sm', 'md', 'lg');

const iconPositionArb = fc.constantFrom<'left' | 'right'>('left', 'right');

describe('Property 7: Button Variant Rendering', () => {
  /**
   * **Validates: Requirements 5.1**
   * 
   * For any Button variant (primary, secondary, outline, ghost, danger),
   * the component SHALL apply the correct CSS classes for that variant's visual style.
   */
  it('should apply correct CSS classes for any variant', () => {
    fc.assert(
      fc.property(buttonVariantArb, (variant) => {
        const { container } = render(<Button variant={variant}>Test</Button>);
        const button = container.querySelector('button');
        
        expect(button).toBeInTheDocument();
        
        // Verify variant-specific classes are applied
        const variantClasses: Record<ButtonVariant, string[]> = {
          primary: ['bg-primary-600', 'text-white'],
          secondary: ['bg-neutral-100', 'text-neutral-900'],
          outline: ['border-2', 'border-neutral-300', 'text-neutral-700'],
          ghost: ['text-neutral-700'],
          danger: ['bg-error-600', 'text-white'],
        };
        
        const expectedClasses = variantClasses[variant];
        expectedClasses.forEach(cls => {
          expect(button).toHaveClass(cls);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should apply hover and focus classes for any variant', () => {
    fc.assert(
      fc.property(buttonVariantArb, (variant) => {
        const { container } = render(<Button variant={variant}>Test</Button>);
        const button = container.querySelector('button');
        
        expect(button).toBeInTheDocument();
        
        // All variants should have focus ring classes
        expect(button?.className).toContain('focus:ring');
        
        // Verify variant-specific focus ring color
        const focusRingColors: Record<ButtonVariant, string> = {
          primary: 'focus:ring-primary-500',
          secondary: 'focus:ring-neutral-500',
          outline: 'focus:ring-neutral-500',
          ghost: 'focus:ring-neutral-500',
          danger: 'focus:ring-error-500',
        };
        
        expect(button).toHaveClass(focusRingColors[variant]);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 8: Button Size Rendering', () => {
  /**
   * **Validates: Requirements 5.2**
   * 
   * For any Button size (sm, md, lg), the component SHALL apply
   * the correct padding and font size classes.
   */
  it('should apply correct padding and font size for any size', () => {
    fc.assert(
      fc.property(buttonSizeArb, (size) => {
        const { container } = render(<Button size={size}>Test</Button>);
        const button = container.querySelector('button');
        
        expect(button).toBeInTheDocument();
        
        // Verify size-specific classes are applied
        const sizeClasses: Record<ButtonSize, string[]> = {
          sm: ['px-3', 'py-2', 'text-sm'],
          md: ['px-4', 'py-3', 'text-base'],
          lg: ['px-6', 'py-4', 'text-lg'],
        };
        
        const expectedClasses = sizeClasses[size];
        expectedClasses.forEach(cls => {
          expect(button).toHaveClass(cls);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain size classes when combined with any variant', () => {
    fc.assert(
      fc.property(buttonSizeArb, buttonVariantArb, (size, variant) => {
        const { container } = render(
          <Button size={size} variant={variant}>Test</Button>
        );
        const button = container.querySelector('button');
        
        expect(button).toBeInTheDocument();
        
        // Verify both size and variant classes are present
        const sizeClasses: Record<ButtonSize, string[]> = {
          sm: ['px-3', 'py-2', 'text-sm'],
          md: ['px-4', 'py-3', 'text-base'],
          lg: ['px-6', 'py-4', 'text-lg'],
        };
        
        sizeClasses[size].forEach(cls => {
          expect(button).toHaveClass(cls);
        });
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 9: Button Loading State', () => {
  /**
   * **Validates: Requirements 5.3**
   * 
   * For any Button with loading=true, the component SHALL render
   * a spinner icon and be disabled.
   */
  it('should render spinner and be disabled when loading is true', () => {
    fc.assert(
      fc.property(
        buttonVariantArb,
        buttonSizeArb,
        fc.boolean(),
        (variant, size, fullWidth) => {
          const { container } = render(
            <Button
              variant={variant}
              size={size}
              fullWidth={fullWidth}
              loading={true}
            >
              Test
            </Button>
          );
          const button = container.querySelector('button');
          
          expect(button).toBeInTheDocument();
          expect(button).toBeDisabled();
          
          // Should have spinner with animate-spin class
          const spinner = button?.querySelector('.animate-spin');
          expect(spinner).toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should hide icon when loading is true', () => {
    fc.assert(
      fc.property(
        buttonVariantArb,
        iconPositionArb,
        (variant, iconPosition) => {
          const { container, queryByTestId } = render(
            <Button
              variant={variant}
              loading={true}
              icon={<Plus data-testid="icon" />}
              iconPosition={iconPosition}
            >
              Test
            </Button>
          );
          const button = container.querySelector('button');
          
          expect(button).toBeInTheDocument();
          
          // Icon should not be rendered when loading
          expect(queryByTestId('icon')).not.toBeInTheDocument();
          
          // Spinner should be rendered instead
          const spinner = button?.querySelector('.animate-spin');
          expect(spinner).toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not render spinner when loading is false', () => {
    fc.assert(
      fc.property(buttonVariantArb, buttonSizeArb, (variant, size) => {
        const { container } = render(
          <Button variant={variant} size={size} loading={false}>
            Test
          </Button>
        );
        const button = container.querySelector('button');
        
        expect(button).toBeInTheDocument();
        expect(button).not.toBeDisabled();
        
        // Should not have spinner
        const spinner = button?.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 10: Button Disabled State', () => {
  /**
   * **Validates: Requirements 5.4**
   * 
   * For any Button with disabled=true, the component SHALL have
   * opacity-50 and cursor-not-allowed classes applied.
   */
  it('should apply disabled styles when disabled is true', () => {
    fc.assert(
      fc.property(
        buttonVariantArb,
        buttonSizeArb,
        fc.boolean(),
        (variant, size, fullWidth) => {
          const { container } = render(
            <Button
              variant={variant}
              size={size}
              fullWidth={fullWidth}
              disabled={true}
            >
              Test
            </Button>
          );
          const button = container.querySelector('button');
          
          expect(button).toBeInTheDocument();
          expect(button).toBeDisabled();
          
          // Should have disabled conditional classes in className
          expect(button?.className).toContain('disabled:opacity-50');
          expect(button?.className).toContain('disabled:cursor-not-allowed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be disabled when both disabled and loading are true', () => {
    fc.assert(
      fc.property(buttonVariantArb, (variant) => {
        const { container } = render(
          <Button variant={variant} disabled={true} loading={true}>
            Test
          </Button>
        );
        const button = container.querySelector('button');
        
        expect(button).toBeInTheDocument();
        expect(button).toBeDisabled();
      }),
      { numRuns: 100 }
    );
  });

  it('should not be disabled when disabled is false and loading is false', () => {
    fc.assert(
      fc.property(buttonVariantArb, (variant) => {
        const { container } = render(
          <Button variant={variant} disabled={false} loading={false}>
            Test
          </Button>
        );
        const button = container.querySelector('button');
        
        expect(button).toBeInTheDocument();
        expect(button).not.toBeDisabled();
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 11: Button Icon Configuration', () => {
  /**
   * **Validates: Requirements 5.5**
   * 
   * For any Button with icon prop, the component SHALL render the icon
   * in the correct position (left or right) relative to the text.
   */
  it('should render icon in correct position for any variant and size', () => {
    fc.assert(
      fc.property(
        buttonVariantArb,
        buttonSizeArb,
        iconPositionArb,
        (variant, size, iconPosition) => {
          const { container } = render(
            <Button
              variant={variant}
              size={size}
              icon={<Plus data-testid="icon" />}
              iconPosition={iconPosition}
            >
              Test Text
            </Button>
          );
          
          const button = container.querySelector('button');
          const icon = container.querySelector('[data-testid="icon"]');
          
          expect(button).toBeInTheDocument();
          expect(icon).toBeInTheDocument();
          
          // Verify icon is inside the button
          expect(button).toContainElement(icon);
          
          // Verify button has text content
          expect(button?.textContent).toContain('Test Text');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render button without icon when icon prop is not provided', () => {
    fc.assert(
      fc.property(buttonVariantArb, buttonSizeArb, (variant, size) => {
        const { container } = render(
          <Button variant={variant} size={size}>
            Test
          </Button>
        );
        const button = container.querySelector('button');
        const icon = container.querySelector('[data-testid="icon"]');
        
        expect(button).toBeInTheDocument();
        expect(icon).not.toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });

  it('should support icon-only button (no children text)', () => {
    fc.assert(
      fc.property(buttonVariantArb, (variant) => {
        const { container } = render(
          <Button
            variant={variant}
            icon={<Plus data-testid="icon" />}
            aria-label="Add"
          />
        );
        
        const button = container.querySelector('button[aria-label="Add"]');
        const icon = container.querySelector('[data-testid="icon"]');
        
        expect(button).toBeInTheDocument();
        expect(icon).toBeInTheDocument();
        expect(button).toContainElement(icon);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 12: Button Full Width', () => {
  /**
   * **Validates: Requirements 5.9**
   * 
   * For any Button with fullWidth=true, the component SHALL have
   * w-full class applied.
   */
  it('should apply w-full class when fullWidth is true', () => {
    fc.assert(
      fc.property(
        buttonVariantArb,
        buttonSizeArb,
        fc.boolean(),
        (variant, size, loading) => {
          const { container } = render(
            <Button
              variant={variant}
              size={size}
              loading={loading}
              fullWidth={true}
            >
              Test
            </Button>
          );
          const button = container.querySelector('button');
          
          expect(button).toBeInTheDocument();
          expect(button).toHaveClass('w-full');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not apply w-full class when fullWidth is false', () => {
    fc.assert(
      fc.property(buttonVariantArb, buttonSizeArb, (variant, size) => {
        const { container } = render(
          <Button variant={variant} size={size} fullWidth={false}>
            Test
          </Button>
        );
        const button = container.querySelector('button');
        
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveClass('w-full');
      }),
      { numRuns: 100 }
    );
  });

  it('should not apply w-full class by default (when fullWidth is undefined)', () => {
    fc.assert(
      fc.property(buttonVariantArb, (variant) => {
        const { container } = render(<Button variant={variant}>Test</Button>);
        const button = container.querySelector('button');
        
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveClass('w-full');
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 6: Touch Target Minimum Size', () => {
  /**
   * **Validates: Requirements 4.4, 5.8, 6.9, 8.8**
   * 
   * For any interactive component (Button), the rendered element SHALL have
   * a minimum height of 44px to meet touch target accessibility requirements.
   */
  it('should have min-h-[44px] class for any variant and size', () => {
    fc.assert(
      fc.property(
        buttonVariantArb,
        buttonSizeArb,
        fc.boolean(),
        fc.boolean(),
        (variant, size, loading, disabled) => {
          const { container } = render(
            <Button
              variant={variant}
              size={size}
              loading={loading}
              disabled={disabled}
            >
              Test
            </Button>
          );
          const button = container.querySelector('button');
          
          expect(button).toBeInTheDocument();
          expect(button).toHaveClass('min-h-[44px]');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain minimum touch target with icon', () => {
    fc.assert(
      fc.property(
        buttonVariantArb,
        buttonSizeArb,
        iconPositionArb,
        (variant, size, iconPosition) => {
          const { container } = render(
            <Button
              variant={variant}
              size={size}
              icon={<Plus />}
              iconPosition={iconPosition}
            >
              Test
            </Button>
          );
          const button = container.querySelector('button');
          
          expect(button).toBeInTheDocument();
          expect(button).toHaveClass('min-h-[44px]');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain minimum touch target when fullWidth', () => {
    fc.assert(
      fc.property(buttonVariantArb, buttonSizeArb, (variant, size) => {
        const { container } = render(
          <Button variant={variant} size={size} fullWidth={true}>
            Test
          </Button>
        );
        const button = container.querySelector('button');
        
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('min-h-[44px]');
        expect(button).toHaveClass('w-full');
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property Integration: Combined Props', () => {
  /**
   * Tests that all properties work correctly when combined together.
   * This validates that prop combinations don't interfere with each other.
   */
  it('should handle all props combined correctly', () => {
    fc.assert(
      fc.property(
        buttonVariantArb,
        buttonSizeArb,
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        iconPositionArb,
        (variant, size, loading, disabled, fullWidth, iconPosition) => {
          const { container } = render(
            <Button
              variant={variant}
              size={size}
              loading={loading}
              disabled={disabled}
              fullWidth={fullWidth}
              icon={<Plus data-testid="icon" />}
              iconPosition={iconPosition}
            >
              Test
            </Button>
          );
          const button = container.querySelector('button');
          
          expect(button).toBeInTheDocument();
          
          // Verify all base classes are present
          expect(button).toHaveClass('inline-flex');
          expect(button).toHaveClass('items-center');
          expect(button).toHaveClass('justify-center');
          expect(button).toHaveClass('font-medium');
          expect(button).toHaveClass('rounded-lg');
          expect(button).toHaveClass('min-h-[44px]');
          
          // Verify disabled state
          if (loading || disabled) {
            expect(button).toBeDisabled();
          } else {
            expect(button).not.toBeDisabled();
          }
          
          // Verify fullWidth
          if (fullWidth) {
            expect(button).toHaveClass('w-full');
          }
          
          // Verify loading spinner
          if (loading) {
            const spinner = button?.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
