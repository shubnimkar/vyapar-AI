import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '@/lib/logger';

const SES_REGION = process.env.SES_REGION || 'ap-south-1';
const SES_ACCESS_KEY_ID = process.env.SES_ACCESS_KEY_ID;
const SES_SECRET_ACCESS_KEY = process.env.SES_SECRET_ACCESS_KEY;
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

  const client = new SESClient({
    region: SES_REGION,
    credentials: SES_ACCESS_KEY_ID && SES_SECRET_ACCESS_KEY
      ? {
          accessKeyId: SES_ACCESS_KEY_ID,
          secretAccessKey: SES_SECRET_ACCESS_KEY,
        }
      : undefined,
  });

  const subject = 'Reset Your Vyapar AI Password';
  const textBody = `Hello,

We received a request to reset your Vyapar AI password.

Reset your password using the following link (valid for 1 hour):
${params.resetUrl}

If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.

For security reasons, this link expires in 1 hour.

--
Vyapar AI Team
Empowering Your Business Intelligence`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                Vyapar AI
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 400;">
                Business Intelligence Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 600; line-height: 1.4;">
                Reset Your Password
              </h2>

              <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
                Hello,
              </p>

              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                We received a request to reset your <strong>Vyapar AI</strong> password. Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 0 24px; border-collapse: collapse;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #2563eb;">
                    <a href="${params.resetUrl}"
                       style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; background-color: #2563eb;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; color: #2563eb; font-size: 14px; line-height: 1.6; word-break: break-all;">
                <a href="${params.resetUrl}" style="color: #2563eb; text-decoration: underline;">${params.resetUrl}</a>
              </p>

              <!-- Security Notice -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      ⏱️ Link Expiry
                    </p>
                    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                      This password reset link is valid for <strong>1 hour</strong> only. For your security, it will expire automatically.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 12px; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <p style="margin: 0 0 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                For security reasons, we recommend:
              </p>
              <ul style="margin: 0 0 20px; color: #94a3b8; font-size: 13px; line-height: 1.8; padding-left: 20px;">
                <li>Using a strong, unique password</li>
                <li>Not sharing your password with others</li>
                <li>Enabling two-factor authentication when available</li>
              </ul>

              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                © ${new Date().getFullYear()} Vyapar AI. All rights reserved.
              </p>
              <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">
                Empowering Your Business Intelligence
              </p>
            </td>
          </tr>
        </table>

        <!-- Unsubscribe / Preferences -->
        <p style="margin: 20px 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
          This is an automated security email. Please do not reply.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
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
