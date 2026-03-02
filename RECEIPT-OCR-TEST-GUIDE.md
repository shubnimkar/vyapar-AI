# Receipt OCR Testing Guide

## ✅ What's Been Implemented

1. **Real Bedrock Vision OCR**: No more mock data! The API now uses Claude 3 Sonnet with vision to extract actual receipt data.
2. **Direct Processing**: Processes receipts immediately (no Lambda needed for now).
3. **S3 Backup**: Optionally saves receipts to S3 for record-keeping.

## 🚀 How to Test

### Step 1: Install Dependencies (if not already done)

```bash
npm install @aws-sdk/client-s3 @aws-sdk/client-bedrock-runtime
```

### Step 2: Check AWS Credentials

Your `.env.local` already has:
- ✅ AWS Access Key ID
- ✅ AWS Secret Access Key
- ✅ Region: `ap-south-1`

**IMPORTANT**: If you get errors about Bedrock not being available, change the region to `us-east-1` in `.env.local`:

```bash
AWS_REGION=us-east-1
```

### Step 3: Enable Bedrock Model Access

1. Go to AWS Console: https://console.aws.amazon.com/bedrock/
2. Click "Model access" in the left sidebar
3. Click "Manage model access"
4. Find "Claude 3 Sonnet" and check the box
5. Click "Request model access"
6. Wait 1-2 minutes for approval (usually instant)

### Step 4: Create S3 Bucket (Optional)

If you want to save receipts to S3:

1. Go to S3 Console: https://s3.console.aws.amazon.com/
2. Create bucket named `vyapar-receipts-yourname`
3. Update `.env.local`:
   ```bash
   AWS_S3_BUCKET_RECEIPTS=vyapar-receipts-yourname
   ```

**Note**: S3 is optional. The OCR will work even if S3 upload fails.

### Step 5: Restart Dev Server

```bash
# Stop the server (Ctrl+C)
npm run dev
```

### Step 6: Test Receipt Upload

1. Go to http://localhost:3000
2. Find the "Upload Receipt" section
3. Click to upload or take a photo
4. Upload a receipt image
5. Wait 5-10 seconds for processing
6. Check if the extracted data is accurate!

## 📸 What Gets Extracted

- **Date**: Actual date from receipt (YYYY-MM-DD format)
- **Amount**: Total amount (as a number)
- **Vendor**: Store/vendor name
- **Items**: List of purchased items

## 🐛 Troubleshooting

### Error: "Access Denied" or "Not Authorized"

**Solution**: Enable Bedrock model access (see Step 3 above)

### Error: "Model not found" or "Region not supported"

**Solution**: Change region to `us-east-1` in `.env.local` and restart server

### Error: "Invalid credentials"

**Solution**: 
1. Check AWS access keys are correct in `.env.local`
2. Make sure IAM user has `AmazonBedrockFullAccess` policy
3. Restart dev server after changing `.env.local`

### OCR Results Are Inaccurate

**Tips for better results**:
- Use clear, well-lit photos
- Make sure text is readable
- Avoid blurry or angled images
- Try different receipt types (printed receipts work better than handwritten)

### S3 Upload Fails

**Don't worry!** The OCR will still work. S3 is just for backup. To fix:
1. Create S3 bucket in AWS Console
2. Make sure IAM user has `AmazonS3FullAccess` policy
3. Update bucket name in `.env.local`

## 🎯 Next Steps After Testing

Once OCR is working:

1. **Improve Prompt**: Tune the Bedrock prompt for better extraction
2. **Add Validation**: Validate extracted data before showing to user
3. **Auto-fill Form**: Connect extracted data to Daily Entry Form
4. **Add Categories**: Extract item categories for better insights
5. **Multi-language**: Support Hindi/Marathi receipts

## 💡 Cost Estimate

- **Bedrock Vision**: ~$0.003 per image (very cheap!)
- **S3 Storage**: ~$0.023 per GB (with 7-day lifecycle)
- **Total for 100 receipts**: < $1

## 🏆 Demo Tips for Hackathon

1. **Show the handwritten notes photo**: Upload your handwritten notes and show how it extracts the text
2. **Show a real receipt**: Upload a store receipt and show accurate extraction
3. **Show the speed**: Emphasize it processes in 5-10 seconds
4. **Show the UI**: Beautiful loading states, preview, extracted data display
5. **Mention AWS services**: "Using AWS Bedrock with Claude 3 Sonnet for vision AI"

Good luck with your hackathon! 🚀
