import { errorTranslations, getErrorMessage } from '../translations';
import { Language } from '../types';

describe('Error Translations', () => {
  describe('errorTranslations object', () => {
    test('should have all required error codes', () => {
      const requiredErrorCodes = [
        'errors.authRequired',
        'errors.invalidInput',
        'errors.notFound',
        'errors.serverError',
        'errors.rateLimitExceeded',
        'errors.bodyTooLarge',
        'errors.bedrockError',
        'errors.dynamodbError'
      ];

      requiredErrorCodes.forEach(code => {
        expect(errorTranslations[code]).toBeDefined();
      });
    });

    test('should have translations for all supported languages', () => {
      const languages: Language[] = ['en', 'hi', 'mr'];
      
      Object.keys(errorTranslations).forEach(key => {
        languages.forEach(lang => {
          expect(errorTranslations[key][lang]).toBeDefined();
          expect(errorTranslations[key][lang]).not.toBe('');
        });
      });
    });
  });

  describe('getErrorMessage function', () => {
    test('should return English message for English language', () => {
      const message = getErrorMessage('errors.authRequired', 'en');
      expect(message).toBe('Authentication required. Please log in.');
    });

    test('should return Hindi message for Hindi language', () => {
      const message = getErrorMessage('errors.authRequired', 'hi');
      expect(message).toBe('प्रमाणीकरण आवश्यक है। कृपया लॉग इन करें।');
    });

    test('should return Marathi message for Marathi language', () => {
      const message = getErrorMessage('errors.authRequired', 'mr');
      expect(message).toBe('प्रमाणीकरण आवश्यक आहे. कृपया लॉग इन करा.');
    });

    test('should fallback to English when translation not available', () => {
      const message = getErrorMessage('errors.authRequired', 'fr' as Language);
      expect(message).toBe('Authentication required. Please log in.');
    });

    test('should return default message for unknown error code', () => {
      const message = getErrorMessage('errors.unknownError', 'en');
      expect(message).toBe('An error occurred');
    });

    test('should handle all error codes correctly', () => {
      const errorCodes = [
        'errors.authRequired',
        'errors.invalidInput',
        'errors.notFound',
        'errors.serverError',
        'errors.rateLimitExceeded',
        'errors.bodyTooLarge',
        'errors.bedrockError',
        'errors.dynamodbError'
      ];

      errorCodes.forEach(code => {
        const enMessage = getErrorMessage(code, 'en');
        const hiMessage = getErrorMessage(code, 'hi');
        const mrMessage = getErrorMessage(code, 'mr');

        expect(enMessage).toBeTruthy();
        expect(hiMessage).toBeTruthy();
        expect(mrMessage).toBeTruthy();
        expect(enMessage).not.toBe(hiMessage);
        expect(enMessage).not.toBe(mrMessage);
      });
    });
  });
});
