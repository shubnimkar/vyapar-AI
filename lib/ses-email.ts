import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '@/lib/logger';

const SES_REGION = process.env.SES_REGION || 'ap-south-1';
const SES_ACCESS_KEY_ID = process.env.SES_ACCESS_KEY_ID;
const SES_SECRET_ACCESS_KEY = process.env.SES_SECRET_ACCESS_KEY;
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS;
const APP_BASE_URL = process.env.APP_BASE_URL;

function makeSesClient(): SESClient {
  return new SESClient({
    region: SES_REGION,
    credentials: SES_ACCESS_KEY_ID && SES_SECRET_ACCESS_KEY
      ? {
          accessKeyId: SES_ACCESS_KEY_ID,
          secretAccessKey: SES_SECRET_ACCESS_KEY,
        }
      : undefined,
  });
}

function isEmailConfigured(): boolean {
  return Boolean(EMAIL_FROM_ADDRESS && APP_BASE_URL);
}

function getBrandLogoUrl(): string | null {
  if (!APP_BASE_URL) return null;
  return `${APP_BASE_URL}/background-removed.png`;
}

function emailHeader(logoUrl?: string | null, eyebrow?: string): string {
  const logoMarkup = logoUrl
    ? `<img src="${logoUrl}" alt="Vyapar AI" width="88" style="display:block;margin:0 auto 18px;height:auto;max-width:88px;" />`
    : '';

  const eyebrowMarkup = eyebrow
    ? `<p style="margin:0 0 10px;color:#f4d77b;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">${eyebrow}</p>`
    : '';

  return [
    '<tr>',
    '<td style="background:linear-gradient(135deg,#0b1a7d 0%,#1636b8 58%,#2446d8 100%);padding:36px 30px;text-align:center;border-radius:16px 16px 0 0;">',
    logoMarkup,
    eyebrowMarkup,
    '<h1 style="margin:0;color:#ffffff;font-size:30px;font-weight:700;letter-spacing:-0.5px;">Vyapar AI</h1>',
    '<p style="margin:10px 0 0;color:rgba(255,255,255,0.88);font-size:14px;line-height:1.6;">Smart business operations with trusted blue-and-gold clarity.</p>',
    '</td>',
    '</tr>',
  ].join('');
}

function emailFooter(params?: { note?: string; automatedMessage?: string }): string {
  const note = params?.note || 'Please do not reply to this automated email.';
  const automatedMessage = params?.automatedMessage || 'Vyapar AI helps you stay on top of sales, expenses, udhaar, and business health.';

  return [
    '<tr>',
    '<td style="padding:28px 30px;background-color:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;">',
    '<p style="margin:0 0 12px;color:#475569;font-size:13px;line-height:1.7;">' + automatedMessage + '</p>',
    '<p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.7;">' + note + '</p>',
    '<p style="margin:14px 0 0;color:#64748b;font-size:12px;line-height:1.6;">© ' + new Date().getFullYear() + ' Vyapar AI. All rights reserved.</p>',
    '</td>',
    '</tr>',
  ].join('');
}

function wrapEmailHtml(contentRows: string, options?: { logoUrl?: string | null; eyebrow?: string; footerNote?: string; footerMessage?: string }): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '</head>',
    '<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;background-color:#eef2ff;">',
    '<table role="presentation" style="width:100%;border-collapse:collapse;background:radial-gradient(circle at top,#e8edff 0%,#eef2ff 45%,#f8fafc 100%);">',
    '<tr>',
    '<td align="center" style="padding:40px 20px;">',
    '<table role="presentation" style="max-width:600px;width:100%;border-collapse:collapse;background-color:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(11,26,125,0.12);overflow:hidden;">',
    emailHeader(options?.logoUrl, options?.eyebrow),
    contentRows,
    emailFooter({ note: options?.footerNote, automatedMessage: options?.footerMessage }),
    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
}

export async function sendPasswordResetEmail(params: { to: string; resetUrl: string }): Promise<void> {
  if (!isEmailConfigured()) {
    logger.warn('[SES] EMAIL_FROM_ADDRESS/APP_BASE_URL not set; skipping email send', {
      to: params.to,
    });
    return;
  }

  const client = makeSesClient();
  const logoUrl = getBrandLogoUrl();

  const subject = 'Reset Your Vyapar AI Password';
  const textBody = buildPasswordResetText(params);

  const htmlBody = buildPasswordResetHtml(params);

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

export function buildPasswordResetText(params: { resetUrl: string }): string {
  return `Hello,

We received a request to reset your Vyapar AI password.

Reset your password using the following link (valid for 1 hour):
${params.resetUrl}

If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.

For security reasons, this link expires in 1 hour.

--
Vyapar AI Team
Empowering Your Business Intelligence`;
}

export function buildPasswordResetHtml(params: { resetUrl: string }): string {
  const logoUrl = getBrandLogoUrl();
  return wrapEmailHtml(
    [
      '<tr>',
      '<td style="padding:40px 30px;">',
      '<h2 style="margin:0 0 14px;color:#0b1a7d;font-size:24px;font-weight:700;line-height:1.35;">Reset your password</h2>',
      '<div style="width:44px;height:3px;background:#c9a227;border-radius:999px;margin:0 0 20px;"></div>',
      '<p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:1.7;">Hello,</p>',
      '<p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.7;">We received a request to reset your <strong style="color:#0b1a7d;">Vyapar AI</strong> password. Use the button below to create a new password.</p>',
      '<table role="presentation" style="margin:0 0 24px;border-collapse:collapse;">',
      '<tr><td align="center" style="border-radius:10px;background:linear-gradient(135deg,#0b1a7d 0%,#2446d8 100%);box-shadow:0 8px 18px rgba(11,26,125,0.18);">',
      '<a href="' + params.resetUrl + '" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;border-radius:10px;">Reset Password</a>',
      '</td></tr>',
      '</table>',
      '<p style="margin:0 0 8px;color:#64748b;font-size:14px;line-height:1.6;">Or copy and paste this link into your browser:</p>',
      '<p style="margin:0 0 24px;color:#1636b8;font-size:14px;line-height:1.7;word-break:break-all;"><a href="' + params.resetUrl + '" style="color:#1636b8;text-decoration:underline;">' + params.resetUrl + '</a></p>',
      '<table role="presentation" style="width:100%;border-collapse:collapse;background:#fffaf0;border:1px solid #f0dfaa;border-left:4px solid #c9a227;border-radius:10px;">',
      '<tr><td style="padding:18px 18px 18px 16px;">',
      '<p style="margin:0 0 8px;color:#735c00;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Link expiry</p>',
      '<p style="margin:0;color:#5b6470;font-size:14px;line-height:1.7;">This reset link is valid for <strong>1 hour</strong> only. If you did not request this, you can safely ignore this email.</p>',
      '</td></tr>',
      '</table>',
      '</td>',
      '</tr>',
    ].join(''),
    {
      logoUrl,
      eyebrow: 'Security Notice',
      footerNote: 'This is an automated security email. Please do not reply.',
      footerMessage: 'If you did not request this password reset, your password will remain unchanged.',
    }
  );
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

  const subject = 'Welcome to Vyapar AI - Your shop is ready!';

  const textBody = buildWelcomeEmailText(params);

  const htmlBody = buildWelcomeEmailHtml(params);

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

export function buildWelcomeEmailText(params: {
  username: string;
  shopName: string;
  loginUrl: string;
}): string {
  return [
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
}

export function buildWelcomeEmailHtml(params: {
  username: string;
  shopName: string;
  loginUrl: string;
}): string {
  const logoUrl = getBrandLogoUrl();
  return wrapEmailHtml(
    [
      '<tr><td style="padding:36px 30px;">',
      '<h2 style="margin:0 0 6px;color:#0b1a7d;font-size:24px;font-weight:700;">Welcome, ' + params.username + '!</h2>',
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
      '<table role="presentation" style="width:100%;border-collapse:collapse;background:#fffaf0;border:1px solid #f0dfaa;border-radius:10px;margin:0 0 24px;">',
      '<tr><td style="padding:18px 20px;">',
      '<p style="margin:0 0 8px;color:#735c00;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Your setup is ready</p>',
      '<p style="margin:0;color:#5b6470;font-size:14px;line-height:1.7;">Use the button below to sign in and start with your first entry, credit record, or report.</p>',
      '</td></tr></table>',
      '<table role="presentation" style="border-collapse:collapse;">',
      '<tr><td style="border-radius:10px;background:linear-gradient(135deg,#c9a227 0%,#e8c547 100%);box-shadow:0 8px 18px rgba(201,162,39,0.28);">',
      '<a href="' + params.loginUrl + '" style="display:inline-block;padding:14px 36px;color:#1a1c1d;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;letter-spacing:0.3px;">Go to Vyapar AI &rarr;</a>',
      '</td></tr></table>',
      '</td></tr>',
    ].join(''),
    {
      logoUrl,
      eyebrow: 'Welcome Aboard',
      footerNote: 'This is an automated onboarding email. Please do not reply.',
      footerMessage: 'You can return anytime to continue tracking your shop with the same blue-and-gold Vyapar AI workspace.',
    }
  );
}

export function buildReportReadyEmailText(params: {
  username: string;
  reportPeriodLabel: string;
  reportUrl: string;
  keyInsight: string;
}): string {
  return [
    'Hi ' + params.username + ',',
    '',
    'Your ' + params.reportPeriodLabel + ' Vyapar AI report is ready.',
    '',
    'Key insight:',
    params.keyInsight,
    '',
    'Open your report here: ' + params.reportUrl,
    '',
    '-- Vyapar AI Team',
  ].join('\n');
}

export function buildReportReadyEmailHtml(params: {
  username: string;
  reportPeriodLabel: string;
  reportUrl: string;
  keyInsight: string;
  scoreLabel?: string;
  scoreValue?: string;
}): string {
  const logoUrl = getBrandLogoUrl();
  return wrapEmailHtml(
    [
      '<tr><td style="padding:36px 30px;">',
      '<h2 style="margin:0 0 6px;color:#0b1a7d;font-size:24px;font-weight:700;">Your ' + params.reportPeriodLabel + ' report is ready</h2>',
      '<div style="width:40px;height:3px;background:#c9a227;border-radius:2px;margin:0 0 20px;"></div>',
      '<p style="margin:0 0 16px;color:#4a4c4e;font-size:15px;line-height:1.7;">Hi <strong>' + params.username + '</strong>, your latest business summary is ready to review in <strong style="color:#0b1a7d;">Vyapar AI</strong>.</p>',
      '<table role="presentation" style="width:100%;border-collapse:collapse;background:#f5f6ff;border-radius:10px;margin:0 0 20px;">',
      '<tr><td style="padding:20px 24px;">',
      '<p style="margin:0 0 8px;color:#0b1a7d;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Key insight</p>',
      '<p style="margin:0;color:#475569;font-size:15px;line-height:1.8;">' + params.keyInsight + '</p>',
      '</td></tr></table>',
      ((params.scoreLabel || params.scoreValue)
        ? '<table role="presentation" style="width:100%;border-collapse:collapse;background:#fffaf0;border:1px solid #f0dfaa;border-radius:10px;margin:0 0 24px;">' +
          '<tr><td style="padding:18px 20px;">' +
          '<p style="margin:0 0 8px;color:#735c00;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">' + (params.scoreLabel || 'Highlighted metric') + '</p>' +
          '<p style="margin:0;color:#5b6470;font-size:24px;font-weight:700;line-height:1.4;">' + (params.scoreValue || '') + '</p>' +
          '</td></tr></table>'
        : ''),
      '<table role="presentation" style="border-collapse:collapse;">',
      '<tr><td style="border-radius:10px;background:linear-gradient(135deg,#0b1a7d 0%,#2446d8 100%);box-shadow:0 8px 18px rgba(11,26,125,0.18);">',
      '<a href="' + params.reportUrl + '" style="display:inline-block;padding:14px 36px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;letter-spacing:0.3px;">Open Report</a>',
      '</td></tr></table>',
      '</td></tr>',
    ].join(''),
    {
      logoUrl,
      eyebrow: 'Report Ready',
      footerNote: 'This is an automated report notification email. Please do not reply.',
      footerMessage: 'Use this summary to spot trends faster and take action on margin, cash flow, and overdue credit.',
    }
  );
}
