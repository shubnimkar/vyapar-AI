// CSV validation utilities for Vyapar AI

import { FileType } from './types';

// Required columns for each file type
const REQUIRED_COLUMNS: Record<FileType, string[]> = {
  sales: ['date', 'product', 'quantity', 'amount'],
  expenses: ['date', 'category', 'amount', 'description'],
  inventory: ['product', 'quantity', 'cost_price', 'selling_price'],
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
  missingColumns?: string[];
}

/**
 * Validate CSV headers for a specific file type
 */
export function validateCSVHeaders(
  headers: string[],
  fileType: FileType
): ValidationResult {
  const requiredColumns = REQUIRED_COLUMNS[fileType];
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  const missingColumns = requiredColumns.filter(
    col => !normalizedHeaders.includes(col)
  );
  
  if (missingColumns.length > 0) {
    return {
      valid: false,
      errorCode: 'missing_columns',
      error: `Missing required columns: ${missingColumns.join(', ')}`,
      missingColumns,
    };
  }
  
  return { valid: true };
}

/**
 * Validate that CSV has data rows
 */
export function validateCSVData(rows: any[]): ValidationResult {
  if (!rows || rows.length === 0) {
    return {
      valid: false,
      errorCode: 'empty_file',
      error: 'CSV file is empty or contains no data rows',
    };
  }
  
  return { valid: true };
}

/**
 * Type guard for sales data
 */
export function isSalesRow(row: any): boolean {
  return (
    row.date !== undefined &&
    row.product !== undefined &&
    row.quantity !== undefined &&
    row.amount !== undefined
  );
}

/**
 * Type guard for expenses data
 */
export function isExpensesRow(row: any): boolean {
  return (
    row.date !== undefined &&
    row.category !== undefined &&
    row.amount !== undefined &&
    row.description !== undefined
  );
}

/**
 * Type guard for inventory data
 */
export function isInventoryRow(row: any): boolean {
  return (
    row.product !== undefined &&
    row.quantity !== undefined &&
    row.cost_price !== undefined &&
    row.selling_price !== undefined
  );
}

/**
 * Get validation error message in specified language
 */
export function getValidationErrorMessage(
  errorCode: string,
  language: 'en' | 'hi' | 'mr',
  details?: string
): string {
  const messages: Record<string, Record<string, string>> = {
    missing_columns: {
      en: `The CSV file is missing required columns: ${details}`,
      hi: `CSV फ़ाइल में आवश्यक कॉलम गायब हैं: ${details}`,
      mr: `CSV फाइलमध्ये आवश्यक कॉलम गहाळ आहेत: ${details}`,
    },
    empty_file: {
      en: 'The CSV file is empty or contains no data',
      hi: 'CSV फ़ाइल खाली है या इसमें कोई डेटा नहीं है',
      mr: 'CSV फाइल रिकामी आहे किंवा त्यात डेटा नाही',
    },
    invalid_format: {
      en: 'The CSV file format is incorrect. Please check and try again.',
      hi: 'CSV फ़ाइल का प्रारूप गलत है। कृपया जांचें और पुनः प्रयास करें।',
      mr: 'CSV फाइल फॉरमॅट चुकीचे आहे. कृपया तपासा आणि पुन्हा प्रयत्न करा.',
    },
    parse_failed: {
      en: 'Failed to parse CSV file. Please ensure it is a valid CSV format.',
      hi: 'CSV फ़ाइल को पार्स करने में विफल। कृपया सुनिश्चित करें कि यह एक मान्य CSV प्रारूप है।',
      mr: 'CSV फाइल पार्स करण्यात अयशस्वी. कृपया खात्री करा की ती वैध CSV फॉरमॅट आहे.',
    },
  };
  
  return messages[errorCode]?.[language] || messages[errorCode]?.['en'] || 'An error occurred';
}
