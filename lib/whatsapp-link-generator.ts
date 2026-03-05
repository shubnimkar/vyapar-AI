/**
 * WhatsApp Link Generator for Udhaar Follow-up Helper
 * 
 * Generates properly encoded WhatsApp URLs with localized reminder messages.
 * Follows deterministic design principles - no AI, no network dependencies.
 * 
 * Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 3.8
 */

import { Language } from './types';
import { translations } from './translations';

/**
 * Get localized reminder message template with customer details
 * 
 * @param customerName - Name of the customer
 * @param amount - Amount owed in rupees
 * @param dueDate - Due date in ISO 8601 format (YYYY-MM-DD)
 * @param language - Language preference (en, hi, mr)
 * @returns Formatted reminder message in the specified language
 */
export function getReminderMessage(
  customerName: string,
  amount: number,
  dueDate: string,
  language: Language
): string {
  // Get the appropriate template based on language
  const templateKey = `whatsapp.reminder.${language}`;
  const template = translations[templateKey]?.[language] || translations['whatsapp.reminder.en']['en'];
  
  // Replace placeholders with actual values
  // Use a function replacer to avoid issues with special characters like $ in replacement strings
  const message = template
    .replace('{name}', () => customerName)
    .replace('{amount}', () => amount.toString())
    .replace('{date}', () => dueDate);
  
  return message;
}

/**
 * Format phone number to international format (+91XXXXXXXXXX for India)
 * 
 * @param phoneNumber - 10-digit phone number (numeric only)
 * @returns Formatted phone number with +91 prefix
 * @throws Error if phone number is invalid
 */
function formatPhoneNumber(phoneNumber: string): string {
  // Remove any whitespace
  const cleaned = phoneNumber.trim();
  
  // Validate: must be exactly 10 digits
  if (cleaned.length !== 10) {
    throw new Error(`Invalid phone number length: expected 10 digits, got ${cleaned.length}`);
  }
  
  // Validate: must be numeric only
  if (!/^\d{10}$/.test(cleaned)) {
    throw new Error('Invalid phone number: must contain only digits');
  }
  
  // Format as +91XXXXXXXXXX
  return `+91${cleaned}`;
}

/**
 * Generate WhatsApp reminder link with pre-filled message
 * 
 * Creates a WhatsApp URL that opens the WhatsApp app/web with a pre-filled
 * reminder message for the customer. The message is properly URL-encoded to
 * handle special characters and emojis.
 * 
 * @param phoneNumber - 10-digit phone number (numeric only)
 * @param customerName - Name of the customer
 * @param amount - Amount owed in rupees
 * @param dueDate - Due date in ISO 8601 format (YYYY-MM-DD)
 * @param language - Language preference (en, hi, mr)
 * @returns WhatsApp URL with encoded message
 * @throws Error if phone number is invalid
 */
export function generateReminderLink(
  phoneNumber: string,
  customerName: string,
  amount: number,
  dueDate: string,
  language: Language
): string {
  // Format phone number to international format
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  // Get localized reminder message
  const message = getReminderMessage(customerName, amount, dueDate, language);
  
  // URL encode the message to handle special characters and emojis
  const encodedMessage = encodeURIComponent(message);
  
  // Construct WhatsApp URL
  // Format: https://wa.me/{phone}?text={encoded_message}
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  
  return whatsappUrl;
}
