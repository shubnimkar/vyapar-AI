'use client';

import { useState, useRef } from 'react';
import { Language } from '@/lib/types';
import { Upload, FileText, CheckCircle, XCircle, Download } from 'lucide-react';
import { savePendingTransaction } from '@/lib/pending-transaction-store';
import { isDuplicate } from '@/lib/duplicate-detector';
import { InferredTransaction } from '@/lib/types';
import { getDemoDataPaths } from '@/lib/demo-data-index';
import { resolveProfileForDemoData } from '@/lib/demo-profile-resolver';

interface CSVUploadProps {
  language: Language;
  onUploadSuccess?: (summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  }) => void;
  onUploadError?: (error: string) => void;
}

/**
 * CSVUpload Component
 * 
 * Handles CSV file uploads for bulk transaction import.
 * Features:
 * - File input with drag-and-drop support
 * - File size validation (5MB max)
 * - Upload progress indicator
 * - Success message with transaction count summary
 * - Error handling with user-friendly messages
 * - Multi-language support (en, hi, mr)
 */
export default function CSVUpload({
  language,
  onUploadSuccess,
  onUploadError,
}: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    summary?: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
    };
    error?: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const translations = {
    en: {
      title: 'Upload CSV File',
      description: 'Import multiple transactions from a CSV file',
      dragDrop: 'Drag and drop your CSV file here, or',
      browse: 'browse',
      maxSize: 'Maximum file size: 5MB',
      uploading: 'Uploading...',
      successTitle: 'Upload Successful!',
      successMessage: 'transactions imported',
      validRows: 'Valid',
      invalidRows: 'Invalid',
      errorTitle: 'Upload Failed',
      tryAgain: 'Try Again',
      trySampleData: 'Try Sample Data',
      sampleDataDesc: 'Load 90 days of realistic demo data to see AI insights',
      downloadTemplate: 'Download CSV Template',
    },
    hi: {
      title: 'CSV फ़ाइल अपलोड करें',
      description: 'CSV फ़ाइल से कई लेनदेन आयात करें',
      dragDrop: 'अपनी CSV फ़ाइल यहाँ खींचें और छोड़ें, या',
      browse: 'ब्राउज़ करें',
      maxSize: 'अधिकतम फ़ाइल आकार: 5MB',
      uploading: 'अपलोड हो रहा है...',
      successTitle: 'अपलोड सफल!',
      successMessage: 'लेनदेन आयात किए गए',
      validRows: 'मान्य',
      invalidRows: 'अमान्य',
      errorTitle: 'अपलोड विफल',
      tryAgain: 'पुनः प्रयास करें',
      trySampleData: 'नमूना डेटा आज़माएं',
      sampleDataDesc: 'AI इनसाइट्स देखने के लिए 90 दिनों का डेमो डेटा लोड करें',
      downloadTemplate: 'CSV टेम्पलेट डाउनलोड करें',
    },
    mr: {
      title: 'CSV फाइल अपलोड करा',
      description: 'CSV फाइलमधून अनेक व्यवहार आयात करा',
      dragDrop: 'तुमची CSV फाइल येथे ड्रॅग आणि ड्रॉप करा, किंवा',
      browse: 'ब्राउझ करा',
      maxSize: 'कमाल फाइल आकार: 5MB',
      uploading: 'अपलोड होत आहे...',
      successTitle: 'अपलोड यशस्वी!',
      successMessage: 'व्यवहार आयात केले',
      validRows: 'वैध',
      invalidRows: 'अवैध',
      errorTitle: 'अपलोड अयशस्वी',
      tryAgain: 'पुन्हा प्रयत्न करा',
      trySampleData: 'नमुना डेटा वापरा',
      sampleDataDesc: 'AI इनसाइट्स पाहण्यासाठी 90 दिवसांचा डेमो डेटा लोड करा',
      downloadTemplate: 'CSV टेम्पलेट डाउनलोड करा',
    },
  };

  const t = translations[language];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Reset previous result
    setUploadResult(null);

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/csv') {
      const error = 'Invalid file type. Please upload a CSV file.';
      setUploadResult({ success: false, error });
      if (onUploadError) {
        onUploadError(error);
      }
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      const error = 'File too large. Maximum size is 5MB.';
      setUploadResult({ success: false, error });
      if (onUploadError) {
        onUploadError(error);
      }
      return;
    }

    setUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to API
      const response = await fetch('/api/csv-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      // Save transactions to localStorage (client-side, offline-first)
      let savedCount = 0;
      if (result.transactions && Array.isArray(result.transactions)) {
        for (const txn of result.transactions as InferredTransaction[]) {
          if (!isDuplicate(txn)) {
            const saved = savePendingTransaction(txn);
            if (saved) savedCount++;
          }
        }
      }

      // Success
      setUploadResult({
        success: true,
        summary: {
          totalRows: result.summary.totalRows,
          validRows: savedCount,
          invalidRows: result.summary.invalidRows,
        },
      });

      if (onUploadSuccess) {
        onUploadSuccess({
          totalRows: result.summary.totalRows,
          validRows: savedCount,
          invalidRows: result.summary.invalidRows,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadResult({ success: false, error: errorMessage });
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const a = document.createElement('a');
    a.href = '/templates/vyapar-transactions-template.csv';
    a.download = 'vyapar-transactions-template.csv';
    a.click();
  };

  const handleLoadSampleData = async () => {
    setUploading(true);
    setUploadResult(null);

    try {
      const profile = await resolveProfileForDemoData();

      const paths = getDemoDataPaths(
        profile?.business_type || profile?.businessType,
        profile?.city_tier
      );

      const [salesRes, expensesRes, inventoryRes] = await Promise.all([
        fetch(paths.sales),
        fetch(paths.expenses),
        fetch(paths.inventory),
      ]);

      if (!salesRes.ok || !expensesRes.ok || !inventoryRes.ok) {
        throw new Error('Failed to load sample data files');
      }

      const [salesText, expensesText, inventoryText] = await Promise.all([
        salesRes.text(),
        expensesRes.text(),
        inventoryRes.text()
      ]);

      // Create File objects
      const salesFile = new File([salesText], 'sample-sales.csv', { type: 'text/csv' });
      const expensesFile = new File([expensesText], 'sample-expenses.csv', { type: 'text/csv' });
      const inventoryFile = new File([inventoryText], 'sample-inventory.csv', { type: 'text/csv' });

      // Upload all three files
      let totalValid = 0;
      let totalInvalid = 0;

      for (const file of [salesFile, expensesFile, inventoryFile]) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/csv-upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || `Failed to upload ${file.name}`);
        }

        if (result.summary) {
          // Save transactions to localStorage client-side
          if (result.transactions && Array.isArray(result.transactions)) {
            for (const txn of result.transactions as InferredTransaction[]) {
              if (!isDuplicate(txn)) {
                const saved = savePendingTransaction(txn);
                if (saved) totalValid++;
              }
            }
          }
          totalInvalid += result.summary.invalidRows ?? 0;
        }
      }

      // Success
      setUploadResult({
        success: true,
        summary: {
          totalRows: totalValid + totalInvalid,
          validRows: totalValid,
          invalidRows: totalInvalid,
        },
      });

      if (onUploadSuccess) {
        onUploadSuccess({
          totalRows: totalValid + totalInvalid,
          validRows: totalValid,
          invalidRows: totalInvalid,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sample data';
      setUploadResult({ success: false, error: errorMessage });
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-[#d9e1ee] bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.04)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#2563eb]">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight text-neutral-900">{t.title}</h3>
          <p className="text-sm text-neutral-500">{t.description}</p>
        </div>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <div className="mb-4">
          {uploadResult.success && uploadResult.summary ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <h4 className="mb-2 font-semibold text-emerald-900">{t.successTitle}</h4>
                  {(() => {
                    const validRows = Number.isNaN(uploadResult.summary.validRows)
                      ? 0
                      : uploadResult.summary.validRows;
                    const invalidRows = Number.isNaN(uploadResult.summary.invalidRows)
                      ? 0
                      : uploadResult.summary.invalidRows;
                    return (
                      <>
                        <p className="mb-3 text-sm text-emerald-700">
                          {validRows} {t.successMessage}
                        </p>
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="font-medium text-emerald-900">{t.validRows}:</span>{' '}
                            <span className="text-emerald-700">{validRows}</span>
                          </div>
                          {invalidRows > 0 && (
                            <div>
                              <span className="font-medium text-orange-900">{t.invalidRows}:</span>{' '}
                              <span className="text-orange-700">{invalidRows}</span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div className="flex-1">
                  <h4 className="mb-1 font-semibold text-rose-900">{t.errorTitle}</h4>
                  <p className="text-sm text-rose-700">{uploadResult.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload area */}
      {!uploading && (
        <>
          <div
            className={`rounded-[24px] border-2 border-dashed p-8 text-center transition-colors ${
              dragActive
                ? 'border-[#2563eb] bg-[#eef4ff]'
                : 'border-[#d9e1ee] bg-[#fbfcff] hover:border-neutral-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-neutral-400 shadow-sm">
              <Upload className="h-7 w-7" />
            </div>
            <p className="mb-2 text-neutral-700">
              {t.dragDrop}{' '}
              <button
                onClick={handleBrowseClick}
                className="font-semibold text-[#2563eb] underline transition-colors hover:text-[#174ea6]"
              >
                {t.browse}
              </button>
            </p>
            <p className="text-sm text-neutral-500">{t.maxSize}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,application/csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Template Download + Try Sample Data */}
          <div className="mt-4 flex flex-col gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
            >
              <Download className="h-4 w-4" />
              {t.downloadTemplate}
            </button>
            <button
              onClick={handleLoadSampleData}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#005bbf] to-[#1a73e8] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(26,115,232,0.24)] transition-all hover:brightness-105"
            >
              <FileText className="h-5 w-5" />
              {t.trySampleData}
            </button>
            <p className="mt-1 text-center text-xs leading-5 text-neutral-500">{t.sampleDataDesc}</p>
          </div>
        </>
      )}

      {/* Uploading state */}
      {uploading && (
        <div className="rounded-[24px] border-2 border-dashed border-[#d9e1ee] bg-[#fbfcff] p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#2563eb] border-t-transparent"></div>
          <p className="font-medium text-neutral-700">{t.uploading}</p>
        </div>
      )}

      {/* Try again button */}
      {uploadResult && !uploadResult.success && (
        <button
          onClick={handleReset}
          className="mt-4 w-full rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          {t.tryAgain}
        </button>
      )}
    </div>
  );
}
