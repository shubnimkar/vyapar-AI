'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { FileType, Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface FileUploadProps {
  fileType: FileType;
  sessionId: string | null;
  language: Language;
  onUploadComplete: (sessionId: string, fileType: FileType) => void;
}

interface PreviewData {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export default function FileUpload({
  fileType,
  sessionId,
  language,
  onUploadComplete,
}: FileUploadProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileTypeLabels = {
    sales: t('salesData', language),
    expenses: t('expensesData', language),
    inventory: t('inventoryData', language),
  };

  const fileTypeIcons = {
    sales: '📊',
    expenses: '💰',
    inventory: '📦',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Client-side preview using PapaParse
    Papa.parse(file, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview({
          headers: results.meta.fields || [],
          rows: results.data.slice(0, 5) as Record<string, unknown>[],
          totalRows: results.data.length,
        });
      },
      error: (error) => {
        setError(error.message);
      },
    });
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      formData.append('language', language);
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setPreview(data.preview);
        onUploadComplete(data.sessionId, fileType);
      } else {
        setError(data.error || t('uploadFailed', language));
      }
    } catch {
      setError(t('uploadFailed', language));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{fileTypeIcons[fileType]}</span>
        <h3 className="text-lg font-semibold text-gray-800">
          {fileTypeLabels[fileType]}
        </h3>
      </div>

      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
        />

        {preview && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">
              {t('preview', language)} ({preview.totalRows} {t('rowsUploaded', language)})
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {preview.headers.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-2 py-1 text-left font-medium text-gray-700 border-b"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, idx) => (
                    <tr key={idx} className="border-b">
                      {preview.headers.map((header, colIdx) => (
                        <td key={colIdx} className="px-2 py-1 text-gray-600">
                          {String(row[header] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!preview || uploading}
          className="w-full bg-blue-500 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors min-h-[44px]"
        >
          {uploading ? t('uploading', language) : t('uploadButton', language)}
        </button>
      </div>
    </div>
  );
}
