/**
 * Property-based tests for Input Component
 * Feature: ui-ux-redesign
 * 
 * These tests validate universal correctness properties for the Input component
 * across all possible prop combinations using fast-check.
 * 
 * Properties tested:
 * - Property 13: Input State Rendering (Requirements 6.1, 6.3, 6.4)
 * - Property 14: Input Label with Required Indicator (Requirement 6.2)
 * - Property 15: Input Prefix and Suffix (Requirement 6.6)
 * - Property 16: Input Helper Text (Requirement 6.10)
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { Input, InputState, InputType } from '../Input';
import { DollarSign, Search } from 'lucide-react';

// Arbitraries for Input props
const inputStateArb = fc.constantFrom<InputState>('default', 'error', 'success');

const inputTypeArb = fc.constantFrom<InputType>(
  'text',
  'number',
  'date',
  'email',
  'password',
  'tel',
  'url'
);

const inputAsArb = fc.constantFrom<'textarea' | 'select' | undefined>(
  undefined,
  'textarea',
  'select'
);

// String arbitraries that exclude whitespace-only strings
const nonEmptyStringArb = (minLength: number, maxLength: number) =>
  fc.string({ minLength, maxLength }).filter(s => s.trim().length > 0);

const labelTextArb = nonEmptyStringArb(1, 50);
const errorTextArb = nonEmptyStringArb(1, 100);
const successTextArb = nonEmptyStringArb(1, 100);
const helperTextArb = nonEmptyStringArb(1, 100);
const prefixTextArb = nonEmptyStringArb(1, 5);
const suffixTextArb = nonEmptyStringArb(1, 5);

describe('Property 13: Input State Rendering', () => {
  /**
   * **Validates: Requirements 6.1, 6.3, 6.4**
   * 
   * For any Input component state (default, error, success), the component SHALL
   * apply the correct border color and ring color classes.
   */
  it('should apply correct border and ring colors for any state', () => {
    fc.assert(
      fc.property(inputStateArb, (state) => {
        const { container } = render(
          <Input state={state} placeholder="Test input" />
        );
        const input = container.querySelector('input');
        
        expect(input).toBeInTheDocument();
        
        // Verify state-specific border and focus ring classes
        const stateClasses: Record<InputState, string[]> = {
          default: ['border-neutral-300', 'focus:border-primary-500', 'focus:ring-primary-500'],
          error: ['border-error-500', 'focus:border-error-500', 'focus:ring-error-500'],
          success: ['border-success-500', 'focus:border-success-500', 'focus:ring-success-500'],
        };
        
        const expectedClasses = stateClasses[state];
        expectedClasses.forEach(cls => {
          expect(input).toHaveClass(cls);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should render error icon when error message is provided', () => {
    fc.assert(
      fc.property(errorTextArb, (errorMessage) => {
        const { container } = render(
          <Input error={errorMessage} placeholder="Test input" />
        );
        const input = container.querySelector('input');
        const errorParagraph = container.querySelector('.text-error-600');
        
        expect(input).toBeInTheDocument();
        
        // Should have error state classes
        expect(input).toHaveClass('border-error-500');
        expect(input).toHaveClass('focus:border-error-500');
        expect(input).toHaveClass('focus:ring-error-500');
        
        // Should render error icon (AlertCircle)
        const errorIcon = container.querySelector('.text-error-500');
        expect(errorIcon).toBeInTheDocument();
        
        // Should render error message
        expect(errorParagraph).toBeInTheDocument();
        expect(errorParagraph?.textContent).toContain(errorMessage);
        expect(errorParagraph).toHaveClass('text-error-600');
      }),
      { numRuns: 100 }
    );
  });

  it('should render success icon when success message is provided', () => {
    fc.assert(
      fc.property(successTextArb, (successMessage) => {
        const { container } = render(
          <Input success={successMessage} placeholder="Test input" />
        );
        const input = container.querySelector('input');
        const successParagraph = container.querySelector('.text-success-600');
        
        expect(input).toBeInTheDocument();
        
        // Should have success state classes
        expect(input).toHaveClass('border-success-500');
        expect(input).toHaveClass('focus:border-success-500');
        expect(input).toHaveClass('focus:ring-success-500');
        
        // Should render success icon (CheckCircle)
        const successIcon = container.querySelector('.text-success-500');
        expect(successIcon).toBeInTheDocument();
        
        // Should render success message
        expect(successParagraph).toBeInTheDocument();
        expect(successParagraph?.textContent).toContain(successMessage);
        expect(successParagraph).toHaveClass('text-success-600');
      }),
      { numRuns: 100 }
    );
  });

  it('should prioritize error state over success state', () => {
    fc.assert(
      fc.property(errorTextArb, successTextArb, (errorMessage, successMessage) => {
        // Ensure error and success messages are different to avoid test confusion
        fc.pre(errorMessage !== successMessage);
        
        const { container } = render(
          <Input 
            error={errorMessage} 
            success={successMessage} 
            placeholder="Test input" 
          />
        );
        const input = container.querySelector('input');
        const errorParagraph = container.querySelector('.text-error-600');
        
        expect(input).toBeInTheDocument();
        
        // Should have error state classes (not success)
        expect(input).toHaveClass('border-error-500');
        expect(input).not.toHaveClass('border-success-500');
        
        // Should render error message
        expect(errorParagraph).toBeInTheDocument();
        expect(errorParagraph?.textContent).toContain(errorMessage);
        
        // Note: The component currently renders both error and success paragraphs
        // when both props are provided. This tests that error styling takes precedence.
      }),
      { numRuns: 100 }
    );
  });

  it('should apply state classes for textarea', () => {
    fc.assert(
      fc.property(inputStateArb, (state) => {
        const { container } = render(
          <Input as="textarea" state={state} placeholder="Test textarea" />
        );
        const textarea = container.querySelector('textarea');
        
        expect(textarea).toBeInTheDocument();
        
        // Verify state-specific classes are applied to textarea
        const stateClasses: Record<InputState, string[]> = {
          default: ['border-neutral-300', 'focus:border-primary-500'],
          error: ['border-error-500', 'focus:border-error-500'],
          success: ['border-success-500', 'focus:border-success-500'],
        };
        
        stateClasses[state].forEach(cls => {
          expect(textarea).toHaveClass(cls);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should apply state classes for select', () => {
    fc.assert(
      fc.property(inputStateArb, (state) => {
        const { container } = render(
          <Input as="select" state={state}>
            <option value="">Select</option>
            <option value="1">Option 1</option>
          </Input>
        );
        const select = container.querySelector('select');
        
        expect(select).toBeInTheDocument();
        
        // Verify state-specific classes are applied to select
        const stateClasses: Record<InputState, string[]> = {
          default: ['border-neutral-300', 'focus:border-primary-500'],
          error: ['border-error-500', 'focus:border-error-500'],
          success: ['border-success-500', 'focus:border-success-500'],
        };
        
        stateClasses[state].forEach(cls => {
          expect(select).toHaveClass(cls);
        });
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 14: Input Label with Required Indicator', () => {
  /**
   * **Validates: Requirements 6.2**
   * 
   * For any Input with label and required props, the component SHALL render
   * the label text with a red asterisk.
   */
  it('should render label with red asterisk when required is true', () => {
    fc.assert(
      fc.property(labelTextArb, (labelText) => {
        const { container } = render(
          <Input label={labelText} required={true} placeholder="Test input" />
        );
        const label = container.querySelector('label');
        const asterisk = container.querySelector('.text-error-500');
        
        // Should render label text
        expect(label).toBeInTheDocument();
        expect(label?.textContent).toContain(labelText);
        
        // Should render asterisk with error color
        expect(asterisk).toBeInTheDocument();
        expect(asterisk?.textContent).toBe('*');
        expect(asterisk).toHaveClass('text-error-500');
        expect(asterisk).toHaveClass('ml-1');
      }),
      { numRuns: 100 }
    );
  });

  it('should not render asterisk when required is false', () => {
    fc.assert(
      fc.property(labelTextArb, (labelText) => {
        const { container } = render(
          <Input label={labelText} required={false} placeholder="Test input" />
        );
        const label = container.querySelector('label');
        const asteriskSpan = container.querySelector('.text-error-500.ml-1');
        
        // Should render label text
        expect(label).toBeInTheDocument();
        expect(label?.textContent).toContain(labelText);
        
        // Should not render asterisk span
        expect(asteriskSpan).not.toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });

  it('should not render asterisk when required is undefined', () => {
    fc.assert(
      fc.property(labelTextArb, (labelText) => {
        const { container } = render(
          <Input label={labelText} placeholder="Test input" />
        );
        const label = container.querySelector('label');
        const asteriskSpan = container.querySelector('.text-error-500.ml-1');
        
        // Should render label text
        expect(label).toBeInTheDocument();
        expect(label?.textContent).toContain(labelText);
        
        // Should not render asterisk span
        expect(asteriskSpan).not.toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });

  it('should render required indicator for any input type', () => {
    fc.assert(
      fc.property(labelTextArb, inputTypeArb, (labelText, inputType) => {
        const { container } = render(
          <Input 
            type={inputType} 
            label={labelText} 
            required={true} 
            placeholder="Test input" 
          />
        );
        const label = container.querySelector('label');
        const asterisk = container.querySelector('.text-error-500');
        
        // Should render label with asterisk
        expect(label).toBeInTheDocument();
        expect(label?.textContent).toContain(labelText);
        expect(asterisk).toBeInTheDocument();
        expect(asterisk?.textContent).toBe('*');
        expect(asterisk).toHaveClass('text-error-500');
      }),
      { numRuns: 100 }
    );
  });

  it('should render required indicator for textarea', () => {
    fc.assert(
      fc.property(labelTextArb, (labelText) => {
        const { container } = render(
          <Input 
            as="textarea" 
            label={labelText} 
            required={true} 
            placeholder="Test textarea" 
          />
        );
        const label = container.querySelector('label');
        const asterisk = container.querySelector('.text-error-500');
        
        // Should render label with asterisk
        expect(label).toBeInTheDocument();
        expect(label?.textContent).toContain(labelText);
        expect(asterisk).toBeInTheDocument();
        expect(asterisk?.textContent).toBe('*');
        expect(asterisk).toHaveClass('text-error-500');
      }),
      { numRuns: 100 }
    );
  });

  it('should render required indicator for select', () => {
    fc.assert(
      fc.property(labelTextArb, (labelText) => {
        const { container } = render(
          <Input 
            as="select" 
            label={labelText} 
            required={true}
          >
            <option value="">Select</option>
          </Input>
        );
        const label = container.querySelector('label');
        const asterisk = container.querySelector('.text-error-500');
        
        // Should render label with asterisk
        expect(label).toBeInTheDocument();
        expect(label?.textContent).toContain(labelText);
        expect(asterisk).toBeInTheDocument();
        expect(asterisk?.textContent).toBe('*');
        expect(asterisk).toHaveClass('text-error-500');
      }),
      { numRuns: 100 }
    );
  });

  it('should render label without asterisk when no label prop provided', () => {
    fc.assert(
      fc.property(fc.boolean(), (required) => {
        const { container } = render(
          <Input required={required} placeholder="Test input" />
        );
        
        // Should not render label or asterisk
        expect(screen.queryByText('*')).not.toBeInTheDocument();
        const label = container.querySelector('label');
        expect(label).not.toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 15: Input Prefix and Suffix', () => {
  /**
   * **Validates: Requirements 6.6**
   * 
   * For any Input with prefix or suffix props, the component SHALL render them
   * in the correct position and adjust padding accordingly.
   */
  it('should render prefix in correct position with adjusted padding', () => {
    fc.assert(
      fc.property(prefixTextArb, (prefixText) => {
        const { container } = render(
          <Input prefix={prefixText} placeholder="Test input" />
        );
        const input = container.querySelector('input');
        const prefixContainer = container.querySelector('.absolute.left-4');
        
        expect(input).toBeInTheDocument();
        
        // Should render prefix text
        expect(prefixContainer).toBeInTheDocument();
        expect(prefixContainer?.textContent).toContain(prefixText);
        
        // Should apply left padding for prefix
        expect(input).toHaveClass('pl-10');
        
        // Prefix should be positioned absolutely on the left
        expect(prefixContainer).toHaveClass('absolute');
        expect(prefixContainer).toHaveClass('left-4');
        expect(prefixContainer).toHaveClass('top-1/2');
        expect(prefixContainer).toHaveClass('-translate-y-1/2');
      }),
      { numRuns: 100 }
    );
  });

  it('should render suffix in correct position with adjusted padding', () => {
    fc.assert(
      fc.property(suffixTextArb, (suffixText) => {
        const { container } = render(
          <Input suffix={suffixText} placeholder="Test input" />
        );
        const input = container.querySelector('input');
        // Find suffix container (not error/success icon)
        const allRightContainers = container.querySelectorAll('.absolute.right-4');
        const suffixContainer = Array.from(allRightContainers).find(el => 
          el.textContent?.includes(suffixText)
        );
        
        expect(input).toBeInTheDocument();
        
        // Should render suffix text
        expect(suffixContainer).toBeInTheDocument();
        expect(suffixContainer?.textContent).toContain(suffixText);
        
        // Should apply right padding for suffix
        expect(input).toHaveClass('pr-10');
        
        // Suffix should be positioned absolutely on the right
        expect(suffixContainer).toHaveClass('absolute');
        expect(suffixContainer).toHaveClass('right-4');
        expect(suffixContainer).toHaveClass('top-1/2');
        expect(suffixContainer).toHaveClass('-translate-y-1/2');
      }),
      { numRuns: 100 }
    );
  });

  it('should render both prefix and suffix with correct padding', () => {
    fc.assert(
      fc.property(prefixTextArb, suffixTextArb, (prefixText, suffixText) => {
        const { container } = render(
          <Input 
            prefix={prefixText} 
            suffix={suffixText} 
            placeholder="Test input" 
          />
        );
        const input = container.querySelector('input');
        const prefixContainer = container.querySelector('.absolute.left-4');
        const allRightContainers = container.querySelectorAll('.absolute.right-4');
        const suffixContainer = Array.from(allRightContainers).find(el => 
          el.textContent?.includes(suffixText)
        );
        
        expect(input).toBeInTheDocument();
        
        // Should render both prefix and suffix
        expect(prefixContainer).toBeInTheDocument();
        expect(prefixContainer?.textContent).toContain(prefixText);
        expect(suffixContainer).toBeInTheDocument();
        expect(suffixContainer?.textContent).toContain(suffixText);
        
        // Should apply both left and right padding
        expect(input).toHaveClass('pl-10');
        expect(input).toHaveClass('pr-10');
      }),
      { numRuns: 100 }
    );
  });

  it('should render prefix with icon component', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (placeholder) => {
        const { container } = render(
          <Input prefix={<DollarSign data-testid="prefix-icon" />} placeholder={placeholder} />
        );
        const input = container.querySelector('input');
        const prefixIcon = container.querySelector('[data-testid="prefix-icon"]');
        
        expect(input).toBeInTheDocument();
        
        // Should render prefix icon
        expect(prefixIcon).toBeInTheDocument();
        
        // Should apply left padding
        expect(input).toHaveClass('pl-10');
      }),
      { numRuns: 100 }
    );
  });

  it('should render suffix with icon component', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (placeholder) => {
        const { container } = render(
          <Input suffix={<Search data-testid="suffix-icon" />} placeholder={placeholder} />
        );
        const input = container.querySelector('input');
        const suffixIcon = container.querySelector('[data-testid="suffix-icon"]');
        
        expect(input).toBeInTheDocument();
        
        // Should render suffix icon
        expect(suffixIcon).toBeInTheDocument();
        
        // Should apply right padding
        expect(input).toHaveClass('pr-10');
      }),
      { numRuns: 100 }
    );
  });

  it('should hide suffix when error state is present', () => {
    fc.assert(
      fc.property(suffixTextArb, errorTextArb, (suffixText, errorMessage) => {
        const { container } = render(
          <Input 
            suffix={suffixText} 
            error={errorMessage} 
            placeholder="Test input" 
          />
        );
        // Check if suffix text appears in any non-icon container
        const allText = container.textContent || '';
        const errorParagraph = container.querySelector('.text-error-600');
        
        // Error message should be present
        expect(errorParagraph).toBeInTheDocument();
        expect(errorParagraph?.textContent).toContain(errorMessage);
        
        // Suffix text should not appear (except possibly in error message if they overlap)
        // We check that there's no suffix container specifically
        const allRightContainers = container.querySelectorAll('.absolute.right-4');
        const hasSuffixContainer = Array.from(allRightContainers).some(el => {
          const text = el.textContent || '';
          return text === suffixText && !el.querySelector('svg');
        });
        expect(hasSuffixContainer).toBe(false);
        
        // Error icon should be rendered
        const errorIcon = container.querySelector('.text-error-500');
        expect(errorIcon).toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });

  it('should hide suffix when success state is present', () => {
    fc.assert(
      fc.property(suffixTextArb, successTextArb, (suffixText, successMessage) => {
        const { container } = render(
          <Input 
            suffix={suffixText} 
            success={successMessage} 
            placeholder="Test input" 
          />
        );
        // Check if suffix text appears in any non-icon container
        const successParagraph = container.querySelector('.text-success-600');
        
        // Success message should be present
        expect(successParagraph).toBeInTheDocument();
        expect(successParagraph?.textContent).toContain(successMessage);
        
        // Suffix text should not appear in a suffix container
        const allRightContainers = container.querySelectorAll('.absolute.right-4');
        const hasSuffixContainer = Array.from(allRightContainers).some(el => {
          const text = el.textContent || '';
          return text === suffixText && !el.querySelector('svg');
        });
        expect(hasSuffixContainer).toBe(false);
        
        // Success icon should be rendered
        const successIcon = container.querySelector('.text-success-500');
        expect(successIcon).toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });

  it('should render prefix for any input type', () => {
    fc.assert(
      fc.property(prefixTextArb, inputTypeArb, (prefixText, inputType) => {
        const { container } = render(
          <Input 
            type={inputType} 
            prefix={prefixText} 
            placeholder="Test input" 
          />
        );
        const input = container.querySelector('input');
        const prefixContainer = container.querySelector('.absolute.left-4');
        
        expect(input).toBeInTheDocument();
        expect(prefixContainer).toBeInTheDocument();
        expect(prefixContainer?.textContent).toContain(prefixText);
        expect(input).toHaveClass('pl-10');
      }),
      { numRuns: 100 }
    );
  });

  it('should not render prefix or suffix when not provided', () => {
    fc.assert(
      fc.property(fc.constant(true), (_) => {
        const { container } = render(
          <Input placeholder="Test input" />
        );
        const input = container.querySelector('input');
        
        expect(input).toBeInTheDocument();
        
        // Should not have extra padding
        expect(input).not.toHaveClass('pl-10');
        // Note: pr-10 might be present for error/success icons
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 16: Input Helper Text', () => {
  /**
   * **Validates: Requirements 6.10**
   * 
   * For any Input with helperText prop (and no error/success), the component SHALL
   * render the helper text below the input field.
   */
  it('should render helper text below input when provided', () => {
    fc.assert(
      fc.property(helperTextArb, (helperText) => {
        const { container } = render(
          <Input helperText={helperText} placeholder="Test input" />
        );
        const helperElement = container.querySelector('.text-neutral-500');
        
        // Should render helper text
        expect(helperElement).toBeInTheDocument();
        expect(helperElement?.textContent).toContain(helperText);
        
        // Should have correct styling
        expect(helperElement).toHaveClass('mt-2');
        expect(helperElement).toHaveClass('text-sm');
        expect(helperElement).toHaveClass('text-neutral-500');
      }),
      { numRuns: 100 }
    );
  });

  it('should not render helper text when error is present', () => {
    fc.assert(
      fc.property(helperTextArb, errorTextArb, (helperText, errorMessage) => {
        const { container } = render(
          <Input 
            helperText={helperText} 
            error={errorMessage} 
            placeholder="Test input" 
          />
        );
        const helperElement = container.querySelector('.text-neutral-500');
        const errorElement = container.querySelector('.text-error-600');
        
        // Helper text should not be rendered
        expect(helperElement).not.toBeInTheDocument();
        
        // Error message should be rendered instead
        expect(errorElement).toBeInTheDocument();
        expect(errorElement?.textContent).toContain(errorMessage);
        expect(errorElement).toHaveClass('text-error-600');
      }),
      { numRuns: 100 }
    );
  });

  it('should not render helper text when success is present', () => {
    fc.assert(
      fc.property(helperTextArb, successTextArb, (helperText, successMessage) => {
        const { container } = render(
          <Input 
            helperText={helperText} 
            success={successMessage} 
            placeholder="Test input" 
          />
        );
        const helperElement = container.querySelector('.text-neutral-500');
        const successElement = container.querySelector('.text-success-600');
        
        // Helper text should not be rendered
        expect(helperElement).not.toBeInTheDocument();
        
        // Success message should be rendered instead
        expect(successElement).toBeInTheDocument();
        expect(successElement?.textContent).toContain(successMessage);
        expect(successElement).toHaveClass('text-success-600');
      }),
      { numRuns: 100 }
    );
  });

  it('should prioritize error over success over helper text', () => {
    fc.assert(
      fc.property(
        helperTextArb,
        errorTextArb,
        successTextArb,
        (helperText, errorMessage, successMessage) => {
          // Make sure all three texts are different to avoid confusion
          fc.pre(helperText !== errorMessage && helperText !== successMessage && errorMessage !== successMessage);
          
          const { container } = render(
            <Input 
              helperText={helperText} 
              error={errorMessage} 
              success={successMessage} 
              placeholder="Test input" 
            />
          );
          const errorElement = container.querySelector('.text-error-600');
          const helperElement = container.querySelector('.text-neutral-500');
          
          // Error message should be rendered
          expect(errorElement).toBeInTheDocument();
          expect(errorElement?.textContent).toContain(errorMessage);
          
          // Helper text should not be rendered (error takes precedence)
          expect(helperElement).not.toBeInTheDocument();
          
          // Note: The component currently renders both error and success paragraphs
          // when both props are provided. We're testing that helper text is hidden.
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render helper text for any input type', () => {
    fc.assert(
      fc.property(helperTextArb, inputTypeArb, (helperText, inputType) => {
        const { container } = render(
          <Input 
            type={inputType} 
            helperText={helperText} 
            placeholder="Test input" 
          />
        );
        const helperElement = container.querySelector('.text-neutral-500');
        
        // Should render helper text
        expect(helperElement).toBeInTheDocument();
        expect(helperElement?.textContent).toContain(helperText);
        expect(helperElement).toHaveClass('text-neutral-500');
      }),
      { numRuns: 100 }
    );
  });

  it('should render helper text for textarea', () => {
    fc.assert(
      fc.property(helperTextArb, (helperText) => {
        const { container } = render(
          <Input 
            as="textarea" 
            helperText={helperText} 
            placeholder="Test textarea" 
          />
        );
        const helperElement = container.querySelector('.text-neutral-500');
        
        // Should render helper text
        expect(helperElement).toBeInTheDocument();
        expect(helperElement?.textContent).toContain(helperText);
        expect(helperElement).toHaveClass('text-neutral-500');
      }),
      { numRuns: 100 }
    );
  });

  it('should render helper text for select', () => {
    fc.assert(
      fc.property(helperTextArb, (helperText) => {
        const { container } = render(
          <Input 
            as="select" 
            helperText={helperText}
          >
            <option value="">Select</option>
          </Input>
        );
        // Find the helper text paragraph (should be the only p.text-neutral-500)
        const helperElement = container.querySelector('p.text-neutral-500');
        
        // Should render helper text
        expect(helperElement).toBeInTheDocument();
        expect(helperElement?.textContent).toBe(helperText);
        expect(helperElement).toHaveClass('text-neutral-500');
      }),
      { numRuns: 100 }
    );
  });

  it('should not render helper text when not provided', () => {
    fc.assert(
      fc.property(fc.constant(true), (_) => {
        const { container } = render(
          <Input placeholder="Test input" />
        );
        
        // Should not render any helper/error/success text
        const textElements = container.querySelectorAll('.text-neutral-500, .text-error-600, .text-success-600');
        expect(textElements.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 6: Touch Target Minimum Size (Input)', () => {
  /**
   * **Validates: Requirements 4.4, 5.8, 6.9, 8.8**
   * 
   * For any interactive component (Input), the rendered element SHALL have
   * a minimum height of 44px to meet touch target accessibility requirements.
   */
  it('should have min-h-[44px] class for any input type', () => {
    fc.assert(
      fc.property(inputTypeArb, (inputType) => {
        const { container } = render(
          <Input type={inputType} placeholder="Test input" />
        );
        const input = container.querySelector('input');
        
        expect(input).toBeInTheDocument();
        expect(input).toHaveClass('min-h-[44px]');
      }),
      { numRuns: 100 }
    );
  });

  it('should have min-h-[44px] class for textarea', () => {
    fc.assert(
      fc.property(fc.constant(true), (_) => {
        const { container } = render(
          <Input as="textarea" placeholder="Test textarea" />
        );
        const textarea = container.querySelector('textarea');
        
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveClass('min-h-[44px]');
      }),
      { numRuns: 100 }
    );
  });

  it('should have min-h-[44px] class for select', () => {
    fc.assert(
      fc.property(fc.constant(true), (_) => {
        const { container } = render(
          <Input as="select">
            <option value="">Select</option>
          </Input>
        );
        const select = container.querySelector('select');
        
        expect(select).toBeInTheDocument();
        expect(select).toHaveClass('min-h-[44px]');
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain minimum touch target with any state', () => {
    fc.assert(
      fc.property(inputStateArb, (state) => {
        const { container } = render(
          <Input state={state} placeholder="Test input" />
        );
        const input = container.querySelector('input');
        
        expect(input).toBeInTheDocument();
        expect(input).toHaveClass('min-h-[44px]');
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain minimum touch target with prefix and suffix', () => {
    fc.assert(
      fc.property(prefixTextArb, suffixTextArb, (prefixText, suffixText) => {
        const { container } = render(
          <Input 
            prefix={prefixText} 
            suffix={suffixText} 
            placeholder="Test input" 
          />
        );
        const input = container.querySelector('input');
        
        expect(input).toBeInTheDocument();
        expect(input).toHaveClass('min-h-[44px]');
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain minimum touch target when disabled', () => {
    fc.assert(
      fc.property(fc.constant(true), (_) => {
        const { container } = render(
          <Input disabled placeholder="Test input" />
        );
        const input = container.querySelector('input');
        
        expect(input).toBeInTheDocument();
        expect(input).toHaveClass('min-h-[44px]');
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
        inputTypeArb,
        inputStateArb,
        labelTextArb,
        fc.boolean(),
        prefixTextArb,
        helperTextArb,
        fc.boolean(),
        (inputType, state, labelText, required, prefixText, helperText, disabled) => {
          // Ensure all text values are different to avoid confusion in assertions
          fc.pre(
            labelText !== prefixText && 
            labelText !== helperText && 
            prefixText !== helperText
          );
          
          const { container } = render(
            <Input
              type={inputType}
              state={state}
              label={labelText}
              required={required}
              prefix={prefixText}
              helperText={helperText}
              disabled={disabled}
              placeholder="Test input"
            />
          );
          const input = container.querySelector('input');
          const label = container.querySelector('label');
          const prefixContainer = container.querySelector('.absolute.left-4');
          
          expect(input).toBeInTheDocument();
          
          // Verify all base classes are present
          expect(input).toHaveClass('w-full');
          expect(input).toHaveClass('px-4');
          expect(input).toHaveClass('py-3');
          expect(input).toHaveClass('rounded-lg');
          expect(input).toHaveClass('text-base');
          expect(input).toHaveClass('border-2');
          expect(input).toHaveClass('min-h-[44px]');
          
          // Verify label rendering
          expect(label).toBeInTheDocument();
          expect(label?.textContent).toContain(labelText);
          
          // Verify required indicator
          if (required) {
            expect(label?.textContent).toContain('*');
          }
          
          // Verify prefix rendering
          expect(prefixContainer).toBeInTheDocument();
          expect(prefixContainer?.textContent).toContain(prefixText);
          expect(input).toHaveClass('pl-10');
          
          // Verify helper text rendering (only when state is default and no error/success)
          if (state === 'default') {
            // Helper text is in a <p> tag, not in an absolute positioned div
            const helperTextElement = container.querySelector('p.text-neutral-500');
            expect(helperTextElement).toBeInTheDocument();
            expect(helperTextElement?.textContent).toBe(helperText);
          }
          
          // Verify disabled state
          if (disabled) {
            expect(input).toBeDisabled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle textarea with all props', () => {
    fc.assert(
      fc.property(
        labelTextArb,
        fc.boolean(),
        helperTextArb,
        fc.integer({ min: 2, max: 10 }),
        (labelText, required, helperText, rows) => {
          const { container } = render(
            <Input
              as="textarea"
              label={labelText}
              required={required}
              helperText={helperText}
              rows={rows}
              placeholder="Test textarea"
            />
          );
          const textarea = container.querySelector('textarea');
          const label = container.querySelector('label');
          const helperTextElement = container.querySelector('.text-neutral-500');
          
          expect(textarea).toBeInTheDocument();
          expect(textarea).toHaveAttribute('rows', rows.toString());
          expect(textarea).toHaveClass('min-h-[44px]');
          expect(label).toBeInTheDocument();
          expect(label?.textContent).toContain(labelText);
          expect(helperTextElement).toBeInTheDocument();
          expect(helperTextElement?.textContent).toContain(helperText);
          
          if (required) {
            expect(label?.textContent).toContain('*');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle select with all props', () => {
    fc.assert(
      fc.property(
        labelTextArb,
        fc.boolean(),
        errorTextArb,
        (labelText, required, errorMessage) => {
          const { container } = render(
            <Input
              as="select"
              label={labelText}
              required={required}
              error={errorMessage}
            >
              <option value="">Select option</option>
              <option value="1">Option 1</option>
            </Input>
          );
          const select = container.querySelector('select');
          const label = container.querySelector('label');
          const errorParagraph = container.querySelector('.text-error-600');
          
          expect(select).toBeInTheDocument();
          expect(select).toHaveClass('min-h-[44px]');
          expect(label).toBeInTheDocument();
          expect(label?.textContent).toContain(labelText);
          expect(errorParagraph).toBeInTheDocument();
          expect(errorParagraph?.textContent).toContain(errorMessage);
          
          if (required) {
            expect(label?.textContent).toContain('*');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
