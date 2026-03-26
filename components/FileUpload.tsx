'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

  const handleDownloadTemplate = () => {
    const a = document.createElement('a');
    a.href = `/templates/vyapar-${fileType}-template.csv`;
    a.download = `vyapar-${fileType}-template.csv`;
    a.click();
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
    <Card className="h-full rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{fileTypeIcons[fileType]}</span>
        <h3 className="text-2xl font-semibold text-neutral-900">
          {fileTypeLabels[fileType]}
        </h3>
      </div>

      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="block w-full text-sm text-neutral-600 file:mr-4 file:h-10 file:rounded-xl file:border-0 file:bg-primary-50 file:px-4 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 file:cursor-pointer"
        />

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
        >
          <Download size={14} />
          Download {fileType}-template.csv
        </button>

        {preview && (
          <div className="mt-3">
            <p className="text-sm text-neutral-600 mb-2">
              {t('preview', language)} ({preview.totalRows} {t('rowsUploaded', language)})
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    {preview.headers.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-2 py-1 text-left font-medium text-neutral-700 border-b"
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
                        <td key={colIdx} className="px-2 py-1 text-neutral-600">
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
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!preview || uploading}
          fullWidth
        >
          {uploading ? t('uploading', language) : t('uploadButton', language)}
        </Button>
      </div>
    </Card>
  );
}
