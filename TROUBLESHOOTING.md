# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Cannot find module './8948.js'" Error

**Symptom**: Server error when accessing pages, especially after making changes to components.

**Cause**: Next.js development server cache is stale or corrupted.

**Solution**:

#### Option A: Quick Clean (Recommended)
```bash
./scripts/clean-restart.sh
npm run dev
```

#### Option B: Manual Clean
```bash
# Stop the dev server (Ctrl+C)
rm -rf .next
npm run dev
```

#### Option C: Deep Clean (if issue persists)
```bash
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

### 2. TypeScript Errors After Changes

**Symptom**: Build fails with TypeScript type errors.

**Solution**:
```bash
npm run build
```

This will show you the exact errors. Common fixes:
- Check import paths are correct
- Verify interface/type definitions match usage
- Ensure all required props are passed to components

### 3. Port Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### 4. Environment Variables Not Loading

**Symptom**: AWS services not working, undefined environment variables.

**Solution**:
1. Check `.env.local` exists and has correct values
2. Restart dev server after changing `.env.local`
3. Verify variable names match exactly (case-sensitive)

```bash
# .env.local should have:
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
DYNAMODB_TABLE_NAME=vyapar-ai
```

### 5. DynamoDB Connection Errors

**Symptom**: `Failed to save item to DynamoDB` or similar errors.

**Solution**:
1. Verify AWS credentials are correct
2. Check DynamoDB table exists: `vyapar-ai`
3. Verify IAM permissions allow DynamoDB access
4. Check AWS region matches table region

```bash
# Test AWS credentials
aws dynamodb list-tables --region ap-south-1
```

### 6. Username Availability Check Not Working

**Symptom**: Username check doesn't show available/taken status.

**Solution**:
1. Check browser console for errors
2. Verify `/api/auth/check-username` endpoint is accessible
3. Check rate limiting isn't blocking requests
4. Clear browser cache and try again

### 7. Password Strength Bar Not Updating

**Symptom**: Strength bar doesn't change as you type.

**Solution**:
1. Check browser console for JavaScript errors
2. Verify React state is updating (use React DevTools)
3. Clear browser cache
4. Try in incognito/private mode

### 8. Session Not Persisting

**Symptom**: Logged out after refreshing page.

**Solution**:
1. Check browser localStorage for `vyapar-user-session`
2. Verify session hasn't expired
3. Check browser isn't blocking localStorage
4. Try different browser

### 9. Build Succeeds but Dev Server Fails

**Symptom**: `npm run build` works but `npm run dev` shows errors.

**Solution**:
```bash
# Clean everything and rebuild
rm -rf .next
rm -rf node_modules/.cache
npm run build
npm run dev
```

### 10. Rate Limiting Blocking Requests

**Symptom**: "Too many requests" or "Rate limit exceeded" errors.

**Solution**:
1. Wait for the rate limit window to expire
2. Check the `Retry-After` header for wait time
3. For development, you can temporarily increase limits in `lib/rate-limiter.ts`

```typescript
// Temporarily increase for development
export const RATE_LIMITS = {
  SIGNUP: { maxAttempts: 50, windowMs: 60 * 60 * 1000 },
  LOGIN: { maxAttempts: 100, windowMs: 15 * 60 * 1000 },
  CHECK_USERNAME: { maxAttempts: 200, windowMs: 60 * 1000 },
};
```

## Development Best Practices

### When to Clean Cache

Clean the cache when you:
- See "Cannot find module" errors
- Make significant changes to component structure
- Update dependencies
- Switch branches with different code
- Experience unexplained errors

### When to Restart Dev Server

Restart the dev server when you:
- Change `.env.local` file
- Update `next.config.js`
- Install new npm packages
- Experience hot reload issues

### When to Rebuild

Run `npm run build` when you:
- Want to verify production build works
- Check for TypeScript errors
- Test optimized bundle size
- Before deploying

## Quick Commands Reference

```bash
# Clean and restart
./scripts/clean-restart.sh && npm run dev

# Build and check for errors
npm run build

# Run tests
npm test

# Check TypeScript without building
npx tsc --noEmit

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Check AWS connection
aws dynamodb list-tables --region ap-south-1

# View environment variables (server-side)
node -e "console.log(process.env)" | grep AWS
```

## Getting Help

If issues persist:

1. Check browser console for errors
2. Check terminal for server errors
3. Review recent code changes
4. Try in incognito/private mode
5. Test in different browser
6. Check GitHub issues for similar problems

## Logs to Check

- **Browser Console**: F12 → Console tab
- **Network Tab**: F12 → Network tab (for API errors)
- **Terminal**: Where `npm run dev` is running
- **React DevTools**: For component state issues

## Common Error Messages

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| Cannot find module | Stale cache | Clean `.next` directory |
| EADDRINUSE | Port in use | Kill process or use different port |
| Module not found | Missing import | Check import path |
| Type error | TypeScript issue | Run `npm run build` to see details |
| 404 on API route | Wrong endpoint | Check API route path |
| 500 on API route | Server error | Check terminal logs |
| Network error | API not responding | Check server is running |
| Unauthorized | Missing auth | Check session in localStorage |

## Prevention Tips

1. **Always clean cache after major changes**
2. **Restart dev server after env changes**
3. **Use TypeScript strict mode** (catches errors early)
4. **Test in multiple browsers**
5. **Keep dependencies updated**
6. **Use version control** (git) to track changes
7. **Review logs regularly**
8. **Test API endpoints separately** (Postman/curl)

## Still Having Issues?

If none of these solutions work:

1. **Nuclear option**: 
   ```bash
   rm -rf .next node_modules package-lock.json
   npm install
   npm run build
   npm run dev
   ```

2. **Check system resources**:
   - Enough disk space?
   - Enough RAM?
   - Node.js version correct? (v18+)

3. **Verify installation**:
   ```bash
   node --version  # Should be v18 or higher
   npm --version   # Should be v9 or higher
   ```
