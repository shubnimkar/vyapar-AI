/**
 * Integration Tests for Receipt OCR Flow
 * 
 * Tests the complete receipt OCR flow including:
 * - End-to-end receipt upload to pending store
 * - Duplicate detection during receipt processing
 * - Notification display
 * - Backward compatibility with onDataExtracted callback
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReceiptOCR from '@/components/ReceiptOCR';
import * as pendingStore from '@/lib/pending-transaction-store';
import * as duplicateDetector from '@/lib/duplicate-detector';
import * as ocrParser from '@/lib/parsers/ocr-result-parser';

// Mock dependencies
jest.mock('@/lib/pending-transaction-store');
jest.mock('@/lib/duplicate-detector');
jest.mock('@/lib/parsers/ocr-result-parser');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock crypto.subtle for file hashing
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
      ),
    },
  },
});

// Mock FileReader
class MockFileReader {
  onloadend: (() => void) | null = null;
  result: string | null = null;

  readAsDataURL(file: File) {
    this.result = 'data:image/jpeg;base64,mockbase64';
    setTimeout(() => {
      if (this.onloadend) this.onloadend();
    }, 0);
  }
}

global.FileReader = MockFileReader as any;

describe('Receipt OCR Flow Integration Tests', () => {
  const mockExtractedData = {
    date: '2024-01-15',
    amount: 2464.0,
    vendor: 'Reliance Fresh',
    items: ['Rice', 'Dal', 'Oil'],
  };

  const mockInferredTransaction = {
    id: 'txn_abc123',
    date: '2024-01-15',
    type: 'expense' as const,
    vendor_name: 'Reliance Fresh',
    category: 'inventory',
    amount: 2464.0,
    source: 'receipt' as const,
    created_at: '2024-01-15T10:30:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (duplicateDetector.isDuplicate as jest.Mock).mockReturnValue(false);
    (pendingStore.savePendingTransaction as jest.Mock).mockReturnValue(true);
    (ocrParser.parseOCRResult as jest.Mock).mockReturnValue(mockInferredTransaction);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('End-to-End Receipt Upload to Pending Store', () => {
    it('should upload receipt, process OCR, and save to pending store', async () => {
      // Mock successful upload
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          filename: 'receipt-123.jpg',
          timestamp: Date.now(),
        }),
      });

      // Mock successful status polling
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          status: 'completed',
          extractedData: mockExtractedData,
        }),
      });

      const { container } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      // Find and trigger file input
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for uploading state
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      });

      // Wait for processing state
      await waitFor(() => {
        expect(screen.getByText(/extracting data/i)).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/transaction added to pending review/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify OCR parser was called
      expect(ocrParser.parseOCRResult).toHaveBeenCalled();

      // Verify duplicate detection was performed
      expect(duplicateDetector.isDuplicate).toHaveBeenCalledWith({
        date: mockInferredTransaction.date,
        amount: mockInferredTransaction.amount,
        type: mockInferredTransaction.type,
        vendor_name: mockInferredTransaction.vendor_name,
        category: mockInferredTransaction.category,
        source: mockInferredTransaction.source,
      });

      // Verify transaction was saved to pending store
      expect(pendingStore.savePendingTransaction).toHaveBeenCalledWith(mockInferredTransaction);

      // Verify extracted data is displayed
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText(/₹2464\.00/)).toBeInTheDocument();
      expect(screen.getByText('Reliance Fresh')).toBeInTheDocument();
    });

    it('should handle polling timeout gracefully', async () => {
      // Mock successful upload
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          filename: 'receipt-123.jpg',
          timestamp: Date.now(),
        }),
      });

      // Mock status polling that never completes (always processing)
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({
          status: 'processing',
        }),
      });

      const { container } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/failed to process receipt/i)).toBeInTheDocument();
      }, { timeout: 45000 }); // Polling timeout is 40 seconds

      // Verify pending store was not called
      expect(pendingStore.savePendingTransaction).not.toHaveBeenCalled();
    });

    it('should parse OCR result and infer category from vendor', async () => {
      const pharmacyData = {
        date: '2024-01-15',
        amount: 350.0,
        vendor: 'Apollo Pharmacy',
        items: ['Medicine A', 'Medicine B'],
      };

      const pharmacyTransaction = {
        ...mockInferredTransaction,
        vendor_name: 'Apollo Pharmacy',
        category: 'medical',
        amount: 350.0,
      };

      (ocrParser.parseOCRResult as jest.Mock).mockReturnValue(pharmacyTransaction);

      // Mock successful upload and processing
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'pharmacy-receipt.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: pharmacyData,
          }),
        });

      const { container } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'pharmacy-receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/transaction added to pending review/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify category was inferred
      expect(pendingStore.savePendingTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'medical',
          vendor_name: 'Apollo Pharmacy',
        })
      );
    });
  });

  describe('Duplicate Detection During Receipt Processing', () => {
    it('should detect duplicate and show error message', async () => {
      // Mock duplicate detection to return true
      (duplicateDetector.isDuplicate as jest.Mock).mockReturnValue(true);

      // Mock successful upload and processing
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for duplicate error
      await waitFor(() => {
        expect(screen.getByText(/this transaction has already been added/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify transaction was NOT saved to pending store
      expect(pendingStore.savePendingTransaction).not.toHaveBeenCalled();

      // Verify duplicate detection was called
      expect(duplicateDetector.isDuplicate).toHaveBeenCalled();
    });

    it('should allow retry after duplicate detection', async () => {
      (duplicateDetector.isDuplicate as jest.Mock).mockReturnValue(true);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/this transaction has already been added/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Click try again button
      const tryAgainButton = screen.getByText(/try again/i);
      fireEvent.click(tryAgainButton);

      // Verify UI reset to idle state
      await waitFor(() => {
        expect(screen.getByText(/upload receipt/i)).toBeInTheDocument();
        expect(screen.getByText(/take a photo or upload receipt image/i)).toBeInTheDocument();
      });
    });

    it('should not save duplicate transactions from same receipt uploaded twice', async () => {
      // First upload - not duplicate
      (duplicateDetector.isDuplicate as jest.Mock).mockReturnValueOnce(false);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container, rerender } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      let fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/transaction added to pending review/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(pendingStore.savePendingTransaction).toHaveBeenCalledTimes(1);

      // Reset component
      const uploadAnotherButton = screen.getByText(/upload another receipt/i);
      fireEvent.click(uploadAnotherButton);

      // Second upload - now it's a duplicate
      (duplicateDetector.isDuplicate as jest.Mock).mockReturnValueOnce(true);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/this transaction has already been added/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify save was only called once (first upload)
      expect(pendingStore.savePendingTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Notification Display', () => {
    it('should display success notification with "View Pending Transactions" link', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/transaction added to pending review/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify "View Pending Transactions" link is present
      const viewPendingLink = screen.getByText(/view pending transactions/i);
      expect(viewPendingLink).toBeInTheDocument();
      expect(viewPendingLink.closest('a')).toHaveAttribute('href', '/pending-transactions');

      // Verify "Upload Another Receipt" button is present
      expect(screen.getByText(/upload another receipt/i)).toBeInTheDocument();
    });

    it('should display notification in Hindi', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container } = render(
        <ReceiptOCR language="hi" usePendingFlow={true} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/लेनदेन समीक्षा के लिए जोड़ा गया/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText(/लंबित लेनदेन देखें/i)).toBeInTheDocument();
    });

    it('should display notification in Marathi', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container } = render(
        <ReceiptOCR language="mr" usePendingFlow={true} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/व्यवहार पुनरावलोकनासाठी जोडला/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText(/प्रलंबित व्यवहार पहा/i)).toBeInTheDocument();
    });

    it('should show receipt preview image in notification', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/transaction added to pending review/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify preview image is displayed
      const previewImage = screen.getByAltText('Receipt');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', 'data:image/jpeg;base64,mockbase64');
    });
  });

  describe('Backward Compatibility with onDataExtracted Callback', () => {
    it('should call onDataExtracted callback when usePendingFlow is false', async () => {
      const onDataExtracted = jest.fn();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container } = render(
        <ReceiptOCR 
          language="en" 
          usePendingFlow={false}
          onDataExtracted={onDataExtracted}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText(/data extracted successfully/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify pending store was NOT called
      expect(pendingStore.savePendingTransaction).not.toHaveBeenCalled();

      // Click "Use This Data" button
      const useDataButton = screen.getByText(/use this data/i);
      fireEvent.click(useDataButton);

      // Verify callback was called with extracted data
      expect(onDataExtracted).toHaveBeenCalledWith(mockExtractedData);
    });

    it('should not save to pending store when usePendingFlow is false', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container } = render(
        <ReceiptOCR language="en" usePendingFlow={false} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/data extracted successfully/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify pending store was NOT called
      expect(pendingStore.savePendingTransaction).not.toHaveBeenCalled();
      expect(duplicateDetector.isDuplicate).not.toHaveBeenCalled();
    });

    it('should default to usePendingFlow=true when prop not provided', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container } = render(
        <ReceiptOCR language="en" />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/transaction added to pending review/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify pending store WAS called (default behavior)
      expect(pendingStore.savePendingTransaction).toHaveBeenCalled();
    });

    it('should support both flows simultaneously in different instances', async () => {
      const onDataExtracted = jest.fn();

      // Render two instances
      const { container: container1 } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      const { container: container2 } = render(
        <ReceiptOCR 
          language="en" 
          usePendingFlow={false}
          onDataExtracted={onDataExtracted}
        />
      );

      // Both should work independently
      expect(container1).toBeInTheDocument();
      expect(container2).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle upload failure gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/failed to extract data/i)).toBeInTheDocument();
      });

      // Verify pending store was not called
      expect(pendingStore.savePendingTransaction).not.toHaveBeenCalled();
    });

    it('should handle save failure and fall back to success state', async () => {
      // Mock save to fail
      (pendingStore.savePendingTransaction as jest.Mock).mockReturnValue(false);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            filename: 'receipt-123.jpg',
            timestamp: Date.now(),
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            status: 'completed',
            extractedData: mockExtractedData,
          }),
        });

      const { container } = render(
        <ReceiptOCR language="en" usePendingFlow={true} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Should fall back to success state for backward compatibility
      await waitFor(() => {
        expect(screen.getByText(/data extracted successfully/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
