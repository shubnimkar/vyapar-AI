"use client";

import React, { useState, useRef } from "react";
import { Camera, Upload, Loader2, CheckCircle, XCircle, X, ArrowRight } from "lucide-react";
import { logger } from "@/lib/logger";
import { parseOCRResult } from "@/lib/parsers/ocr-result-parser";
import { isDuplicate } from "@/lib/duplicate-detector";
import { savePendingTransaction } from "@/lib/pending-transaction-store";

interface ExtractedData {
  date: string;
  amount: number;
  items: string[];
  vendor: string;
}

interface ReceiptOCRProps {
  onDataExtracted?: (data: ExtractedData) => void; // Optional for backward compatibility
  language: "en" | "hi" | "mr";
  usePendingFlow?: boolean; // New prop to enable pending transaction flow
}

export default function ReceiptOCR({ onDataExtracted, language, usePendingFlow = true }: ReceiptOCRProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error" | "pending_saved">("idle");
  const [error, setError] = useState<string>("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [isDuplicateTransaction, setIsDuplicateTransaction] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const translations = {
    en: {
      title: "Upload Receipt",
      subtitle: "Take a photo or upload receipt image",
      uploading: "Uploading...",
      processing: "Extracting data from receipt...",
      success: "Data extracted successfully!",
      error: "Failed to extract data",
      useData: "Use This Data",
      tryAgain: "Try Again",
      cancel: "Cancel",
      date: "Date",
      amount: "Amount",
      vendor: "Vendor",
      items: "Items",
      clickToUpload: "Click to upload or take photo",
      maxSize: "Max size: 20MB",
      pendingSaved: "Transaction added to pending review",
      viewPending: "View Pending Transactions",
      duplicate: "This transaction has already been added",
      uploadAnother: "Upload Another Receipt",
    },
    hi: {
      title: "रसीद अपलोड करें",
      subtitle: "फोटो लें या रसीद इमेज अपलोड करें",
      uploading: "अपलोड हो रहा है...",
      processing: "रसीद से डेटा निकाला जा रहा है...",
      success: "डेटा सफलतापूर्वक निकाला गया!",
      error: "डेटा निकालने में विफल",
      useData: "इस डेटा का उपयोग करें",
      tryAgain: "पुनः प्रयास करें",
      cancel: "रद्द करें",
      date: "तारीख",
      amount: "राशि",
      vendor: "दुकान",
      items: "वस्तुएं",
      clickToUpload: "फोटो लेने या अपलोड करने के लिए क्लिक करें",
      maxSize: "अधिकतम आकार: 20MB",
      pendingSaved: "लेनदेन समीक्षा के लिए जोड़ा गया",
      viewPending: "लंबित लेनदेन देखें",
      duplicate: "यह लेनदेन पहले से जोड़ा जा चुका है",
      uploadAnother: "एक और रसीद अपलोड करें",
    },
    mr: {
      title: "पावती अपलोड करा",
      subtitle: "फोटो घ्या किंवा पावती इमेज अपलोड करा",
      uploading: "अपलोड होत आहे...",
      processing: "पावतीमधून डेटा काढला जात आहे...",
      success: "डेटा यशस्वीरित्या काढला गेला!",
      error: "डेटा काढण्यात अयशस्वी",
      useData: "हा डेटा वापरा",
      tryAgain: "पुन्हा प्रयत्न करा",
      cancel: "रद्द करा",
      date: "तारीख",
      amount: "रक्कम",
      vendor: "दुकान",
      items: "वस्तू",
      clickToUpload: "फोटो घेण्यासाठी किंवा अपलोड करण्यासाठी क्लिक करा",
      maxSize: "कमाल आकार: 20MB",
      pendingSaved: "व्यवहार पुनरावलोकनासाठी जोडला",
      viewPending: "प्रलंबित व्यवहार पहा",
      duplicate: "हा व्यवहार आधीच जोडला गेला आहे",
      uploadAnother: "दुसरी पावती अपलोड करा",
    },
  };

  const t = translations[language];

  // Poll for Lambda results
  const pollForResults = async (filename: string, maxAttempts = 20) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`/api/receipt-status?filename=${encodeURIComponent(filename)}`);
        const result = await response.json();

        if (result.status === "completed" && result.extractedData) {
          return result.extractedData;
        }

        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        logger.error("Polling error", { error: err });
      }
    }

    throw new Error("Processing timeout - please try again");
  };

  // Generate file hash for deterministic ID
  const generateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setStatus("uploading");
    setError("");
    setIsDuplicateTransaction(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/receipt-ocr", {
        method: "POST",
        body: formData,
      });

      // Guard against HTML error pages (e.g. 413 from Next.js before route handler runs)
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          response.status === 413
            ? "Image is too large. Please use a photo under 50MB."
            : `Server error (${response.status}). Please try again.`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || "Upload failed");
      }

      setStatus("processing");

      // Poll for Lambda results
      const extractedData = await pollForResults(result.filename);
      setExtractedData(extractedData);

      // If usePendingFlow is enabled, save to pending store
      if (usePendingFlow) {
        try {
          // Generate file hash for deterministic ID
          const fileHash = await generateFileHash(file);

          // Parse OCR result to InferredTransaction
          const inferredTransaction = parseOCRResult(
            {
              success: true,
              filename: result.filename,
              extractedData,
              processedAt: new Date().toISOString(),
              processingTimeMs: 0,
              method: 'bedrock-vision'
            },
            fileHash
          );

          // Check for duplicates
          const duplicate = isDuplicate({
            date: inferredTransaction.date,
            amount: inferredTransaction.amount,
            type: inferredTransaction.type,
            vendor_name: inferredTransaction.vendor_name,
            category: inferredTransaction.category,
            source: inferredTransaction.source
          });

          if (duplicate) {
            setIsDuplicateTransaction(true);
            setStatus("error");
            setError(t.duplicate);
            logger.info("Duplicate receipt detected", { transactionId: inferredTransaction.id });
            return;
          }

          // Save to pending store
          const saved = savePendingTransaction(inferredTransaction);

          if (saved) {
            setStatus("pending_saved");
            logger.info("Receipt saved to pending transactions", { transactionId: inferredTransaction.id });
          } else {
            throw new Error("Failed to save to pending store");
          }
        } catch (err) {
          logger.error("Error saving to pending store", { error: err });
          // Fall back to success state for backward compatibility
          setStatus("success");
        }
      } else {
        // Backward compatibility: use old flow
        setStatus("success");
      }
    } catch (error) {
      logger.error("Receipt OCR error", { error });
      const errorMessage = error instanceof Error ? error.message : "Failed to process receipt";
      setError(errorMessage);
      setStatus("error");
    }
  };

  const handleUseData = () => {
    if (extractedData && onDataExtracted) {
      onDataExtracted(extractedData);
      handleReset();
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setError("");
    setExtractedData(null);
    setPreview("");
    setIsDuplicateTransaction(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-neutral-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-primary-600" />
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{t.title}</h3>
            <p className="text-sm text-neutral-600">{t.subtitle}</p>
          </div>
        </div>
        {status !== "idle" && (
          <button
            onClick={handleReset}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label={t.cancel}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {status === "idle" && (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-neutral-300 rounded-2xl cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all">
          <Upload className="w-10 h-10 text-neutral-400 mb-3" />
          <span className="text-sm font-medium text-neutral-700 mb-1">{t.clickToUpload}</span>
          <span className="text-xs text-neutral-500">{t.maxSize}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}

      {(status === "uploading" || status === "processing") && (
        <div className="flex flex-col items-center justify-center h-40 space-y-4">
          {preview && (
            <img 
              src={preview} 
              alt="Receipt preview" 
              className="w-20 h-20 object-cover rounded-2xl border border-neutral-200"
            />
          )}
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-2" />
            <p className="text-sm font-medium text-neutral-700">
              {status === "uploading" ? t.uploading : t.processing}
            </p>
            <p className="text-xs text-neutral-500 mt-1">This may take a few seconds...</p>
          </div>
        </div>
      )}

      {status === "success" && extractedData && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-success-600 bg-success-50 p-3 rounded-2xl border border-success-200">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{t.success}</span>
          </div>

          {preview && (
            <img 
              src={preview} 
              alt="Receipt" 
              className="w-full max-h-40 object-contain rounded-2xl border border-neutral-200"
            />
          )}

          <div className="bg-neutral-50 rounded-2xl p-4 space-y-3 border border-neutral-200">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-600">{t.date}:</span>
              <span className="font-semibold text-neutral-900">{extractedData.date}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-600">{t.amount}:</span>
              <span className="font-semibold text-lg text-primary-600">₹{extractedData.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-600">{t.vendor}:</span>
              <span className="font-medium text-neutral-900">{extractedData.vendor}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-neutral-600 block mb-2">{t.items}:</span>
              <ul className="space-y-1 ml-2">
                {extractedData.items.map((item, i) => (
                  <li key={i} className="text-sm text-neutral-700 flex items-start">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUseData}
              className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-2xl hover:bg-primary-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              {t.useData}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-3 border-2 border-neutral-300 rounded-2xl hover:bg-neutral-50 transition-colors font-medium text-neutral-700"
            >
              {t.tryAgain}
            </button>
          </div>
        </div>
      )}

      {status === "pending_saved" && extractedData && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-success-600 bg-success-50 p-3 rounded-2xl border border-success-200">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{t.pendingSaved}</span>
          </div>

          {preview && (
            <img 
              src={preview} 
              alt="Receipt" 
              className="w-full max-h-40 object-contain rounded-2xl border border-neutral-200"
            />
          )}

          <div className="bg-neutral-50 rounded-2xl p-4 space-y-3 border border-neutral-200">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-600">{t.date}:</span>
              <span className="font-semibold text-neutral-900">{extractedData.date}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-600">{t.amount}:</span>
              <span className="font-semibold text-lg text-primary-600">₹{extractedData.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-600">{t.vendor}:</span>
              <span className="font-medium text-neutral-900">{extractedData.vendor}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="/"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('vyapar-active-section', 'pending');
                }
              }}
              className="flex items-center justify-center gap-2 bg-primary-600 text-white py-3 px-4 rounded-2xl hover:bg-primary-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              {t.viewPending}
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              onClick={handleReset}
              className="w-full py-3 px-4 border-2 border-neutral-300 rounded-2xl hover:bg-neutral-50 transition-colors font-medium text-neutral-700"
            >
              {t.uploadAnother}
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-2 text-error-600 bg-error-50 p-4 rounded-2xl border border-error-200">
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{t.error}</p>
              <p className="text-sm mt-1 text-error-700">{error}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="w-full py-3 px-4 border-2 border-neutral-300 rounded-2xl hover:bg-neutral-50 transition-colors font-medium text-neutral-700"
          >
            {t.tryAgain}
          </button>
        </div>
      )}
    </div>
  );
}
