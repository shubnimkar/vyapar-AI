// Input Sanitizer Service
// Sanitizes user input to prevent injection attacks

/**
 * Sanitizes text input by removing HTML tags and trimming whitespace
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  
  // Strip HTML tags
  const withoutHtml = stripHtml(input);
  
  // Trim whitespace
  return withoutHtml.trim();
}

/**
 * Sanitizes username by converting to lowercase and removing invalid characters
 */
export function sanitizeUsername(input: string): string {
  if (!input) return '';
  
  // Trim and lowercase
  return input.trim().toLowerCase();
}

/**
 * Sanitizes phone number by removing non-digit characters except + at start
 */
export function sanitizePhoneNumber(input: string): string {
  if (!input) return '';
  
  // Keep only digits and + at start
  const cleaned = input.trim();
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.slice(1).replace(/\D/g, '');
  }
  return cleaned.replace(/\D/g, '');
}

/**
 * Strips HTML tags from input string
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  
  // Remove HTML tags
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Detects SQL keywords in input (case-insensitive)
 */
export function detectSqlKeywords(input: string): boolean {
  if (!input) return false;
  
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'TRUNCATE', 'EXEC', 'EXECUTE', 'UNION', 'DECLARE', 'CAST'
  ];
  
  const upperInput = input.toUpperCase();
  
  return sqlKeywords.some(keyword => {
    // Check for keyword as whole word (with word boundaries)
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(upperInput);
  });
}

/**
 * Input Sanitizer class with all methods
 */
export class InputSanitizer {
  static sanitizeText = sanitizeText;
  static sanitizeUsername = sanitizeUsername;
  static sanitizePhoneNumber = sanitizePhoneNumber;
  static stripHtml = stripHtml;
  static detectSqlKeywords = detectSqlKeywords;
}

export default InputSanitizer;
