// CSV Parser for Click-to-Add Transactions
// Extracts transactions from uploaded CSV files

import Papa from 'papaparse';
import crypto from 'crypto';
import { InferredTransaction, TransactionType } from '../types';

export interface ParsedCSVData {
  headers: string[];
  rows: Record<string, string | number>[];
  validCount: number;
  invalidCount: number;
  errors: string[];
}

export interface CSVParseResult {
  transactions: InferredTransaction[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: string[];
  };
}

/**
 * Parse CSV file content to InferredTransaction array
 */
export function parseCSV(csvContent: string): CSVParseResult {
  const errors: string[] = [];
  const transactions: InferredTransaction[] = [];

  // Parse CSV using papaparse
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim()
  });

  if (parseResult.errors.length > 0) {
    parseResult.errors.forEach(err => {
      errors.push(`Row ${err.row}: ${err.message}`);
    });
  }

  const rows = parseResult.data as Record<string, any>[];
  
  // Detect and map headers
  const headerMap = detectHeaders(parseResult.meta.fields || []);

  // Validate required headers
  if (!headerMap.has('date') || !headerMap.has('amount') || !headerMap.has('type')) {
    return {
      transactions: [],
      summary: {
        totalRows: rows.length,
        validRows: 0,
        invalidRows: rows.length,
        errors: ['CSV file must contain "date", "amount", and "type" columns']
      }
    };
  }

  // Parse each row
  rows.forEach((row, index) => {
    try {
      const transaction = parseRow(row, headerMap, index);
      if (transaction) {
        transactions.push(transaction);
      } else {
        errors.push(`Row ${index + 1}: Missing required fields`);
      }
    } catch (error) {
      errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  });

  return {
    transactions,
    summary: {
      totalRows: rows.length,
      validRows: transactions.length,
      invalidRows: rows.length - transactions.length,
      errors
    }
  };
}

/**
 * Detect and map CSV headers to standard fields
 */
function detectHeaders(headers: string[]): Map<string, string> {
  const headerMap = new Map<string, string>();

  const mappings: Record<string, string[]> = {
    date: ['date', 'transaction date', 'txn_date', 'transaction_date', 'txndate', 'date (yyyy-mm-dd)', 'date (e.g. 2024-01-15)'],
    amount: ['amount', 'value', 'total', 'price', 'sum', 'amount (e.g. 5000)', 'amount (in rupees)'],
    type: ['type', 'transaction_type', 'txn_type', 'transaction type', 'type (sale or expense)', 'type (sale/expense)'],
    vendor_name: ['vendor', 'merchant', 'shop', 'vendor_name', 'merchant_name', 'vendor name', 'merchant name', 'vendor_name (e.g. ramesh traders)', 'vendor / customer name', 'vendor_name (supplier or payee)'],
    category: ['category', 'expense_category', 'expense_type', 'expense category', 'category (e.g. grocery)', 'category (e.g. inventory)', 'category (e.g. inventory / rent / utilities)']
  };

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();

    for (const [standardField, variations] of Object.entries(mappings)) {
      if (variations.includes(normalized)) {
        headerMap.set(standardField, header);
        break;
      }
    }
  }

  return headerMap;
}

/**
 * Parse single CSV row to InferredTransaction
 */
function parseRow(
  row: Record<string, any>,
  headerMap: Map<string, string>,
  rowIndex: number
): InferredTransaction | null {
  // Extract fields using header map
  const dateHeader = headerMap.get('date');
  const amountHeader = headerMap.get('amount');
  const typeHeader = headerMap.get('type');
  const vendorHeader = headerMap.get('vendor_name');
  const categoryHeader = headerMap.get('category');

  if (!dateHeader || !amountHeader || !typeHeader) {
    return null;
  }

  const dateStr = row[dateHeader];
  const amountStr = row[amountHeader];
  const typeStr = row[typeHeader];

  // Parse required fields
  const date = parseDate(dateStr);
  const amount = parseAmount(amountStr);
  const type = parseType(typeStr);

  if (!date || amount === null || !type) {
    return null;
  }

  // Parse optional fields
  const vendor_name = vendorHeader ? String(row[vendorHeader] || '').trim() : undefined;
  const category = categoryHeader ? String(row[categoryHeader] || '').trim() : undefined;

  // Generate deterministic ID
  const id = generateId(row, rowIndex);

  return {
    id,
    date,
    type,
    vendor_name: vendor_name || undefined,
    category: category || undefined,
    amount,
    source: 'csv',
    created_at: new Date().toISOString(),
    raw_data: row
  };
}

/**
 * Parse date with multiple format attempts
 */
function parseDate(dateStr: any): string | null {
  if (!dateStr) {
    return null;
  }

  const str = String(dateStr).trim();

  // Try ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (ddmmyyyyMatch) {
    const day = ddmmyyyyMatch[1].padStart(2, '0');
    const month = ddmmyyyyMatch[2].padStart(2, '0');
    const year = ddmmyyyyMatch[3];
    
    // Assume DD/MM/YYYY format (common in India)
    return `${year}-${month}-${day}`;
  }

  // Try MM/DD/YYYY (US format) - less common but supported
  const mmddyyyyMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (mmddyyyyMatch) {
    const month = mmddyyyyMatch[1].padStart(2, '0');
    const day = mmddyyyyMatch[2].padStart(2, '0');
    const year = mmddyyyyMatch[3];
    
    // Try to distinguish between DD/MM and MM/DD
    // If day > 12, it must be DD/MM format
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    
    if (dayNum > 12) {
      return `${year}-${month}-${day}`;
    } else if (monthNum > 12) {
      return `${year}-${day}-${month}`;
    } else {
      // Ambiguous - default to DD/MM (Indian format)
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Parse amount (remove currency symbols, handle decimals)
 */
function parseAmount(amountStr: any): number | null {
  if (amountStr === null || amountStr === undefined || amountStr === '') {
    return null;
  }

  let str = String(amountStr).trim();

  // Handle negative amounts (prefix - or suffix ())
  const isNegative = str.startsWith('-') || (str.startsWith('(') && str.endsWith(')'));
  
  // Remove currency symbols (but not decimal point)
  str = str.replace(/₹/g, '').replace(/Rs\.?/gi, '').replace(/INR/gi, '').replace(/\$/g, '').trim();

  // Remove thousand separators (commas) but keep decimal point
  str = str.replace(/,/g, '');
  
  // Remove parentheses and minus sign for parsing
  str = str.replace(/[()-]/g, '');

  // Parse as float
  const amount = parseFloat(str);

  if (isNaN(amount)) {
    return null;
  }

  return isNegative ? -amount : amount;
}

/**
 * Map transaction type from various values
 */
function parseType(typeStr: any): TransactionType | null {
  if (!typeStr) {
    return null;
  }

  const str = String(typeStr).toLowerCase().trim();

  // Map to expense
  if (['expense', 'debit', 'withdrawal', 'payment', 'out'].includes(str)) {
    return 'expense';
  }

  // Map to sale
  if (['sale', 'credit', 'deposit', 'income', 'in', 'sales'].includes(str)) {
    return 'sale';
  }

  return null;
}

/**
 * Generate deterministic ID for CSV row
 */
function generateId(row: Record<string, any>, rowIndex: number): string {
  const normalized = {
    rowIndex,
    date: row.date || row.Date || row['Transaction Date'] || '',
    amount: row.amount || row.Amount || row.Value || 0,
    type: row.type || row.Type || '',
    vendor: row.vendor || row.Vendor || row.merchant || ''
  };

  const hashInput = JSON.stringify(normalized, Object.keys(normalized).sort());
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  return `txn_${hash.substring(0, 16)}`;
}
