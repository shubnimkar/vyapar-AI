import { createHash, randomBytes } from 'crypto';

export function randomToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

