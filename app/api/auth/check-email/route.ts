import { NextRequest, NextResponse } from 'next/server';
import { EmailLookupService } from '@/lib/dynamodb-client';
import { RateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = RateLimiter.getRateLimitKey(ip, 'check-email');
    const rateLimit = RateLimiter.check(rateLimitKey, RATE_LIMITS.CHECK_USERNAME);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { available: false, valid: false, error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = (searchParams.get('email') || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ available: false, valid: false, error: 'Email parameter is required' }, { status: 400 });
    }

    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      return NextResponse.json({ available: false, valid: false, error: 'Invalid email format' }, { status: 200 });
    }

    const exists = await EmailLookupService.emailExists(email);
    return NextResponse.json({ available: !exists, valid: true }, { status: 200 });

  } catch (error) {
    logger.error('Email check unexpected error', { error });
    return NextResponse.json({ available: false, valid: false, error: 'Internal server error' }, { status: 500 });
  }
}
