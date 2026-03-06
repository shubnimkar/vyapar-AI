// OCR Result Parser for Click-to-Add Transactions
// Transforms Lambda OCR output to InferredTransaction

import crypto from 'crypto';
import { InferredTransaction } from '../types';

export interface OCRLambdaResult {
  success: boolean;
  filename: string;
  extractedData: {
    date: string;
    amount: number;
    vendor: string;
    items: string[];
  };
  processedAt: string;
  processingTimeMs: number;
  method: string;
}

/**
 * Parse OCR Lambda result to InferredTransaction
 */
export function parseOCRResult(
  ocrResult: OCRLambdaResult,
  fileHash: string
): InferredTransaction {
  const { extractedData } = ocrResult;

  // Parse date to ISO format
  const parsedDate = parseDate(extractedData.date);

  // Infer category from vendor name
  const category = inferCategory(extractedData.vendor);

  // Generate deterministic ID
  const id = generateId(fileHash, extractedData);

  return {
    id,
    date: parsedDate,
    type: 'expense', // Default for receipts
    vendor_name: extractedData.vendor || 'Unknown Vendor',
    category,
    amount: extractedData.amount,
    source: 'receipt',
    created_at: new Date().toISOString(),
    raw_data: extractedData
  };
}

/**
 * Parse date string to ISO format (YYYY-MM-DD)
 * Supports: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
 */
function parseDate(dateStr: string): string {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0];
  }

  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (ddmmyyyyMatch) {
    const day = ddmmyyyyMatch[1].padStart(2, '0');
    const month = ddmmyyyyMatch[2].padStart(2, '0');
    const year = ddmmyyyyMatch[3];
    
    // Assume DD/MM/YYYY format (common in India)
    return `${year}-${month}-${day}`;
  }

  // Fallback to today
  return new Date().toISOString().split('T')[0];
}

/**
 * Infer category from vendor name keywords
 */
function inferCategory(vendorName: string): string | undefined {
  if (!vendorName) {
    return undefined;
  }

  const vendor = vendorName.toLowerCase();

  // Category keyword mappings
  const categoryMap: Record<string, string[]> = {
    'inventory': ['wholesale', 'supplier', 'distributor', 'mart', 'store'],
    'utilities': ['electricity', 'water', 'gas', 'internet', 'phone', 'telecom'],
    'rent': ['rent', 'lease', 'property'],
    'salary': ['salary', 'wages', 'payroll'],
    'transport': ['transport', 'fuel', 'petrol', 'diesel', 'taxi', 'uber'],
    'medical': ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor'],
    'food': ['restaurant', 'cafe', 'hotel', 'food', 'catering'],
    'maintenance': ['repair', 'maintenance', 'service', 'plumber', 'electrician']
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => vendor.includes(keyword))) {
      return category;
    }
  }

  return undefined;
}

/**
 * Generate deterministic ID from file hash and extracted data
 */
function generateId(fileHash: string, data: any): string {
  const normalized = {
    fileHash,
    date: data.date,
    amount: Math.round(data.amount * 100), // Convert to cents
    vendor: (data.vendor || '').toLowerCase().trim()
  };

  const hashInput = JSON.stringify(normalized, Object.keys(normalized).sort());
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  return `txn_${hash.substring(0, 16)}`;
}
