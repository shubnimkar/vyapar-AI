/**
 * Card Component Property-Based Tests
 * 
 * Tests universal properties that should hold across all valid inputs.
 * Uses fast-check for property-based testing.
 * 
 * @see components/ui/Card.tsx
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirement 7
 * @see .kiro/specs/ui-ux-redesign/design.md - Properties 17, 18, 19, 20
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { Card, CardHeader, CardBody, CardFooter, CardSkeleton } from '../Card';
import type { CardElevation, CardDensity } from '../Card';

describe('Card Property-Based Tests', () => {
  describe('Property 17: Card Elevation Rendering', () => {
    /**
     * **Validates: Requirements 7.2**
     * 
     * Feature: ui-ux-redesign, Property 17: Card Elevation Rendering
     * 
     * For any Card elevation level (flat, raised, elevated),
     * the component SHALL apply the correct shadow classes.
     */
    it('should apply correct shadow classes for any elevation level', () => {
      const elevationArb = fc.constantFrom<CardElevation>('flat', 'raised', 'elevated');

      fc.assert(
        fc.property(elevationArb, (elevation) => {
          const { container } = render(<Card elevation={elevation}>Content</Card>);
          const card = container.firstChild as HTMLElement;

          // All elevations should have border
          expect(card).toHaveClass('border', 'border-neutral-200');

          // Check elevation-specific shadow classes
          switch (elevation) {
            case 'flat':
              expect(card).not.toHaveClass('shadow-sm', 'shadow-md');
              break;
            case 'raised':
              expect(card).toHaveClass('shadow-sm');
              expect(card).not.toHaveClass('shadow-md');
              break;
            case 'elevated':
              expect(card).toHaveClass('shadow-md');
              expect(card).not.toHaveClass('shadow-sm');
              break;
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: Card Interactive Hover', () => {
    /**
     * **Validates: Requirements 7.3, 7.6**
     * 
     * Feature: ui-ux-redesign, Property 18: Card Interactive Hover
     * 
     * For any Card with interactive=true,
     * the component SHALL have hover classes for border color change and shadow increase.
     */
    it('should apply hover classes when interactive is true', () => {
      const interactiveArb = fc.boolean();
      const elevationArb = fc.constantFrom<CardElevation>('flat', 'raised', 'elevated');

      fc.assert(
        fc.property(interactiveArb, elevationArb, (interactive, elevation) => {
          const { container } = render(
            <Card interactive={interactive} elevation={elevation}>
              Content
            </Card>
          );
          const card = container.firstChild as HTMLElement;

          if (interactive) {
            // Should have cursor-pointer
            expect(card).toHaveClass('cursor-pointer');
            
            // Should have hover border color change to primary-300
            expect(card).toHaveClass('hover:border-primary-300');
            
            // Should have hover shadow increase to shadow-lg
            expect(card).toHaveClass('hover:shadow-lg');
            
            // Should have active scale effect (0.99)
            expect(card).toHaveClass('active:scale-[0.99]');
          } else {
            // Should not have interactive classes
            expect(card).not.toHaveClass('cursor-pointer');
            expect(card).not.toHaveClass('hover:border-primary-300');
            expect(card).not.toHaveClass('hover:shadow-lg');
            expect(card).not.toHaveClass('active:scale-[0.99]');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 19: Card Loading State', () => {
    /**
     * **Validates: Requirements 7.7**
     * 
     * Feature: ui-ux-redesign, Property 19: Card Loading State
     * 
     * For any Card with loading=true,
     * the component SHALL have animate-pulse class applied.
     */
    it('should apply animate-pulse class when loading is true', () => {
      const loadingArb = fc.boolean();
      const elevationArb = fc.constantFrom<CardElevation>('flat', 'raised', 'elevated');
      const densityArb = fc.constantFrom<CardDensity>('compact', 'comfortable');

      fc.assert(
        fc.property(loadingArb, elevationArb, densityArb, (loading, elevation, density) => {
          const { container } = render(
            <Card loading={loading} elevation={elevation} density={density}>
              Content
            </Card>
          );
          const card = container.firstChild as HTMLElement;

          if (loading) {
            expect(card).toHaveClass('animate-pulse');
          } else {
            expect(card).not.toHaveClass('animate-pulse');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Card Density Rendering', () => {
    /**
     * **Validates: Requirements 7.8**
     * 
     * Feature: ui-ux-redesign, Property 20: Card Density Rendering
     * 
     * For any Card density option (compact, comfortable),
     * the component SHALL apply the correct padding classes.
     */
    it('should apply correct padding classes for any density option', () => {
      const densityArb = fc.constantFrom<CardDensity>('compact', 'comfortable');

      fc.assert(
        fc.property(densityArb, (density) => {
          const { container } = render(<Card density={density}>Content</Card>);
          const card = container.firstChild as HTMLElement;

          // Check density-specific padding classes
          switch (density) {
            case 'compact':
              expect(card).toHaveClass('p-4');
              expect(card).not.toHaveClass('p-6');
              break;
            case 'comfortable':
              expect(card).toHaveClass('p-6');
              expect(card).not.toHaveClass('p-4');
              break;
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Card Base Styles Invariant', () => {
    /**
     * For any combination of Card props,
     * the component SHALL always have base styles (white background, rounded corners, border).
     */
    it('should always apply base styles regardless of props', () => {
      const elevationArb = fc.constantFrom<CardElevation>('flat', 'raised', 'elevated');
      const densityArb = fc.constantFrom<CardDensity>('compact', 'comfortable');
      const interactiveArb = fc.boolean();
      const loadingArb = fc.boolean();

      fc.assert(
        fc.property(
          elevationArb,
          densityArb,
          interactiveArb,
          loadingArb,
          (elevation, density, interactive, loading) => {
            const { container } = render(
              <Card
                elevation={elevation}
                density={density}
                interactive={interactive}
                loading={loading}
              >
                Content
              </Card>
            );
            const card = container.firstChild as HTMLElement;

            // Base styles should always be present
            expect(card).toHaveClass('bg-white');
            expect(card).toHaveClass('rounded-lg');
            expect(card).toHaveClass('border');
            expect(card).toHaveClass('border-neutral-200');
            expect(card).toHaveClass('transition-all');
            expect(card).toHaveClass('duration-base');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Card Sub-Components Rendering', () => {
    /**
     * For any Card with sub-components (CardHeader, CardBody, CardFooter),
     * all sub-components SHALL render correctly with proper spacing.
     */
    it('should render all sub-components with correct spacing', () => {
      const contentArb = fc.string({ minLength: 2, maxLength: 50 }).filter(
        (str) => str.trim().length >= 2 && /^[a-zA-Z0-9]+$/.test(str.trim()) // Alphanumeric only
      );

      fc.assert(
        fc.property(
          contentArb,
          (content) => {
            const headerContent = `H${content}`;
            const bodyContent = `B${content}`;
            const footerContent = `F${content}`;
            
            const { container } = render(
              <Card>
                <CardHeader>{headerContent}</CardHeader>
                <CardBody>{bodyContent}</CardBody>
                <CardFooter>{footerContent}</CardFooter>
              </Card>
            );

            // Check that all three sections exist with correct classes
            const header = container.querySelector('.mb-4');
            const footer = container.querySelector('.mt-4.pt-4.border-t.border-neutral-200');
            
            expect(header).toBeInTheDocument();
            expect(footer).toBeInTheDocument();
            
            // Verify content is rendered
            expect(container.textContent).toContain(headerContent);
            expect(container.textContent).toContain(bodyContent);
            expect(container.textContent).toContain(footerContent);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('CardSkeleton Rendering', () => {
    /**
     * For any CardSkeleton with density option,
     * the component SHALL render with loading state and correct density.
     */
    it('should render skeleton with loading state and correct density', () => {
      const densityArb = fc.constantFrom<CardDensity>('compact', 'comfortable');

      fc.assert(
        fc.property(densityArb, (density) => {
          const { container } = render(<CardSkeleton density={density} />);
          const card = container.firstChild as HTMLElement;

          // Should have loading state
          expect(card).toHaveClass('animate-pulse');

          // Should have correct density
          switch (density) {
            case 'compact':
              expect(card).toHaveClass('p-4');
              break;
            case 'comfortable':
              expect(card).toHaveClass('p-6');
              break;
          }

          // Should contain skeleton elements
          const skeletons = container.querySelectorAll('.animate-pulse');
          expect(skeletons.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Custom ClassName Merging', () => {
    /**
     * For any Card with custom className,
     * the component SHALL merge custom classes with default classes without conflicts.
     */
    it('should merge custom className with default classes', () => {
      const classNameArb = fc.string({ minLength: 1, maxLength: 30 }).filter(
        (str) => !str.includes(' ') && /^[a-z-]+$/.test(str)
      );
      const elevationArb = fc.constantFrom<CardElevation>('flat', 'raised', 'elevated');

      fc.assert(
        fc.property(classNameArb, elevationArb, (className, elevation) => {
          const { container } = render(
            <Card className={className} elevation={elevation}>
              Content
            </Card>
          );
          const card = container.firstChild as HTMLElement;

          // Custom class should be present
          expect(card).toHaveClass(className);

          // Base classes should still be present
          expect(card).toHaveClass('bg-white', 'rounded-lg', 'border');
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('HTML Attributes Pass-Through', () => {
    /**
     * For any Card with HTML attributes,
     * the component SHALL pass through all attributes to the underlying div element.
     */
    it('should pass through HTML attributes', () => {
      const dataTestIdArb = fc.string({ minLength: 1, maxLength: 20 });
      const ariaLabelArb = fc.string({ minLength: 1, maxLength: 50 });

      fc.assert(
        fc.property(dataTestIdArb, ariaLabelArb, (dataTestId, ariaLabel) => {
          const { container } = render(
            <Card data-testid={dataTestId} aria-label={ariaLabel}>
              Content
            </Card>
          );
          const card = container.firstChild as HTMLElement;

          expect(card).toHaveAttribute('data-testid', dataTestId);
          expect(card).toHaveAttribute('aria-label', ariaLabel);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Transition Classes', () => {
    /**
     * For any Card configuration,
     * the component SHALL always have transition classes for smooth animations.
     */
    it('should always have transition classes', () => {
      const elevationArb = fc.constantFrom<CardElevation>('flat', 'raised', 'elevated');
      const densityArb = fc.constantFrom<CardDensity>('compact', 'comfortable');
      const interactiveArb = fc.boolean();

      fc.assert(
        fc.property(
          elevationArb,
          densityArb,
          interactiveArb,
          (elevation, density, interactive) => {
            const { container } = render(
              <Card elevation={elevation} density={density} interactive={interactive}>
                Content
              </Card>
            );
            const card = container.firstChild as HTMLElement;

            // Should have transition classes
            expect(card).toHaveClass('transition-all', 'duration-base');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
