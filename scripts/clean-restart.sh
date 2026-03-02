#!/bin/bash

# Clean Restart Script for Next.js Development
# Fixes "Cannot find module" errors by clearing cache

echo "🧹 Cleaning Next.js cache..."
rm -rf .next

echo "🛑 Stopping any running dev servers..."
pkill -f "next dev" 2>/dev/null || true

echo "📦 Cleaning node_modules cache..."
rm -rf node_modules/.cache

echo "✅ Clean complete!"
echo ""
echo "Now run: npm run dev"
