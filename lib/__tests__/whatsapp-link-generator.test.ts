/**
 * Unit Tests for WhatsApp Link Generator
 * 
 * Tests specific examples, edge cases, and error conditions.
 * Complements property-based tests with concrete scenarios.
 * 
 * Feature: udhaar-follow-up-helper
 * Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 3.8
 */

import { generateReminderLink, getReminderMessage } from '../whatsapp-link-generator';
import { Language } from '../types';

describe('WhatsApp Link Generator - Unit Tests', () => {
  describe('getReminderMessage', () => {
    describe('English messages', () => {
      it('should generate correct English message with all details', () => {
        const message = getReminderMessage('Rajesh Kumar', 5000, '2024-01-15', 'en');
        
        expect(message).toContain('Hello Rajesh Kumar');
        expect(message).toContain('₹5000');
        expect(message).toContain('2024-01-15');
        expect(message).toContain('reminder');
        expect(message).toContain('Thank you');
      });

      it('should handle customer name with spaces', () => {
        const message = getReminderMessage('Amit Kumar Singh', 1000, '2024-02-01', 'en');
        
        expect(message).toContain('Amit Kumar Singh');
        expect(message).toContain('₹1000');
      });

      it('should handle large amounts', () => {
        const message = getReminderMessage('Priya', 999999, '2024-03-01', 'en');
        
        expect(message).toContain('₹999999');
        expect(message).toContain('Priya');
      });

      it('should handle small amounts', () => {
        const message = getReminderMessage('Suresh', 1, '2024-04-01', 'en');
        
        expect(message).toContain('₹1');
        expect(message).toContain('Suresh');
      });
    });

    describe('Hindi messages', () => {
      it('should generate correct Hindi message with all details', () => {
        const message = getReminderMessage('राजेश कुमार', 5000, '2024-01-15', 'hi');
        
        expect(message).toContain('नमस्ते राजेश कुमार');
        expect(message).toContain('₹5000');
        expect(message).toContain('2024-01-15');
        expect(message).toContain('अनुस्मारक');
        expect(message).toContain('धन्यवाद');
      });

      it('should handle Hindi customer names', () => {
        const message = getReminderMessage('अमित शर्मा', 2500, '2024-02-01', 'hi');
        
        expect(message).toContain('अमित शर्मा');
        expect(message).toContain('₹2500');
      });

      it('should use Hindi text for all labels', () => {
        const message = getReminderMessage('Test', 1000, '2024-01-01', 'hi');
        
        // Should contain Hindi keywords
        expect(message).toContain('नमस्ते');
        expect(message).toContain('बकाया');
        
        // Should NOT contain English keywords
        expect(message).not.toContain('Hello');
        expect(message).not.toContain('reminder');
      });
    });

    describe('Marathi messages', () => {
      it('should generate correct Marathi message with all details', () => {
        const message = getReminderMessage('संजय पाटील', 5000, '2024-01-15', 'mr');
        
        expect(message).toContain('नमस्कार संजय पाटील');
        expect(message).toContain('₹5000');
        expect(message).toContain('2024-01-15');
        expect(message).toContain('स्मरणपत्र');
        expect(message).toContain('धन्यवाद');
      });

      it('should handle Marathi customer names', () => {
        const message = getReminderMessage('प्रिया देशमुख', 3000, '2024-02-01', 'mr');
        
        expect(message).toContain('प्रिया देशमुख');
        expect(message).toContain('₹3000');
      });

      it('should use Marathi text for all labels', () => {
        const message = getReminderMessage('Test', 1000, '2024-01-01', 'mr');
        
        // Should contain Marathi keywords
        expect(message).toContain('नमस्कार');
        expect(message).toContain('थकित');
        
        // Should NOT contain English or Hindi keywords
        expect(message).not.toContain('Hello');
        expect(message).not.toContain('नमस्ते');
      });
    });

    describe('Special characters handling', () => {
      it('should handle customer names with special characters', () => {
        const message = getReminderMessage("O'Brien & Sons", 5000, '2024-01-15', 'en');
        
        expect(message).toContain("O'Brien & Sons");
        expect(message).toContain('₹5000');
      });

      it('should handle customer names with parentheses', () => {
        const message = getReminderMessage('Rajesh (Shop)', 2000, '2024-01-15', 'en');
        
        expect(message).toContain('Rajesh (Shop)');
      });

      it('should handle customer names with hyphens', () => {
        const message = getReminderMessage('Kumar-Sharma Store', 3000, '2024-01-15', 'en');
        
        expect(message).toContain('Kumar-Sharma Store');
      });

      it('should handle customer names with dots', () => {
        const message = getReminderMessage('M.K. Traders', 4000, '2024-01-15', 'en');
        
        expect(message).toContain('M.K. Traders');
      });
    });

    describe('Date formats', () => {
      it('should handle ISO date format', () => {
        const message = getReminderMessage('Test', 1000, '2024-12-31', 'en');
        
        expect(message).toContain('2024-12-31');
      });

      it('should handle dates at start of year', () => {
        const message = getReminderMessage('Test', 1000, '2024-01-01', 'en');
        
        expect(message).toContain('2024-01-01');
      });

      it('should handle dates at end of year', () => {
        const message = getReminderMessage('Test', 1000, '2024-12-31', 'en');
        
        expect(message).toContain('2024-12-31');
      });
    });
  });

  describe('generateReminderLink', () => {
    describe('Phone number validation', () => {
      it('should accept valid 10-digit phone number', () => {
        const url = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'en');
        
        expect(url).toContain('+919876543210');
      });

      it('should reject phone number with less than 10 digits', () => {
        expect(() => {
          generateReminderLink('987654321', 'Test', 1000, '2024-01-15', 'en');
        }).toThrow('Invalid phone number length');
      });

      it('should reject phone number with more than 10 digits', () => {
        expect(() => {
          generateReminderLink('98765432101', 'Test', 1000, '2024-01-15', 'en');
        }).toThrow('Invalid phone number length');
      });

      it('should reject phone number with non-numeric characters', () => {
        expect(() => {
          generateReminderLink('987654321a', 'Test', 1000, '2024-01-15', 'en');
        }).toThrow('Invalid phone number: must contain only digits');
      });

      it('should reject phone number with spaces', () => {
        expect(() => {
          generateReminderLink('9876 543210', 'Test', 1000, '2024-01-15', 'en');
        }).toThrow('Invalid phone number');
      });

      it('should reject phone number with hyphens', () => {
        expect(() => {
          generateReminderLink('9876-543210', 'Test', 1000, '2024-01-15', 'en');
        }).toThrow('Invalid phone number');
      });

      it('should reject phone number with special characters', () => {
        expect(() => {
          generateReminderLink('9876543@10', 'Test', 1000, '2024-01-15', 'en');
        }).toThrow('Invalid phone number: must contain only digits');
      });

      it('should handle phone number with leading/trailing whitespace', () => {
        const url = generateReminderLink(' 9876543210 ', 'Test', 1000, '2024-01-15', 'en');
        
        expect(url).toContain('+919876543210');
      });
    });

    describe('URL structure', () => {
      it('should generate URL with correct base', () => {
        const url = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'en');
        
        expect(url).toMatch(/^https:\/\/wa\.me\//);
      });

      it('should format phone number with +91 prefix', () => {
        const url = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'en');
        
        expect(url).toContain('+919876543210');
      });

      it('should include text query parameter', () => {
        const url = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'en');
        
        expect(url).toContain('?text=');
      });

      it('should have exactly one question mark', () => {
        const url = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'en');
        
        const questionMarkCount = (url.match(/\?/g) || []).length;
        expect(questionMarkCount).toBe(1);
      });
    });

    describe('URL encoding', () => {
      it('should URL-encode spaces in message', () => {
        const url = generateReminderLink('9876543210', 'Test User', 1000, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        expect(textParam).not.toContain(' ');
        expect(textParam).toContain('%20');
      });

      it('should URL-encode special characters', () => {
        const url = generateReminderLink('9876543210', "O'Brien & Co.", 1000, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        expect(textParam).toContain('%26'); // & encoded
      });

      it('should URL-encode rupee symbol', () => {
        const url = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        expect(textParam).toContain('%E2%82%B9'); // ₹ encoded
      });

      it('should URL-encode Hindi characters', () => {
        const url = generateReminderLink('9876543210', 'राजेश', 1000, '2024-01-15', 'hi');
        
        const textParam = url.split('?text=')[1];
        // Hindi characters should be encoded
        expect(textParam).toMatch(/%[0-9A-F]{2}/);
      });

      it('should URL-encode Marathi characters', () => {
        const url = generateReminderLink('9876543210', 'संजय', 1000, '2024-01-15', 'mr');
        
        const textParam = url.split('?text=')[1];
        // Marathi characters should be encoded
        expect(textParam).toMatch(/%[0-9A-F]{2}/);
      });

      it('should produce decodable URL', () => {
        const url = generateReminderLink('9876543210', 'Test User', 1000, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('Test User');
        expect(decoded).toContain('₹1000');
      });
    });

    describe('Language-specific URLs', () => {
      it('should generate English URL correctly', () => {
        const url = generateReminderLink('9876543210', 'Rajesh', 5000, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('Hello');
        expect(decoded).toContain('Rajesh');
        expect(decoded).toContain('₹5000');
      });

      it('should generate Hindi URL correctly', () => {
        const url = generateReminderLink('9876543210', 'राजेश', 5000, '2024-01-15', 'hi');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('नमस्ते');
        expect(decoded).toContain('राजेश');
        expect(decoded).toContain('₹5000');
      });

      it('should generate Marathi URL correctly', () => {
        const url = generateReminderLink('9876543210', 'संजय', 5000, '2024-01-15', 'mr');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('नमस्कार');
        expect(decoded).toContain('संजय');
        expect(decoded).toContain('₹5000');
      });
    });

    describe('Large amounts formatting', () => {
      it('should handle amounts in lakhs', () => {
        const url = generateReminderLink('9876543210', 'Test', 100000, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('₹100000');
      });

      it('should handle amounts in crores', () => {
        const url = generateReminderLink('9876543210', 'Test', 10000000, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('₹10000000');
      });

      it('should handle maximum safe integer', () => {
        const url = generateReminderLink('9876543210', 'Test', 999999999, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('₹999999999');
      });
    });

    describe('Integration scenarios', () => {
      it('should generate complete working URL for typical use case', () => {
        const url = generateReminderLink('9876543210', 'Rajesh Kumar', 5000, '2024-01-15', 'en');
        
        // Verify URL structure
        expect(url).toMatch(/^https:\/\/wa\.me\/\+919876543210\?text=.+$/);
        
        // Verify message content
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('Hello Rajesh Kumar');
        expect(decoded).toContain('₹5000');
        expect(decoded).toContain('2024-01-15');
        expect(decoded).toContain('Thank you');
      });

      it('should generate URL that can be opened in WhatsApp', () => {
        const url = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'en');
        
        // URL should be valid for WhatsApp web/app
        expect(url).toMatch(/^https:\/\/wa\.me\/\+91\d{10}\?text=.+$/);
        
        // Should not contain any unencoded special characters in query
        const queryPart = url.split('?')[1];
        expect(queryPart).not.toContain(' ');
        expect(queryPart).not.toContain('\n');
      });

      it('should handle all three languages in sequence', () => {
        const urlEn = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'en');
        const urlHi = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'hi');
        const urlMr = generateReminderLink('9876543210', 'Test', 1000, '2024-01-15', 'mr');
        
        // All should have same phone number
        expect(urlEn).toContain('+919876543210');
        expect(urlHi).toContain('+919876543210');
        expect(urlMr).toContain('+919876543210');
        
        // Messages should be different
        const textEn = urlEn.split('?text=')[1];
        const textHi = urlHi.split('?text=')[1];
        const textMr = urlMr.split('?text=')[1];
        
        expect(textEn).not.toBe(textHi);
        expect(textEn).not.toBe(textMr);
        expect(textHi).not.toBe(textMr);
      });
    });

    describe('Edge cases', () => {
      it('should handle customer name with only one character', () => {
        const url = generateReminderLink('9876543210', 'A', 1000, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('A');
      });

      it('should handle very long customer names', () => {
        const longName = 'A'.repeat(100);
        const url = generateReminderLink('9876543210', longName, 1000, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain(longName);
      });

      it('should handle amount of 1 rupee', () => {
        const url = generateReminderLink('9876543210', 'Test', 1, '2024-01-15', 'en');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('₹1');
      });

      it('should handle dates at year boundaries', () => {
        const url = generateReminderLink('9876543210', 'Test', 1000, '2023-12-31', 'en');
        
        const textParam = url.split('?text=')[1];
        const decoded = decodeURIComponent(textParam);
        
        expect(decoded).toContain('2023-12-31');
      });
    });
  });
});
