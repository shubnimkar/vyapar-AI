import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetTokenService } from '@/lib/dynamodb-client';
import { sha256Hex } from '@/lib/crypto-utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = (searchParams.get('token') || '').trim();
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const tokenHash = sha256Hex(token);
  const record = await PasswordResetTokenService.getByTokenHash(tokenHash);
  if (!record) return NextResponse.json({ valid: false }, { status: 200 });

  const now = Math.floor(Date.now() / 1000);
  if (record.usedAt) return NextResponse.json({ valid: false }, { status: 200 });
  if (record.expiresAt <= now) return NextResponse.json({ valid: false }, { status: 200 });

  return NextResponse.json({ valid: true }, { status: 200 });
}

