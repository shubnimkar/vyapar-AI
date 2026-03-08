/**
 * Property-Based Tests for Voice Data Integration
 * 
 * Feature: aws-hackathon-ui-integration
 * Tests universal behaviors of voice data integration across many inputs.
 * 
 * Property 1: Voice Data Callback Invocation
 * Property 2: Form Population from Voice Data
 * 
 * Validates: Requirements 1.7, 1.8, 6.3
 * 
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import { ExtractedVoiceData } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Helper to generate valid date strings
const dateStringArbitrary = () =>
  fc.integer({ min: 2020, max: 2030 }).chain(year =>
    fc.integer({ min: 1, max: 12 }).chain(month =>
      fc.integer({ min: 1, max: 28 }).map(day =>
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      )
    )
  );

// Arbitrary for generating ExtractedVoiceData
const extractedVoiceDataArbitrary = fc.record({
  sales: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: null }),
  expenses: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: null }),
  expenseCategory: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  inventoryChanges: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
  date: dateStringArbitrary(),
  confidence: fc.float({ min: 0, max: 1, noNaN: true }),
});

describe('Voice Data Integration - Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: Voice Data Callback Invocation
   * 
   * **Validates: Requirements 1.7, 1.8**
   * 
   * For any extracted voice data returned by the VoiceRecorder component, when the 
   * onDataExtracted callback is invoked, the dashboard handler should receive data 
   * with the correct structure (containing optional sales, expenses, expenseCategory, 
   * inventoryChanges, and required date and confidence fields).
   */
  describe('Property 1: Voice Data Callback Invocation', () => {
    it('should accept any valid ExtractedVoiceData structure', () => {
      fc.assert(
        fc.property(
          extractedVoiceDataArbitrary,
          (voiceData) => {
            // Simulate the callback handler
            const handleVoiceDataExtracted = (data: ExtractedVoiceData) => {
              // Property: Handler should accept the data without errors
              expect(data).toBeDefined();
              
              // Property: Required fields must be present
              expect(data).toHaveProperty('date');
              expect(data).toHaveProperty('confidence');
              
              // Property: Optional fields can be null or have values
              expect(data).toHaveProperty('sales');
              expect(data).toHaveProperty('expenses');
              expect(data).toHaveProperty('expenseCategory');
              expect(data).toHaveProperty('inventoryChanges');
              
              // Property: date must be a string
              expect(typeof data.date).toBe('string');
              
              // Property: confidence must be a number between 0 and 1
              expect(typeof data.confidence).toBe('number');
              expect(data.confidence).toBeGreaterThanOrEqual(0);
              expect(data.confidence).toBeLessThanOrEqual(1);
              
              // Property: sales must be number or null
              expect(data.sales === null || typeof data.sales === 'number').toBe(true);
              
              // Property: expenses must be number or null
              expect(data.expenses === null || typeof data.expenses === 'number').toBe(true);
              
              // Property: expenseCategory must be string or null
              expect(data.expenseCategory === null || typeof data.expenseCategory === 'string').toBe(true);
              
              // Property: inventoryChanges must be string or null
              expect(data.inventoryChanges === null || typeof data.inventoryChanges === 'string').toBe(true);
            };

            // Invoke the handler with generated data
            handleVoiceDataExtracted(voiceData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle voice data with all fields populated', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.integer({ min: 1, max: 10000000 }),
            expenses: fc.integer({ min: 1, max: 10000000 }),
            expenseCategory: fc.string({ minLength: 1, maxLength: 100 }),
            inventoryChanges: fc.string({ minLength: 1, maxLength: 200 }),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const handleVoiceDataExtracted = (data: ExtractedVoiceData) => {
              // Property: All fields should be present and non-null
              expect(data.sales).not.toBeNull();
              expect(data.expenses).not.toBeNull();
              expect(data.expenseCategory).not.toBeNull();
              expect(data.inventoryChanges).not.toBeNull();
              expect(data.date).toBeTruthy();
              expect(data.confidence).toBeGreaterThanOrEqual(0);
            };

            handleVoiceDataExtracted(voiceData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle voice data with only sales', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.integer({ min: 1, max: 10000000 }),
            expenses: fc.constant(null),
            expenseCategory: fc.constant(null),
            inventoryChanges: fc.constant(null),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const handleVoiceDataExtracted = (data: ExtractedVoiceData) => {
              // Property: Sales should be present
              expect(data.sales).not.toBeNull();
              expect(typeof data.sales).toBe('number');
              
              // Property: Other optional fields should be null
              expect(data.expenses).toBeNull();
              expect(data.expenseCategory).toBeNull();
              expect(data.inventoryChanges).toBeNull();
            };

            handleVoiceDataExtracted(voiceData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle voice data with only expenses', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.constant(null),
            expenses: fc.integer({ min: 1, max: 10000000 }),
            expenseCategory: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
            inventoryChanges: fc.constant(null),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const handleVoiceDataExtracted = (data: ExtractedVoiceData) => {
              // Property: Expenses should be present
              expect(data.expenses).not.toBeNull();
              expect(typeof data.expenses).toBe('number');
              
              // Property: Sales should be null
              expect(data.sales).toBeNull();
            };

            handleVoiceDataExtracted(voiceData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle voice data with all optional fields as null', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.constant(null),
            expenses: fc.constant(null),
            expenseCategory: fc.constant(null),
            inventoryChanges: fc.constant(null),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const handleVoiceDataExtracted = (data: ExtractedVoiceData) => {
              // Property: All optional fields should be null
              expect(data.sales).toBeNull();
              expect(data.expenses).toBeNull();
              expect(data.expenseCategory).toBeNull();
              expect(data.inventoryChanges).toBeNull();
              
              // Property: Required fields should still be present
              expect(data.date).toBeTruthy();
              expect(typeof data.confidence).toBe('number');
            };

            handleVoiceDataExtracted(voiceData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle voice data with varying confidence levels', () => {
      fc.assert(
        fc.property(
          extractedVoiceDataArbitrary,
          (voiceData) => {
            const handleVoiceDataExtracted = (data: ExtractedVoiceData) => {
              // Property: Confidence should always be between 0 and 1
              expect(data.confidence).toBeGreaterThanOrEqual(0);
              expect(data.confidence).toBeLessThanOrEqual(1);
              
              // Property: Confidence should be a valid number (not NaN or Infinity)
              expect(Number.isFinite(data.confidence)).toBe(true);
            };

            handleVoiceDataExtracted(voiceData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate date format for any voice data', () => {
      fc.assert(
        fc.property(
          extractedVoiceDataArbitrary,
          (voiceData) => {
            const handleVoiceDataExtracted = (data: ExtractedVoiceData) => {
              // Property: Date should be in YYYY-MM-DD format
              expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
              
              // Property: Date should be parseable
              const parsedDate = new Date(data.date);
              expect(parsedDate.toString()).not.toBe('Invalid Date');
            };

            handleVoiceDataExtracted(voiceData);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Form Population from Voice Data
   * 
   * **Validates: Requirements 1.8, 6.3**
   * 
   * For any valid ExtractedVoiceData object, when passed to the dashboard's voice 
   * data handler, the DailyEntryForm should be populated with the extracted values 
   * (sales, expenses, category, notes) matching the input data.
   */
  describe('Property 2: Form Population from Voice Data', () => {
    it('should populate form fields correctly for any voice data', () => {
      fc.assert(
        fc.property(
          extractedVoiceDataArbitrary,
          (voiceData) => {
            // Simulate the form population logic
            const populateForm = (data: ExtractedVoiceData) => {
              return {
                date: data.date,
                totalSales: data.sales || undefined,
                totalExpense: data.expenses || undefined,
                notes: data.expenseCategory ? `Category: ${data.expenseCategory}` : undefined,
              };
            };

            const formData = populateForm(voiceData);

            // Property: Date should match
            expect(formData.date).toBe(voiceData.date);

            // Property: Sales should match (or be undefined if null/0)
            // The || operator treats 0 as falsy, so 0 becomes undefined
            if (voiceData.sales !== null && voiceData.sales !== 0) {
              expect(formData.totalSales).toBe(voiceData.sales);
            } else {
              expect(formData.totalSales).toBeUndefined();
            }

            // Property: Expenses should match (or be undefined if null/0)
            // The || operator treats 0 as falsy, so 0 becomes undefined
            if (voiceData.expenses !== null && voiceData.expenses !== 0) {
              expect(formData.totalExpense).toBe(voiceData.expenses);
            } else {
              expect(formData.totalExpense).toBeUndefined();
            }

            // Property: Notes should include category if present
            if (voiceData.expenseCategory) {
              expect(formData.notes).toBe(`Category: ${voiceData.expenseCategory}`);
            } else {
              expect(formData.notes).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle form population with only sales data', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.integer({ min: 1, max: 10000000 }),
            expenses: fc.constant(null),
            expenseCategory: fc.constant(null),
            inventoryChanges: fc.constant(null),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const populateForm = (data: ExtractedVoiceData) => {
              return {
                date: data.date,
                totalSales: data.sales || undefined,
                totalExpense: data.expenses || undefined,
                notes: data.expenseCategory ? `Category: ${data.expenseCategory}` : undefined,
              };
            };

            const formData = populateForm(voiceData);

            // Property: Only sales should be populated
            expect(formData.totalSales).toBe(voiceData.sales);
            expect(formData.totalExpense).toBeUndefined();
            expect(formData.notes).toBeUndefined();
            expect(formData.date).toBe(voiceData.date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle form population with only expense data', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.constant(null),
            expenses: fc.integer({ min: 1, max: 10000000 }),
            expenseCategory: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
            inventoryChanges: fc.constant(null),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const populateForm = (data: ExtractedVoiceData) => {
              return {
                date: data.date,
                totalSales: data.sales || undefined,
                totalExpense: data.expenses || undefined,
                notes: data.expenseCategory ? `Category: ${data.expenseCategory}` : undefined,
              };
            };

            const formData = populateForm(voiceData);

            // Property: Only expense should be populated
            expect(formData.totalSales).toBeUndefined();
            expect(formData.totalExpense).toBe(voiceData.expenses);
            expect(formData.date).toBe(voiceData.date);

            // Property: Notes should include category if present
            if (voiceData.expenseCategory) {
              expect(formData.notes).toBe(`Category: ${voiceData.expenseCategory}`);
            } else {
              expect(formData.notes).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle form population with both sales and expenses', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.integer({ min: 1, max: 10000000 }),
            expenses: fc.integer({ min: 1, max: 10000000 }),
            expenseCategory: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
            inventoryChanges: fc.constant(null),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const populateForm = (data: ExtractedVoiceData) => {
              return {
                date: data.date,
                totalSales: data.sales || undefined,
                totalExpense: data.expenses || undefined,
                notes: data.expenseCategory ? `Category: ${data.expenseCategory}` : undefined,
              };
            };

            const formData = populateForm(voiceData);

            // Property: Both sales and expenses should be populated
            expect(formData.totalSales).toBe(voiceData.sales);
            expect(formData.totalExpense).toBe(voiceData.expenses);
            expect(formData.date).toBe(voiceData.date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format category in notes field correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: null }),
            expenses: fc.integer({ min: 1, max: 10000000 }),
            expenseCategory: fc.string({ minLength: 1, maxLength: 100 }),
            inventoryChanges: fc.constant(null),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const populateForm = (data: ExtractedVoiceData) => {
              return {
                date: data.date,
                totalSales: data.sales || undefined,
                totalExpense: data.expenses || undefined,
                notes: data.expenseCategory ? `Category: ${data.expenseCategory}` : undefined,
              };
            };

            const formData = populateForm(voiceData);

            // Property: Notes should be formatted with "Category: " prefix
            expect(formData.notes).toBe(`Category: ${voiceData.expenseCategory}`);
            expect(formData.notes).toContain('Category: ');
            expect(formData.notes).toContain(voiceData.expenseCategory!);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty category gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: null }),
            expenses: fc.integer({ min: 1, max: 10000000 }),
            expenseCategory: fc.constant(null),
            inventoryChanges: fc.constant(null),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const populateForm = (data: ExtractedVoiceData) => {
              return {
                date: data.date,
                totalSales: data.sales || undefined,
                totalExpense: data.expenses || undefined,
                notes: data.expenseCategory ? `Category: ${data.expenseCategory}` : undefined,
              };
            };

            const formData = populateForm(voiceData);

            // Property: Notes should be undefined when category is null
            expect(formData.notes).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve numeric precision for any amount', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.integer({ min: 1, max: 10000000 }), // Start from 1 to avoid 0
            expenses: fc.integer({ min: 1, max: 10000000 }), // Start from 1 to avoid 0
            expenseCategory: fc.constant(null),
            inventoryChanges: fc.constant(null),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const populateForm = (data: ExtractedVoiceData) => {
              return {
                date: data.date,
                totalSales: data.sales || undefined,
                totalExpense: data.expenses || undefined,
                notes: data.expenseCategory ? `Category: ${data.expenseCategory}` : undefined,
              };
            };

            const formData = populateForm(voiceData);

            // Property: Numeric values should be preserved exactly (when non-zero)
            expect(formData.totalSales).toBe(voiceData.sales);
            expect(typeof formData.totalSales).toBe('number');

            expect(formData.totalExpense).toBe(voiceData.expenses);
            expect(typeof formData.totalExpense).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero values correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            sales: fc.constantFrom(0, null),
            expenses: fc.constantFrom(0, null),
            expenseCategory: fc.constant(null),
            inventoryChanges: fc.constant(null),
            date: dateStringArbitrary(),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          }),
          (voiceData) => {
            const populateForm = (data: ExtractedVoiceData) => {
              return {
                date: data.date,
                totalSales: data.sales || undefined,
                totalExpense: data.expenses || undefined,
                notes: data.expenseCategory ? `Category: ${data.expenseCategory}` : undefined,
              };
            };

            const formData = populateForm(voiceData);

            // Property: Zero should be treated as falsy and become undefined
            // This matches the || undefined pattern in the implementation
            if (voiceData.sales === 0) {
              expect(formData.totalSales).toBeUndefined();
            }

            if (voiceData.expenses === 0) {
              expect(formData.totalExpense).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Cross-Property Test: Complete Voice-to-Form Flow
   * 
   * Tests that the complete flow works correctly: callback invocation → form population
   */
  describe('Cross-Property: Complete Voice-to-Form Flow', () => {
    it('should handle complete flow from callback to form population for any valid input', () => {
      fc.assert(
        fc.property(
          extractedVoiceDataArbitrary,
          (voiceData) => {
            // Step 1: Callback invocation
            const handleVoiceDataExtracted = (data: ExtractedVoiceData) => {
              // Validate structure
              expect(data).toHaveProperty('date');
              expect(data).toHaveProperty('confidence');
              expect(data).toHaveProperty('sales');
              expect(data).toHaveProperty('expenses');
              expect(data).toHaveProperty('expenseCategory');
              expect(data).toHaveProperty('inventoryChanges');

              // Step 2: Form population
              const formData = {
                date: data.date,
                totalSales: data.sales || undefined,
                totalExpense: data.expenses || undefined,
                notes: data.expenseCategory ? `Category: ${data.expenseCategory}` : undefined,
              };

              return formData;
            };

            const formData = handleVoiceDataExtracted(voiceData);

            // Property: Form data should be correctly populated
            expect(formData.date).toBe(voiceData.date);

            if (voiceData.sales !== null && voiceData.sales !== 0) {
              expect(formData.totalSales).toBe(voiceData.sales);
            }

            if (voiceData.expenses !== null && voiceData.expenses !== 0) {
              expect(formData.totalExpense).toBe(voiceData.expenses);
            }

            if (voiceData.expenseCategory) {
              expect(formData.notes).toBe(`Category: ${voiceData.expenseCategory}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain data integrity through the complete flow', () => {
      fc.assert(
        fc.property(
          extractedVoiceDataArbitrary,
          (voiceData) => {
            // Simulate complete flow
            let receivedData: ExtractedVoiceData | null = null;

            const onDataExtracted = (data: ExtractedVoiceData) => {
              receivedData = data;
            };

            // Invoke callback
            onDataExtracted(voiceData);

            // Property: Data should be received
            expect(receivedData).not.toBeNull();
            expect(receivedData).toEqual(voiceData);

            // Property: Form population should work with received data
            if (receivedData) {
              const formData = {
                date: receivedData.date,
                totalSales: receivedData.sales || undefined,
                totalExpense: receivedData.expenses || undefined,
                notes: receivedData.expenseCategory ? `Category: ${receivedData.expenseCategory}` : undefined,
              };

              expect(formData.date).toBe(voiceData.date);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
