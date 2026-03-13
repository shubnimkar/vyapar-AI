import { generateReminderLink, getReminderMessage } from '../whatsapp-link-generator';

describe('WhatsApp Link Generator - Unit Tests', () => {
  describe('getReminderMessage', () => {
    it('generates a polished English message with formatted amount and date', () => {
      const message = getReminderMessage('Rajesh Kumar', 5000, '2024-01-15', 'en');

      expect(message).toContain('Hello Rajesh Kumar');
      expect(message).toContain('₹5,000');
      expect(message).toContain('15 Jan 2024');
      expect(message).toContain('gentle reminder');
      expect(message).toContain('Thank you');
    });

    it('includes the shop name when provided', () => {
      const message = getReminderMessage('Rajesh Kumar', 5000, '2024-01-15', 'en', 'Sharma Kirana Store');

      expect(message).toContain('this is Sharma Kirana Store');
    });

    it('omits the shop intro when no shop name is available', () => {
      const message = getReminderMessage('Rajesh Kumar', 5000, '2024-01-15', 'en');

      expect(message).not.toContain('this is');
    });

    it('uses Hindi copy for Hindi reminders', () => {
      const message = getReminderMessage('राजेश कुमार', 5000, '2024-01-15', 'hi', 'शर्मा किराना स्टोर');

      expect(message).toContain('नमस्ते राजेश कुमार');
      expect(message).toContain('₹5,000');
      expect(message).toContain('2024');
      expect(message).toContain('अनुस्मारक');
      expect(message).toContain('शर्मा किराना स्टोर की ओर से');
      expect(message).not.toContain('Hello');
    });

    it('uses Marathi copy for Marathi reminders', () => {
      const message = getReminderMessage('संजय पाटील', 5000, '2024-01-15', 'mr', 'पाटील ट्रेडर्स');

      expect(message).toContain('नमस्कार संजय पाटील');
      expect(message).toContain('₹');
      expect(message).toMatch(/२०२४|2024/);
      expect(message).toContain('नम्र आठवण');
      expect(message).toContain('पाटील ट्रेडर्स कडून');
      expect(message).not.toContain('Hello');
      expect(message).not.toContain('नमस्ते');
    });

    it('preserves special characters in customer names', () => {
      const message = getReminderMessage("O'Brien & Sons", 5000, '2024-01-15', 'en');

      expect(message).toContain("O'Brien & Sons");
      expect(message).toContain('₹5,000');
    });

    it('formats year-boundary dates into a readable form', () => {
      const message = getReminderMessage('Test', 1000, '2023-12-31', 'en');

      expect(message).toContain('31 Dec 2023');
      expect(message).not.toContain('2023-12-31');
    });
  });

  describe('generateReminderLink', () => {
    it('uses wa.me with 91-prefixed phone numbers', () => {
      const url = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'en');

      expect(url).toContain('https://wa.me/919876543210');
      expect(url).not.toContain('+919876543210');
    });

    it('rejects invalid phone numbers', () => {
      expect(() => generateReminderLink('987654321', 'Test', 1000, '2024-01-15', 'en')).toThrow(
        'Invalid phone number length'
      );
      expect(() => generateReminderLink('987654321a', 'Test', 1000, '2024-01-15', 'en')).toThrow(
        'Invalid phone number: must contain only digits'
      );
    });

    it('accepts phone numbers with surrounding whitespace', () => {
      const url = generateReminderLink(' 9876543210 ', 'Test', 1000, '2024-01-15', 'en');

      expect(url).toContain('https://wa.me/919876543210');
    });

    it('produces a decodable URL whose text matches the generated message', () => {
      const url = generateReminderLink('9876543210', 'Test User', 1000, '2024-01-15', 'en', 'Test Shop');
      const textParam = url.split('?text=')[1];

      expect(textParam).toBeDefined();
      expect(textParam).not.toContain(' ');
      expect(decodeURIComponent(textParam)).toBe(
        getReminderMessage('Test User', 1000, '2024-01-15', 'en', 'Test Shop')
      );
    });

    it('keeps language-specific message bodies distinct', () => {
      const textEn = decodeURIComponent(
        generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'en').split('?text=')[1]
      );
      const textHi = decodeURIComponent(
        generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'hi').split('?text=')[1]
      );
      const textMr = decodeURIComponent(
        generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'mr').split('?text=')[1]
      );

      expect(textEn).toContain('Hello');
      expect(textHi).toContain('नमस्ते');
      expect(textMr).toContain('नमस्कार');
      expect(textEn).not.toBe(textHi);
      expect(textEn).not.toBe(textMr);
      expect(textHi).not.toBe(textMr);
    });

    it('formats large Indian currency amounts cleanly in the final URL', () => {
      const decoded = decodeURIComponent(
        generateReminderLink('9876543210', 'Test', 10000000, '2024-01-15', 'en').split('?text=')[1]
      );

      expect(decoded).toContain('₹1,00,00,000');
    });
  });
});
