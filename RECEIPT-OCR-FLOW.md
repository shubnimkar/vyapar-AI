# Receipt OCR Data Flow

## Overview
When a user uploads a receipt image, the system extracts structured data (date, amount, vendor, items) using OCR technology and presents it for use in daily expense tracking.

## Complete Flow Diagram

```
User → Upload Receipt → API → S3 → Lambda → OCR → Results → Display → Use Data
```

## Detailed Step-by-Step Flow

### 1. User Uploads Receipt
**Component:** `components/ReceiptOCR.tsx`
- User clicks "Upload Receipt" or takes photo with camera
- File selected (max 5MB, image formats)
- Preview shown immediately
- Status: `uploading`

### 2. Upload to API
**Endpoint:** `POST /api/receipt-ocr`
**File:** `app/api/receipt-ocr/route.ts`

```typescript
// Request
FormData with file

// Process
1. Validate file (size, type)
2. Generate unique filename
3. Upload to S3 bucket: vyapar-receipts-input
4. Return filename for polling

// Response
{
  success: true,
  filename: "receipt_1234567890.jpg",
  message: "Receipt uploaded successfully"
}
```

### 3. S3 Storage (Input)
**Bucket:** `vyapar-receipts-input`
- Receipt image stored temporarily
- Lifecycle policy: 7-day retention
- Triggers Lambda function automatically

### 4. Lambda Processing
**Function:** `lambda/receipt-ocr-processor/index.mjs`
**Trigger:** S3 PUT event on `vyapar-receipts-input`

```javascript
// Lambda Flow
1. Receive S3 event notification
2. Download image from S3
3. Run OCR (Tesseract or AWS Bedrock Vision)
4. Extract structured data:
   - Date (receipt date)
   - Amount (total amount)
   - Vendor (shop/store name)
   - Items (list of purchased items)
5. Save results to S3: vyapar-receipts-output
6. Return success
```

**OCR Methods:**
- **Tesseract** (Default): Free, runs in Lambda, good for clear receipts
- **AWS Bedrock Vision**: Premium, better accuracy, costs per request

### 5. Results Storage (Output)
**Bucket:** `vyapar-receipts-output`
- JSON file with extracted data
- Filename: `{original-filename}.json`
- Lifecycle policy: 7-day retention

**Result Format:**
```json
{
  "date": "2024-02-27",
  "amount": 1250.50,
  "vendor": "ABC Store",
  "items": [
    "Rice 5kg",
    "Oil 1L",
    "Sugar 2kg"
  ],
  "confidence": 0.95,
  "processingTime": 3.2
}
```

### 6. Frontend Polling
**Component:** `components/ReceiptOCR.tsx`
**Method:** `pollForResults()`

```typescript
// Polling Logic
1. Call /api/receipt-status?filename=xxx every 2 seconds
2. Max 20 attempts (40 seconds total)
3. Check if status === "completed"
4. If completed, get extractedData
5. If timeout, show error
```

**Status Check Endpoint:** `GET /api/receipt-status`
```typescript
// Response
{
  status: "completed" | "processing" | "error",
  extractedData: { date, amount, vendor, items }
}
```

### 7. Display Results
**Component:** `components/ReceiptOCR.tsx`
- Status: `success`
- Shows extracted data in formatted card:
  - Receipt preview image
  - Date
  - Amount (highlighted in blue)
  - Vendor name
  - Items list (bulleted)
- Two buttons:
  - "Use This Data" (primary)
  - "Try Again" (secondary)

### 8. Use Extracted Data
**Handler:** `handleReceiptDataExtracted()` in `app/page.tsx`

**Current Implementation:**
```typescript
// Shows alert with extracted data
alert(`Receipt processed!
Date: ${data.date}
Amount: ₹${data.amount}
Vendor: ${data.vendor}
Items: ${items.join(', ')}

Please add this amount to your daily expenses.`);
```

**Future Enhancement (TODO):**
```typescript
// Option 1: Auto-fill Daily Entry Form
setInitialExpense(data.amount);
setExpenseDate(data.date);
setExpenseNotes(`${data.vendor} - ${data.items.join(', ')}`);

// Option 2: Add to Expense List
addExpenseItem({
  date: data.date,
  amount: data.amount,
  category: 'Receipt',
  vendor: data.vendor,
  items: data.items
});

// Option 3: Store for Later
saveReceiptData(data);
```

## Data Storage After Extraction

### Current Behavior
- Extracted data is **NOT stored** in database
- Only shown to user for manual entry
- Receipt images deleted after 7 days (S3 lifecycle)

### Recommended Enhancement
Store receipt data in Supabase for:
1. **Expense tracking history**
2. **Vendor analytics**
3. **Item-level insights**
4. **Receipt audit trail**

**Proposed Schema:**
```sql
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  receipt_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  vendor TEXT,
  items JSONB,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  synced_to_daily_entry BOOLEAN DEFAULT FALSE
);
```

## Error Handling

### Upload Errors
- File too large (>5MB) → Show size error
- Invalid file type → Show format error
- Network error → Retry option

### Processing Errors
- OCR failed → "Could not read receipt, please try again"
- Timeout (>40s) → "Processing taking too long, please retry"
- Lambda error → "Service temporarily unavailable"

### Recovery
- User can always "Try Again"
- Original image preview retained
- No data loss on error

## Performance Metrics

### Typical Processing Times
- Upload: 1-2 seconds
- Lambda cold start: 3-5 seconds
- Lambda warm: 1-2 seconds
- OCR processing: 2-4 seconds
- **Total: 5-10 seconds**

### Optimization Tips
1. Keep Lambda warm with scheduled pings
2. Use Bedrock Vision for faster processing
3. Compress images before upload
4. Cache common vendor names

## Multi-Language Support

### UI Translations
- English, Hindi, Marathi supported
- All labels, buttons, messages translated
- Receipt data always in original language

### OCR Language Detection
- Tesseract supports Hindi/Devanagari
- Bedrock Vision auto-detects language
- Amount parsing handles ₹ symbol

## Cost Analysis

### Per Receipt Processing
- **S3 Storage:** ~$0.0001 (7 days)
- **Lambda Execution:** ~$0.0001 (256MB, 5s)
- **Tesseract OCR:** FREE
- **Bedrock Vision:** ~$0.003 per image
- **Data Transfer:** ~$0.0001

**Total Cost:**
- With Tesseract: ~$0.0003 per receipt
- With Bedrock: ~$0.003 per receipt

### Monthly Estimates (1000 receipts)
- Tesseract: $0.30/month
- Bedrock: $3.00/month

## Security & Privacy

### Data Protection
- Images stored in private S3 buckets
- Pre-signed URLs for secure access
- Automatic deletion after 7 days
- No permanent image storage

### User Privacy
- Receipt data not shared
- No third-party OCR services (if using Tesseract)
- GDPR compliant (data retention policy)

## Testing

### Test Receipt Upload
```bash
# Upload test receipt
curl -X POST http://localhost:3000/api/receipt-ocr \
  -F "file=@test-receipt.jpg"

# Check status
curl http://localhost:3000/api/receipt-status?filename=receipt_123.jpg
```

### Mock Data for Development
```typescript
const mockReceiptData = {
  date: "2024-02-27",
  amount: 1250.50,
  vendor: "ABC Store",
  items: ["Rice 5kg", "Oil 1L", "Sugar 2kg"]
};
```

## Future Enhancements

### Phase 1: Auto-Fill
- [ ] Pre-fill daily entry form with receipt amount
- [ ] Add vendor to expense notes
- [ ] Set date from receipt

### Phase 2: Receipt History
- [ ] Store all receipts in database
- [ ] View receipt history
- [ ] Search by vendor/date/amount

### Phase 3: Analytics
- [ ] Vendor spending analysis
- [ ] Item-level insights
- [ ] Receipt vs manual entry comparison

### Phase 4: Smart Features
- [ ] Duplicate receipt detection
- [ ] Expense categorization (groceries, fuel, etc.)
- [ ] Budget alerts based on receipts
- [ ] Export receipts for tax filing

## Troubleshooting

### Receipt Not Processing
1. Check Lambda logs in CloudWatch
2. Verify S3 bucket permissions
3. Test OCR with sample image
4. Check Lambda timeout settings

### Poor OCR Accuracy
1. Ensure receipt image is clear
2. Good lighting, no blur
3. Try Bedrock Vision instead of Tesseract
4. Crop to receipt area only

### Slow Processing
1. Check Lambda cold start times
2. Increase Lambda memory (faster CPU)
3. Optimize image size before upload
4. Use Bedrock for faster processing

## Related Files

- `components/ReceiptOCR.tsx` - Frontend component
- `app/api/receipt-ocr/route.ts` - Upload API
- `app/api/receipt-status/route.ts` - Status check API
- `lambda/receipt-ocr-processor/index.mjs` - Lambda function
- `app/page.tsx` - Main page with handler
- `RECEIPT-OCR-TEST-GUIDE.md` - Testing guide
- `LAMBDA-OCR-SETUP-GUIDE.md` - Setup instructions
