/**
 * Design System Utility Functions
 * 
 * This file contains utility functions for the Vyapar AI design system.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with proper precedence
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 * 
 * @example
 * cn('px-4 py-2', 'px-6') // Returns 'py-2 px-6' (px-6 overrides px-4)
 * cn('text-red-500', condition && 'text-blue-500') // Conditional classes
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian format
 * Uses Intl.NumberFormat with 'en-IN' locale and INR currency
 * 
 * @example
 * formatCurrency(100000) // Returns '₹1,00,000'
 * formatCurrency(1234.56) // Returns '₹1,235' (rounded)
 * formatCurrency(-5000) // Returns '-₹5,000'
 * 
 * @param amount - The amount to format
 * @returns Formatted currency string with ₹ symbol
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage with 1 decimal place
 * 
 * @example
 * formatPercentage(45.678) // Returns '45.7%'
 * formatPercentage(100) // Returns '100.0%'
 * formatPercentage(-12.34) // Returns '-12.3%'
 * 
 * @param value - The percentage value to format
 * @returns Formatted percentage string with % symbol and 1 decimal place
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get financial text color class based on value
 * Returns Tailwind CSS class for text color
 * 
 * @example
 * getFinancialColor(1000) // Returns 'text-financial-profit' (green)
 * getFinancialColor(-500) // Returns 'text-financial-loss' (red)
 * getFinancialColor(0) // Returns 'text-financial-neutral' (gray)
 * 
 * @param value - The financial value
 * @returns Tailwind CSS text color class
 */
export function getFinancialColor(value: number): string {
  if (value > 0) return 'text-financial-profit';
  if (value < 0) return 'text-financial-loss';
  return 'text-financial-neutral';
}

/**
 * Get financial background color class based on value
 * Returns Tailwind CSS class for background color
 * 
 * @example
 * getFinancialBgColor(1000) // Returns 'bg-success-50' (light green)
 * getFinancialBgColor(-500) // Returns 'bg-error-50' (light red)
 * getFinancialBgColor(0) // Returns 'bg-neutral-50' (light gray)
 * 
 * @param value - The financial value
 * @returns Tailwind CSS background color class
 */
export function getFinancialBgColor(value: number): string {
  if (value > 0) return 'bg-success-50';
  if (value < 0) return 'bg-error-50';
  return 'bg-neutral-50';
}
