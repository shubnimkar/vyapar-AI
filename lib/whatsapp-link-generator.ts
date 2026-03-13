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

function getLocale(language: Language): string {
  switch (language) {
    case 'hi':
      return 'hi-IN';
    case 'mr':
      return 'mr-IN';
    default:
      return 'en-IN';
  }
}

function formatAmount(amount: number, language: Language): string {
  return new Intl.NumberFormat(getLocale(language), {
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDueDate(dueDate: string, language: Language): string {
  const parsedDate = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return dueDate;
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
}

function getShopReference(shopName: string | undefined, language: Language): string {
  const trimmedShopName = shopName?.trim();

  if (!trimmedShopName) {
    return '';
  }

  switch (language) {
    case 'hi':
      return `${trimmedShopName} की ओर से `;
    case 'mr':
      return `${trimmedShopName} कडून `;
    default:
      return `this is ${trimmedShopName}. `;
  }
}

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
  language: Language,
  shopName?: string
): string {
  const templateKey = `whatsapp.reminder.${language}`;
  const template = translations[templateKey]?.[language] || translations['whatsapp.reminder.en']['en'];

  const message = template
    .replace('{name}', () => customerName)
    .replace('{amount}', () => formatAmount(amount, language))
    .replace('{date}', () => formatDueDate(dueDate, language))
    .replace('{shopReference}', () => getShopReference(shopName, language));

  return message;
}

/**
 * Format phone number to international format for wa.me (91XXXXXXXXXX for India)
 * 
 * @param phoneNumber - 10-digit phone number (numeric only)
 * @returns Formatted phone number with 91 country code prefix and no plus sign
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
  
  // wa.me requires country code without a leading plus sign.
  return `91${cleaned}`;
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
  language: Language,
  shopName?: string
): string {
  const formattedPhone = formatPhoneNumber(phoneNumber);

  const message = getReminderMessage(customerName, amount, dueDate, language, shopName);

  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}
