import fc from 'fast-check';
import { generateReminderLink, getReminderMessage } from '../whatsapp-link-generator';
import { Language } from '../types';

describe('WhatsApp Link Generator - Property Tests', () => {
  const phoneNumberArbitrary = fc
    .array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
    .map((digits) => digits.join(''));

  const customerNameArbitrary = fc.string({ minLength: 1, maxLength: 50 });
  const amountArbitrary = fc.integer({ min: 1, max: 1000000 });
  const dateArbitrary = fc
    .integer({ min: 2020, max: 2030 })
    .chain((year) =>
      fc.integer({ min: 1, max: 12 }).chain((month) =>
        fc
          .integer({ min: 1, max: 28 })
          .map((day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
      )
    );
  const languageArbitrary = fc.constantFrom<Language>('en', 'hi', 'mr');

  describe('URL structure', () => {
    it('always generates a valid wa.me URL with a decodable message', () => {
      fc.assert(
        fc.property(
          phoneNumberArbitrary,
          customerNameArbitrary,
          amountArbitrary,
          dateArbitrary,
          languageArbitrary,
          (phoneNumber, customerName, amount, dueDate, language) => {
            const url = generateReminderLink(phoneNumber, customerName, amount, dueDate, language);

            expect(url).toMatch(/^https:\/\/wa\.me\/91\d{10}\?text=.+$/);

            const textParam = url.split('?text=')[1];
            expect(textParam).toBeDefined();
            expect(textParam).not.toContain(' ');

            const decodedMessage = decodeURIComponent(textParam);
            expect(decodedMessage.length).toBeGreaterThan(0);
            expect(decodedMessage).toContain(customerName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('round-trips encoded text without losing content', () => {
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

            expect(decodedMessage).toBe(getReminderMessage(customerName, amount, dueDate, language));
            expect(encodeURIComponent(decodedMessage)).toBe(textParam);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('message content', () => {
    it('always includes the customer name and a rupee amount', () => {
      fc.assert(
        fc.property(customerNameArbitrary, amountArbitrary, dateArbitrary, languageArbitrary, (customerName, amount, dueDate, language) => {
          const message = getReminderMessage(customerName, amount, dueDate, language);

          expect(message).toContain(customerName);
          expect(message).toContain('₹');
          expect(message.length).toBeGreaterThan(20);
        }),
        { numRuns: 100 }
      );
    });

    it('keeps language-specific templates distinct', () => {
      fc.assert(
        fc.property(customerNameArbitrary, amountArbitrary, dateArbitrary, (customerName, amount, dueDate) => {
          const messageEn = getReminderMessage(customerName, amount, dueDate, 'en');
          const messageHi = getReminderMessage(customerName, amount, dueDate, 'hi');
          const messageMr = getReminderMessage(customerName, amount, dueDate, 'mr');

          expect(messageEn).toContain('Hello');
          expect(messageHi).toContain('नमस्ते');
          expect(messageMr).toContain('नमस्कार');

          expect(messageEn).not.toBe(messageHi);
          expect(messageEn).not.toBe(messageMr);
          expect(messageHi).not.toBe(messageMr);
        }),
        { numRuns: 100 }
      );
    });

    it('injects shop context when provided', () => {
      fc.assert(
        fc.property(customerNameArbitrary, amountArbitrary, dateArbitrary, languageArbitrary, (customerName, amount, dueDate, language) => {
          const message = getReminderMessage(customerName, amount, dueDate, language, 'Demo Shop');

          expect(message).toContain(customerName);

          if (language === 'en') {
            expect(message).toContain('Demo Shop');
            expect(message).toContain('this is Demo Shop');
          } else if (language === 'hi') {
            expect(message).toContain('Demo Shop की ओर से');
          } else {
            expect(message).toContain('Demo Shop कडून');
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
