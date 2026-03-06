'use client';

import { useState, useRef } from 'react';
import { Language } from '@/lib/types';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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

      // Success
      setUploadResult({
        success: true,
        summary: result.summary,
      });

      if (onUploadSuccess && result.summary) {
        onUploadSuccess(result.summary);
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
          <p className="text-sm text-gray-500">{t.description}</p>
        </div>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <div className="mb-4">
          {uploadResult.success && uploadResult.summary ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 mb-2">{t.successTitle}</h4>
                  <p className="text-sm text-green-700 mb-3">
                    {uploadResult.summary.validRows} {t.successMessage}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-900">{t.validRows}:</span>{' '}
                      <span className="text-green-700">{uploadResult.summary.validRows}</span>
                    </div>
                    {uploadResult.summary.invalidRows > 0 && (
                      <div>
                        <span className="font-medium text-orange-900">{t.invalidRows}:</span>{' '}
                        <span className="text-orange-700">{uploadResult.summary.invalidRows}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-1">{t.errorTitle}</h4>
                  <p className="text-sm text-red-700">{uploadResult.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload area */}
      {!uploading && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 mb-2">
            {t.dragDrop}{' '}
            <button
              onClick={handleBrowseClick}
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              {t.browse}
            </button>
          </p>
          <p className="text-sm text-gray-500">{t.maxSize}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/csv"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* Uploading state */}
      {uploading && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">{t.uploading}</p>
        </div>
      )}

      {/* Try again button */}
      {uploadResult && !uploadResult.success && (
        <button
          onClick={handleReset}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {t.tryAgain}
        </button>
      )}
    </div>
  );
}
