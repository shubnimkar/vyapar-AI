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

// --- Welcome Email ---

export async function sendWelcomeEmail(params: {
  to: string;
  username: string;
  shopName: string;
  loginUrl: string;
}): Promise<void> {
  if (!isEmailConfigured()) {
    logger.warn('[SES] EMAIL_FROM_ADDRESS/APP_BASE_URL not set; skipping welcome email', { to: params.to });
    return;
  }

  const logoUrl = APP_BASE_URL + '/background-removed.png';
  const subject = 'Welcome to Vyapar AI - Your shop is ready!';

  const textBody = [
    'Hi ' + params.username + ',',
    '',
    'Welcome to Vyapar AI! Your account for ' + params.shopName + ' is all set.',
    '',
    'What you can do:',
    '- Track daily sales and expenses',
    '- Manage credit (Udhaar) and follow up on overdue payments',
    '- Upload receipts or CSV files for instant insights',
    '- Get AI-powered explanations of your financial health',
    '',
    'Log in here: ' + params.loginUrl,
    '',
    '-- Vyapar AI Team',
  ].join('\n');

  const htmlBody = [
    '<!DOCTYPE html><html lang="en">',
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>',
    '<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;background-color:#f3f4f8;">',
    '<table role="presentation" style="width:100%;border-collapse:collapse;background-color:#f3f4f8;">',
    '<tr><td align="center" style="padding:40px 20px;">',
    '<table role="presentation" style="max-width:600px;width:100%;border-collapse:collapse;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(11,26,125,0.12);">',
    emailHeader(logoUrl),
    '<tr><td style="padding:36px 30px;">',
    '<h2 style="margin:0 0 6px;color:#0b1a7d;font-size:22px;font-weight:700;">Welcome, ' + params.username + '!</h2>',
    '<div style="width:40px;height:3px;background:#c9a227;border-radius:2px;margin:0 0 20px;"></div>',
    '<p style="margin:0 0 20px;color:#4a4c4e;font-size:15px;line-height:1.7;">Your <strong style="color:#0b1a7d;">Vyapar AI</strong> account for <strong>' + params.shopName + '</strong> is all set. Start managing your business smarter today.</p>',
    '<table role="presentation" style="width:100%;border-collapse:collapse;background:#f5f6ff;border-radius:10px;margin:0 0 24px;">',
    '<tr><td style="padding:20px 24px;">',
    '<p style="margin:0 0 12px;color:#0b1a7d;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">What you can do with Vyapar AI</p>',
    '<ul style="margin:0;padding-left:20px;color:#4a4c4e;font-size:14px;line-height:2;">',
    '<li>Track daily sales and expenses</li>',
    '<li>Manage credit (Udhaar) and follow up on overdue payments</li>',
    '<li>Upload receipts or CSV files for instant insights</li>',
    '<li>Get AI-powered explanations of your financial health</li>',
    '</ul>',
    '</td></tr></table>',
    '<table role="presentation" style="border-collapse:collapse;">',
    '<tr><td style="border-radius:10px;background:linear-gradient(135deg,#c9a227 0%,#e8c547 100%);">',
    '<a href="' + params.loginUrl + '" style="display:inline-block;padding:14px 36px;color:#1a1c1d;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;letter-spacing:0.3px;">Go to Vyapar AI &rarr;</a>',
    '</td></tr></table>',
    '</td></tr>',
    emailFooter(),
    '</table>',
    '</td></tr></table></body></html>',
  ].join('\n');

  try {
    await makeSesClient().send(new SendEmailCommand({
      Source: EMAIL_FROM_ADDRESS!,
      Destination: { ToAddresses: [params.to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: textBody, Charset: 'UTF-8' },
          Html: { Data: htmlBody, Charset: 'UTF-8' },
        },
      },
    }));
    logger.info('[SES] Welcome email sent', { to: params.to });
  } catch (error) {
    logger.error('[SES] Failed to send welcome email', { error, to: params.to });
  }
}
