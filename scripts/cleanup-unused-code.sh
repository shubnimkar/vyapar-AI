#!/bin/bash
# Vyapar AI - Cleanup Unused Code
# Removes deprecated dependencies and files

set -e  # Exit on error

echo "🧹 Vyapar AI Code Cleanup"
echo "========================="
echo ""

# Confirm before proceeding
read -p "This will remove unused packages and files. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "📦 Step 1: Removing unused npm packages..."
npm uninstall mongodb twilio || echo "⚠️  Packages may already be removed"

echo ""
echo "🗑️  Step 2: Removing deprecated auth components..."
rm -f components/auth/PhoneInput.tsx && echo "  ✓ Removed PhoneInput.tsx" || echo "  ⚠️  PhoneInput.tsx not found"
rm -f components/auth/OTPInput.tsx && echo "  ✓ Removed OTPInput.tsx" || echo "  ⚠️  OTPInput.tsx not found"

echo ""
echo "🗑️  Step 3: Removing unused library files..."
rm -f lib/supabase-auth.ts && echo "  ✓ Removed supabase-auth.ts" || echo "  ⚠️  supabase-auth.ts not found"
rm -f lib/data-migrator.ts && echo "  ✓ Removed data-migrator.ts" || echo "  ⚠️  data-migrator.ts not found"

echo ""
echo "🗑️  Step 4: Removing empty directories..."
rmdir app/api/auth/check-phone 2>/dev/null && echo "  ✓ Removed check-phone/" || echo "  ⚠️  check-phone/ not found or not empty"
rmdir app/api/auth/validate 2>/dev/null && echo "  ✓ Removed validate/" || echo "  ⚠️  validate/ not found or not empty"

echo ""
echo "🗑️  Step 5: Removing archived database schemas..."
if [ -d "archive/" ]; then
    rm -rf archive/ && echo "  ✓ Removed archive/ directory"
else
    echo "  ⚠️  archive/ not found"
fi

echo ""
echo "🗑️  Step 6: Removing deprecated specs..."
if [ -d ".kiro/specs/phone-auth/" ]; then
    rm -rf .kiro/specs/phone-auth/ && echo "  ✓ Removed phone-auth spec"
else
    echo "  ⚠️  phone-auth spec not found"
fi

echo ""
echo "🗑️  Step 7: Removing deprecated documentation..."
rm -f TWILIO-TEST-GUIDE.md && echo "  ✓ Removed TWILIO-TEST-GUIDE.md" || echo "  ⚠️  TWILIO-TEST-GUIDE.md not found"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📝 Manual steps remaining:"
echo "1. Edit .env.local and remove Twilio variables:"
echo "   - TWILIO_ACCOUNT_SID"
echo "   - TWILIO_AUTH_TOKEN"
echo "   - TWILIO_PHONE_NUMBER"
echo "   - TWILIO_VERIFY_SERVICE_SID"
echo ""
echo "2. Edit .env.local.example and remove the same Twilio variables"
echo ""
echo "3. Run 'npm install' to update package-lock.json"
echo ""
echo "4. Test the app: npm run dev"
echo ""
echo "📊 Estimated space saved: ~55 MB"
