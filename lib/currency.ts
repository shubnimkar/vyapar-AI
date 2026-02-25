// Currency formatting utilities for Indian Rupee

/**
 * Format a number as Indian Rupee currency
 * Example: 123456.78 -> ₹1,23,456.78
 */
export function formatCurrency(amount: number): string {
  // Handle invalid inputs
  if (isNaN(amount) || !isFinite(amount)) {
    return '₹0';
  }
  
  // Round to 2 decimal places
  const rounded = Math.round(amount * 100) / 100;
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = rounded.toFixed(2).split('.');
  
  // Format integer part with Indian numbering system
  // Indian system: X,XX,XXX (last 3 digits, then groups of 2)
  const formattedInteger = formatIndianNumber(integerPart);
  
  // Combine with rupee symbol
  return `₹${formattedInteger}.${decimalPart}`;
}

/**
 * Format integer part using Indian numbering system
 */
function formatIndianNumber(numStr: string): string {
  // Remove any existing commas
  numStr = numStr.replace(/,/g, '');
  
  // Handle negative numbers
  const isNegative = numStr.startsWith('-');
  if (isNegative) {
    numStr = numStr.substring(1);
  }
  
  // If less than 4 digits, no formatting needed
  if (numStr.length <= 3) {
    return isNegative ? `-${numStr}` : numStr;
  }
  
  // Get last 3 digits
  const lastThree = numStr.substring(numStr.length - 3);
  const remaining = numStr.substring(0, numStr.length - 3);
  
  // Format remaining digits in groups of 2
  const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  
  const result = `${formatted},${lastThree}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Format currency without decimal places
 * Example: 123456.78 -> ₹1,23,457
 */
export function formatCurrencyWhole(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = formatIndianNumber(rounded.toString());
  return `₹${formatted}`;
}

/**
 * Parse currency string back to number
 * Example: "₹1,23,456.78" -> 123456.78
 */
export function parseCurrency(currencyStr: string): number {
  // Remove rupee symbol and commas
  const cleaned = currencyStr.replace(/₹|,/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}
