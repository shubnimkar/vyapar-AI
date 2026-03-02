# Twilio SMS Testing Guide

This guide helps you test SMS sending with Twilio before integrating with Supabase Auth.

## Prerequisites

1. **Twilio Account**: Sign up at [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. **Twilio Phone Number**: Get a free trial number from Twilio Console
3. **Verified Phone Number**: For trial accounts, verify your test phone number

## Step 1: Get Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Go to **Phone Numbers** > **Manage** > **Active Numbers**
4. Copy your Twilio phone number (format: +1234567890)

## Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TEST_PHONE_NUMBER=+919876543210
```

**Important Notes:**
- Replace `+919876543210` with your actual Indian mobile number
- Phone numbers must be in E.164 format: `+[country code][number]`
- For India: `+91XXXXXXXXXX` (10 digits after +91)

## Step 3: Verify Your Test Phone Number (Trial Accounts Only)

If you're using a Twilio trial account:

1. Go to [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
2. Click **Add a new Caller ID**
3. Enter your Indian mobile number: `+91XXXXXXXXXX`
4. Complete the verification process (you'll receive a verification code)

**Note:** Trial accounts can only send SMS to verified numbers. Upgrade to send to any number.

## Step 4: Install Twilio SDK

```bash
npm install twilio
```

## Step 5: Run the Test Script

```bash
node test-twilio-sms.js
```

### Expected Output (Success):

```
🧪 Testing Twilio SMS...

📋 Configuration:
   Account SID: ACxxxxxxxx...
   From Number: +1234567890
   To Number: +919876543210

📤 Sending test SMS...
   OTP: 123456

✅ SMS sent successfully!

📱 Message Details:
   SID: SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Status: queued
   To: +919876543210
   From: +1234567890
   Date: 2024-01-01T12:00:00.000Z

💡 Check your phone for the SMS!

⏳ Checking delivery status in 5 seconds...
   Updated Status: delivered
   ✅ Message delivered successfully!
```

## Common Errors and Solutions

### Error: Invalid phone number format (21211)

**Problem:** Phone number is not in E.164 format

**Solution:** 
- Use format: `+91XXXXXXXXXX` (not `91XXXXXXXXXX` or `XXXXXXXXXX`)
- First digit after +91 must be 6, 7, 8, or 9

### Error: Phone number is not verified (21608)

**Problem:** Trial account trying to send to unverified number

**Solutions:**
1. Verify the phone number in Twilio Console (see Step 3)
2. OR upgrade your Twilio account to remove this restriction

### Error: Authentication failed (20003)

**Problem:** Invalid Account SID or Auth Token

**Solution:**
- Double-check credentials in Twilio Console
- Make sure there are no extra spaces in `.env.local`
- Account SID starts with `AC`
- Auth Token is 32 characters long

### Error: From number is not valid (21606)

**Problem:** TWILIO_PHONE_NUMBER is incorrect

**Solution:**
- Get your Twilio phone number from Console > Phone Numbers
- Must include country code: `+1234567890`
- Make sure it's an active Twilio number

### Error: Twilio SDK not installed

**Problem:** `twilio` package not installed

**Solution:**
```bash
npm install twilio
```

## Step 6: Configure Supabase with Twilio

Once SMS sending works, configure Supabase to use your Twilio credentials:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Phone** provider and expand it
5. Toggle **Enable Phone provider** to ON
6. Select **Use custom Twilio**
7. Enter your credentials:
   - **Twilio Account SID**: Your Account SID
   - **Twilio Auth Token**: Your Auth Token
   - **Twilio Phone Number**: Your Twilio number
8. Set **OTP Expiry**: 600 seconds (10 minutes)
9. Enable **Rate Limiting**: 3 attempts per hour
10. Click **Save**

## Testing with Supabase Auth

After configuring Supabase, test the full auth flow:

1. Start your Next.js dev server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page (once implemented)

3. Enter your verified phone number: `+91XXXXXXXXXX`

4. You should receive an OTP via SMS

5. Enter the OTP to complete login

## Twilio Pricing (as of 2024)

- **Trial Account**: Free $15 credit
- **SMS to India**: ~$0.0075 per message
- **Trial Limitations**: 
  - Can only send to verified numbers
  - Messages include "Sent from your Twilio trial account"
  
- **Paid Account**:
  - No verification required
  - No trial message prefix
  - Pay as you go

## Alternative: Use Supabase Built-in SMS

If you don't want to set up Twilio:

1. In Supabase Dashboard > Authentication > Providers > Phone
2. Select **Use Supabase SMS** instead of custom Twilio
3. Supabase provides free test SMS for development
4. **Note:** For production, you'll need to upgrade or use custom Twilio

## Troubleshooting Checklist

- [ ] Twilio account created
- [ ] Account SID and Auth Token copied correctly
- [ ] Twilio phone number obtained
- [ ] Test phone number verified (for trial accounts)
- [ ] Phone numbers in E.164 format (+91XXXXXXXXXX)
- [ ] `.env.local` configured with all credentials
- [ ] `twilio` package installed
- [ ] Test script runs successfully
- [ ] SMS received on test phone

## Support Resources

- **Twilio Documentation**: https://www.twilio.com/docs/sms
- **Twilio Error Codes**: https://www.twilio.com/docs/api/errors
- **Twilio Console**: https://console.twilio.com/
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/phone-login

---

**Next Steps:**
- Once SMS sending works, proceed with implementing the UI components
- The auth flow will use Supabase Auth, which handles OTP generation and verification
- Twilio (via Supabase) will handle the actual SMS delivery
