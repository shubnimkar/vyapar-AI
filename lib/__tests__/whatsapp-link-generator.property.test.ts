/**
 * Property-Based Tests for WhatsApp Link Generator
 * 
 * Uses fast-check to verify universal properties across all inputs.
 * Tests Properties 6, 8, and 9 from the design document.
 * 
 * Feature: udhaar-follow-up-helper
 */

import fc from 'fast-check';
import { generateReminderLink, getReminderMessage } from '../whatsapp-link-generator';
import { Language } from '../types';

describe('WhatsApp Link Generator - Property Tests', () => {
  // Custom arbitraries for test data generation
  const phoneNumberArbitrary = fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
    .map(digits => digits.join(''));
  
  // Use any string for customer names to test robustness
  const customerNameArbitrary = fc.string({ minLength: 1, maxLength: 50 });
  
  const amountArbitrary = fc.integer({ min: 1, max: 1000000 });
  
  // Generate valid ISO date strings
  const dateArbitrary = fc.integer({ min: 2020, max: 2030 })
    .chain(year => fc.integer({ min: 1, max: 12 })
      .chain(month => fc.integer({ min: 1, max: 28 }) // Use 28 to avoid invalid dates
        .map(day => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)));
  
  const languageArbitrary = fc.constantFrom<Language>('en', 'hi', 'mr');

  /**
   * Property 6: WhatsApp URL Structure
   * 
   * For any phone number, customer name, amount, due date, and language,
   * the generated WhatsApp URL should contain the properly formatted phone
   * number and URL-encoded message text.
   * 
   * Validates: Requirements 3.1
   */
  describe('Property 6: WhatsApp URL Structure', () => {
    it('should generate valid WhatsApp URL with formatted phone and encoded message', () => {
      fc.assert(
        fc.property(
          phoneNumberArbitrary,
          customerNameArbitrary,
          amountArbitrary,
          dateArbitrary,
          languageArbitrary,
          (phoneNumber, customerName, amount, dueDate, language) => {
            const url = generateReminderLink(phoneNumber, customerName, amount, dueDate, language);

            // Property: URL should start with WhatsApp base URL
            expect(url).toMatch(/^https:\/\/wa\.me\//);

            // Property: URL should contain formatted phone number (+91XXXXXXXXXX)
            expect(url).toContain(`+91${phoneNumber}`);

            // Property: URL should contain 'text=' query parameter
            expect(url).toContain('?text=');

            // Property: Message should be URL-encoded (no raw spaces)
            const textParam = url.split('?text=')[1];
            expect(textParam).toBeDefined();
            expect(textParam).not.toContain(' '); // Spaces should be encoded as %20

            // Property: URL should be decodable
            const decodedMessage = decodeURIComponent(textParam);
            expect(decodedMessage.length).toBeGreaterThan(0);

            // Property: Decoded message should contain customer name
            expect(decodedMessage).toContain(customerName);

            // Property: Decoded message should contain amount
            expect(decodedMessage).toContain(amount.toString());

            // Property: Decoded message should contain due date
            expect(decodedMessage).toContain(dueDate);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in customer name with proper encoding', () => {
      fc.assert(
        fc.property(
          phoneNumberArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }), // Allow any characters
          amountArbitrary,
          dateArbitrary,
          languageArbitrary,
          (phoneNumber, customerName, amount, dueDate, language) => {
            const url = generateReminderLink(phoneNumber, customerName, amount, dueDate, language);

            // Property: URL should be valid (no unencoded special chars in query)
            const textParam = url.split('?text=')[1];
            expect(textParam).toBeDefined();

            // Property: Should be decodable without errors
            expect(() => decodeURIComponent(textParam)).not.toThrow();

            // Property: Decoded message should contain original customer name
            const decodedMessage = decodeURIComponent(textParam);
            expect(decodedMessage).toContain(customerName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate consistent URL format across all inputs', () => {
      fc.assert(
        fc.property(
          phoneNumberArbitrary,
          customerNameArbitrary,
          amountArbitrary,
          dateArbitrary,
          languageArbitrary,
          (phoneNumber, customerName, amount, dueDate, language) => {
            const url = generateReminderLink(phoneNumber, customerName, amount, dueDate, language);

            // Property: URL should match expected format
            const urlPattern = /^https:\/\/wa\.me\/\+91\d{10}\?text=.+$/;
            expect(url).toMatch(urlPattern);

            // Property: Phone number should be exactly 10 digits after +91
            const phoneMatch = url.match(/\+91(\d+)/);
            expect(phoneMatch).toBeTruthy();
            expect(phoneMatch![1].substring(0, 10)).toBe(phoneNumber);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Reminder Message Content
   * 
   * For any customer name, amount, and due date, the generated reminder
   * message should include the customer name, the amount owed, and the due date.
   * 
   * Validates: Requirements 3.5
   */
  describe('Property 8: Reminder Message Content', () => {
    it('should include customer name, amount, and due date in message', () => {
      fc.assert(
        fc.property(
          customerNameArbitrary,
          amountArbitrary,
          dateArbitrary,
          languageArbitrary,
          (customerName, amount, dueDate, language) => {
            const message = getReminderMessage(customerName, amount, dueDate, language);

            // Property: Message should contain customer name
            expect(message).toContain(customerName);

            // Property: Message should contain amount
            expect(message).toContain(amount.toString());

            // Property: Message should contain due date
            expect(message).toContain(dueDate);

            // Property: Message should be non-empty
            expect(message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all input data without loss', () => {
      fc.assert(
        fc.property(
          customerNameArbitrary,
          amountArbitrary,
          dateArbitrary,
          languageArbitrary,
          (customerName, amount, dueDate, language) => {
            const message = getReminderMessage(customerName, amount, dueDate, language);

            // Property: All input values should be present in output
            const hasName = message.includes(customerName);
            const hasAmount = message.includes(amount.toString());
            const hasDate = message.includes(dueDate);

            expect(hasName && hasAmount && hasDate).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate non-empty message for all valid inputs', () => {
      fc.assert(
        fc.property(
          customerNameArbitrary,
          amountArbitrary,
          dateArbitrary,
          languageArbitrary,
          (customerName, amount, dueDate, language) => {
            const message = getReminderMessage(customerName, amount, dueDate, language);

            // Property: Message should always be non-empty
            expect(message.length).toBeGreaterThan(0);

            // Property: Message should contain meaningful content (not just whitespace)
            expect(message.trim().length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Language-Based Message Selection
   * 
   * For any language preference (English, Hindi, or Marathi), the WhatsApp
   * reminder message should use the message template corresponding to that language.
   * 
   * Validates: Requirements 3.6, 3.7, 3.8, 7.3
   */
  describe('Property 9: Language-Based Message Selection', () => {
    it('should use correct language template for each language', () => {
      fc.assert(
        fc.property(
          customerNameArbitrary,
          amountArbitrary,
          dateArbitrary,
          languageArbitrary,
          (customerName, amount, dueDate, language) => {
            const message = getReminderMessage(customerName, amount, dueDate, language);

            // Property: Message should contain language-specific keywords
            // English: "Hello", "reminder", "due since", "Thank you"
            // Hindi: "नमस्ते", "अनुस्मारक", "बकाया", "धन्यवाद"
            // Marathi: "नमस्कार", "स्मरणपत्र", "थकित", "धन्यवाद"

            if (language === 'en') {
              const hasEnglishKeywords = 
                message.includes('Hello') || 
                message.includes('reminder') || 
                message.includes('due since') ||
                message.includes('Thank you');
              expect(hasEnglishKeywords).toBe(true);
            } else if (language === 'hi') {
              const hasHindiKeywords = 
                message.includes('नमस्ते') || 
                message.includes('अनुस्मारक') || 
                message.includes('बकाया') ||
                message.includes('धन्यवाद');
              expect(hasHindiKeywords).toBe(true);
            } else if (language === 'mr') {
              const hasMarathiKeywords = 
                message.includes('नमस्कार') || 
                message.includes('स्मरणपत्र') || 
                message.includes('थकित') ||
                message.includes('धन्यवाद');
              expect(hasMarathiKeywords).toBe(true);
            }

            // Property: Message should always contain customer data regardless of language
            expect(message).toContain(customerName);
            expect(message).toContain(amount.toString());
            expect(message).toContain(dueDate);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different messages for different languages', () => {
      fc.assert(
        fc.property(
          customerNameArbitrary,
          amountArbitrary,
          dateArbitrary,
          (customerName, amount, dueDate) => {
            const messageEn = getReminderMessage(customerName, amount, dueDate, 'en');
            const messageHi = getReminderMessage(customerName, amount, dueDate, 'hi');
            const messageMr = getReminderMessage(customerName, amount, dueDate, 'mr');

            // Property: Messages in different languages should be different
            // (except for the data placeholders which are the same)
            expect(messageEn).not.toBe(messageHi);
            expect(messageEn).not.toBe(messageMr);
            expect(messageHi).not.toBe(messageMr);

            // Property: All messages should contain the same data
            [messageEn, messageHi, messageMr].forEach(message => {
              expect(message).toContain(customerName);
              expect(message).toContain(amount.toString());
              expect(message).toContain(dueDate);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent message structure across languages', () => {
      fc.assert(
        fc.property(
          customerNameArbitrary,
          amountArbitrary,
          dateArbitrary,
          languageArbitrary,
          (customerName, amount, dueDate, language) => {
            const message = getReminderMessage(customerName, amount, dueDate, language);

            // Property: Message should have reasonable length (not too short, not too long)
            expect(message.length).toBeGreaterThan(20); // Minimum reasonable message length
            expect(message.length).toBeLessThan(500); // Maximum reasonable message length

            // Property: Message should contain rupee symbol
            expect(message).toContain('₹');

            // Property: Message should contain all three data points
            const dataPoints = [customerName, amount.toString(), dueDate];
            const allPresent = dataPoints.every(data => message.includes(data));
            expect(allPresent).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: URL Encoding Consistency
   * 
   * Verifies that URL encoding is consistent and reversible.
   */
  describe('Additional Property: URL Encoding Consistency', () => {
    it('should produce reversible URL encoding', () => {
      fc.assert(
        fc.property(
          phoneNumberArbitrary,
          customerNameArbitrary,
          amountArbitrary,
          dateArbitrary,
          languageArbitrary,
          (phoneNumber, customerName, amount, dueDate, language) => {
            const url = generateReminderLink(phoneNumber, customerName, amount, dueDate, language);
            const textParam = url.split('?text=')[1];
            const decodedMessage = decodeURIComponent(textParam);
            const originalMessage = getReminderMessage(customerName, amount, dueDate, language);

            // Property: Decoded message should match original message
            expect(decodedMessage).toBe(originalMessage);

            // Property: Re-encoding should produce same result
            const reencoded = encodeURIComponent(decodedMessage);
            expect(reencoded).toBe(textParam);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
