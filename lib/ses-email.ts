import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '@/lib/logger';

const SES_REGION = process.env.SES_REGION || process.env.AWS_REGION || process.env.DYNAMODB_REGION || 'ap-south-1';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS;
const APP_BASE_URL = process.env.APP_BASE_URL;

function isEmailConfigured(): boolean {
  return Boolean(EMAIL_FROM_ADDRESS && APP_BASE_URL);
}

export async function sendPasswordResetEmail(params: { to: string; resetUrl: string }): Promise<void> {
  if (!isEmailConfigured()) {
    logger.warn('[SES] EMAIL_FROM_ADDRESS/APP_BASE_URL not set; skipping email send', {
      to: params.to,
    });
    return;
  }

  const client = new SESClient({ region: SES_REGION });

  const subject = 'Reset your Vyapar AI password';
  const textBody = `We received a request to reset your Vyapar AI password.

Reset link (valid for a limited time):
${params.resetUrl}

If you didn’t request this, you can ignore this email.`;

  const htmlBody = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Reset your Vyapar AI password</h2>
      <p style="margin: 0 0 12px;">We received a request to reset your password.</p>
      <p style="margin: 0 0 16px;">
        <a href="${params.resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
      </p>
      <p style="margin: 0; color:#475569; font-size: 13px;">
        If you didn’t request this, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await client.send(
      new SendEmailCommand({
        Source: EMAIL_FROM_ADDRESS!,
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: textBody, Charset: 'UTF-8' },
            Html: { Data: htmlBody, Charset: 'UTF-8' },
          },
        },
      })
    );
  } catch (error) {
    logger.error('[SES] Failed to send reset email', { error, to: params.to });
    throw error;
  }
}

export function getAppBaseUrl(): string | null {
  return APP_BASE_URL || null;
}

