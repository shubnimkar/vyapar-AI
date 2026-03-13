import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetTokenService, EmailLookupService, DynamoDBService, UserService } from '@/lib/dynamodb-client';
import { sha256Hex } from '@/lib/crypto-utils';
import { PasswordHasher } from '@/lib/password-hasher';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body?.token || '').trim();
    const newPassword = String(body?.newPassword || '');

    if (!token || !newPassword) {
      return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
    }

    const strength = PasswordHasher.validateStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ success: false, error: 'weak_password' }, { status: 400 });
    }

    const tokenHash = sha256Hex(token);
    const record = await PasswordResetTokenService.getByTokenHash(tokenHash);
    if (!record) return NextResponse.json({ success: false, error: 'invalid_token' }, { status: 400 });

    const now = Math.floor(Date.now() / 1000);
    if (record.usedAt) return NextResponse.json({ success: false, error: 'used_token' }, { status: 400 });
    if (record.expiresAt <= now) return NextResponse.json({ success: false, error: 'expired_token' }, { status: 400 });

    const lookup = await EmailLookupService.getByEmail(record.email);
    if (!lookup) {
      return NextResponse.json({ success: false, error: 'user_not_found' }, { status: 400 });
    }

    const user = await UserService.getUserByUsername(lookup.username);
    if (!user) {
      return NextResponse.json({ success: false, error: 'user_not_found' }, { status: 400 });
    }

    const hashResult = await PasswordHasher.hash(newPassword);
    if (!hashResult.success || !hashResult.hash) {
      return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
    }

    // Update password hash
    await DynamoDBService.updateItem(`USER#${user.username.toLowerCase()}`, 'METADATA', {
      passwordHash: hashResult.hash,
    });

    await PasswordResetTokenService.markUsed(tokenHash);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Reset password failed', { error });
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}

