import { NextRequest, NextResponse } from 'next/server';
import { EmailLookupService, PasswordResetTokenService } from '@/lib/dynamodb-client';
import { RateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { randomToken, sha256Hex } from '@/lib/crypto-utils';
import { sendPasswordResetEmail, getAppBaseUrl } from '@/lib/ses-email';

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimitKey = RateLimiter.getRateLimitKey(ip, 'password-reset');
    const rateLimit = RateLimiter.check(rateLimitKey, RATE_LIMITS.PASSWORD_RESET_REQUEST);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { success: false, error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
      );
    }

    const body = await request.json();
    const emailRaw = String(body?.email || '');
    const email = emailRaw.trim().toLowerCase();

    // Always return success to avoid user enumeration
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const lookup = await EmailLookupService.getByEmail(email);
    if (!lookup) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const token = randomToken(32);
    const tokenHash = sha256Hex(token);
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour

    await PasswordResetTokenService.createToken({
      tokenHash,
      userId: lookup.userId,
      email,
      expiresAt,
    });

    const baseUrl = getAppBaseUrl() || request.nextUrl.origin;
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail({ to: email, resetUrl });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Password reset request failed', { error });
    // Still avoid enumeration and noisy failures; client can retry.
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

