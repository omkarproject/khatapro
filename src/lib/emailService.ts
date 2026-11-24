import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getGlobalBrandingFromDb } from '@/lib/globalBranding';

export interface SmtpTriggersConfig {
  signupOtp: boolean;
  loginOtp: boolean;
  forgotPasswordOtp: boolean;
  welcomeEmail: boolean;
}

export interface SmtpServerConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure?: boolean;
  triggers: SmtpTriggersConfig;
}

// In-memory runtime cache for custom SMTP settings saved by admin
let cachedSmtpConfig: SmtpServerConfig | null = null;
let lastSmtpFetchTime = 0;

export const DEFAULT_SMTP_TRIGGERS: SmtpTriggersConfig = {
  signupOtp: true,
  loginOtp: false,
  forgotPasswordOtp: true,
  welcomeEmail: true,
};

/**
 * Resolves the active SMTP configuration:
 * 1. Database (global_config table in Supabase) if configured
 * 2. Environment variables (.env) as default
 */
export async function getActiveSmtpConfig(): Promise<SmtpServerConfig> {
  const now = Date.now();
  if (cachedSmtpConfig && now - lastSmtpFetchTime < 30000) {
    return cachedSmtpConfig;
  }

  // Default from .env
  const envConfig: SmtpServerConfig = {
    enabled: process.env.SMTP_ENABLED !== 'false' && Boolean(process.env.SMTP_HOST),
    host: (process.env.SMTP_HOST || '').replace(/['"]/g, '').trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    user: (process.env.SMTP_USER || '').replace(/['"]/g, '').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/['"]/g, '').trim(),
    from: (process.env.SMTP_FROM || 'SmartKhata Cloud').replace(/['"]/g, '').trim(),
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    triggers: { ...DEFAULT_SMTP_TRIGGERS },
  };

  if (!isSupabaseConfigured()) {
    cachedSmtpConfig = envConfig;
    lastSmtpFetchTime = now;
    return envConfig;
  }

  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase
        .from('global_config')
        .select('maintenance_mode')
        .eq('id', 'global_config')
        .maybeSingle();

      const maint = data?.maintenance_mode;
      if (maint && typeof maint === 'object' && maint.smtpSettings) {
        const dbSmtp = maint.smtpSettings;
        const rawTriggers = dbSmtp.triggers || {};
        cachedSmtpConfig = {
          enabled: dbSmtp.enabled !== undefined ? Boolean(dbSmtp.enabled) : envConfig.enabled,
          host: (dbSmtp.host || envConfig.host).trim(),
          port: Number(dbSmtp.port) || envConfig.port,
          user: (dbSmtp.user || envConfig.user).trim(),
          pass: (dbSmtp.pass || envConfig.pass).trim(),
          from: (dbSmtp.from || envConfig.from).trim(),
          secure: dbSmtp.secure !== undefined ? Boolean(dbSmtp.secure) : (Number(dbSmtp.port) === 465),
          triggers: {
            signupOtp: rawTriggers.signupOtp !== undefined ? Boolean(rawTriggers.signupOtp) : DEFAULT_SMTP_TRIGGERS.signupOtp,
            loginOtp: rawTriggers.loginOtp !== undefined ? Boolean(rawTriggers.loginOtp) : DEFAULT_SMTP_TRIGGERS.loginOtp,
            forgotPasswordOtp: rawTriggers.forgotPasswordOtp !== undefined ? Boolean(rawTriggers.forgotPasswordOtp) : DEFAULT_SMTP_TRIGGERS.forgotPasswordOtp,
            welcomeEmail: rawTriggers.welcomeEmail !== undefined ? Boolean(rawTriggers.welcomeEmail) : DEFAULT_SMTP_TRIGGERS.welcomeEmail,
          },
        };
        lastSmtpFetchTime = now;
        return cachedSmtpConfig;
      }
    }
  } catch (err) {
    console.warn('Could not read custom SMTP config from database, using env:', err);
  }

  cachedSmtpConfig = envConfig;
  lastSmtpFetchTime = now;
  return envConfig;
}

export function invalidateSmtpCache() {
  cachedSmtpConfig = null;
  lastSmtpFetchTime = 0;
}

/**
 * Creates a Nodemailer Transporter using current SMTP configuration
 */
export async function createSmtpTransporter() {
  const config = await getActiveSmtpConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false, // Ensures compatibility with various mail servers
    },
  });
}

export interface EmailLogoResult {
  imgTag: string;
  attachments: Array<{
    filename: string;
    content: Buffer;
    cid: string;
    contentType: string;
  }>;
}

/**
 * Robust Email Logo Resolver:
 * - Base64 Data URLs: Extracted into binary Buffer and attached as true MIME inline CID attachments (works 100% in Gmail, Outlook, Yahoo, Apple Mail).
 * - HTTP/HTTPS URLs: Rendered as standard direct image URLs.
 * - Local /public image: Read from filesystem and attached as CID attachment.
 * - Missing/Invalid: Falls back to clean empty string (NO broken image icons rendered).
 */
export function resolveEmailLogo(rawLogo?: string, brandName = 'SmartKhata'): EmailLogoResult {
  const attachments: Array<{
    filename: string;
    content: Buffer;
    cid: string;
    contentType: string;
  }> = [];

  const trimmed = rawLogo?.trim() || '';
  const cidName = 'brand_logo_cid@smartkhata';

  // 1. Base64 Data URL (e.g. data:image/png;base64,... or data:image/jpeg;base64,...)
  if (trimmed.startsWith('data:image/')) {
    const match = trimmed.match(/^data:image\/([a-zA-Z0-9-+.]+);base64,(.+)$/);
    if (match) {
      const rawExt = match[1].toLowerCase();
      const base64Data = match[2];
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = rawExt.includes('jpeg') ? 'jpg' : rawExt.includes('png') ? 'png' : 'png';
        const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        attachments.push({
          filename: `brand-logo.${ext}`,
          content: buffer,
          cid: cidName,
          contentType,
        });
        return {
          imgTag: `<img src="cid:${cidName}" alt="${brandName}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 12px; display: inline-block; border-radius: 8px;" /><br>`,
          attachments,
        };
      } catch (err) {
        console.warn('[emailService] Error converting base64 logo to CID attachment:', err);
      }
    }
  }

  // 2. Direct HTTP or HTTPS URL (accessible by external mail proxies)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      imgTag: `<img src="${trimmed}" alt="${brandName}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 12px; display: inline-block; border-radius: 8px;" /><br>`,
      attachments: [],
    };
  }

  // 3. Local filesystem fallback from public/ folder
  try {
    const publicDir = path.join(process.cwd(), 'public');
    let targetFile = '';

    if (trimmed && (trimmed.startsWith('/') || trimmed.endsWith('.png') || trimmed.endsWith('.jpg'))) {
      const cleanRel = trimmed.replace(/^\//, '');
      const testPath = path.join(publicDir, cleanRel);
      if (fs.existsSync(testPath)) {
        targetFile = testPath;
      }
    }

    if (!targetFile) {
      const defaultLogo = path.join(publicDir, 'brand-logo.png');
      if (fs.existsSync(defaultLogo)) {
        targetFile = defaultLogo;
      }
    }

    if (targetFile && fs.existsSync(targetFile)) {
      const fileBuffer = fs.readFileSync(targetFile);
      const ext = path.extname(targetFile).replace('.', '').toLowerCase() || 'png';
      attachments.push({
        filename: path.basename(targetFile),
        content: fileBuffer,
        cid: cidName,
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      });
      return {
        imgTag: `<img src="cid:${cidName}" alt="${brandName}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 12px; display: inline-block; border-radius: 8px;" /><br>`,
        attachments,
      };
    }
  } catch (err) {
    console.warn('[emailService] Local filesystem logo read error:', err);
  }

  // Fallback: If no image is valid, return empty string so no broken placeholder shows
  return {
    imgTag: '',
    attachments: [],
  };
}

export interface OtpEmailTemplateParams {
  otp: string;
  purpose: 'signup' | 'login' | 'forgot_password' | 'resend';
  brandName?: string;
  badgeText?: string;
  brandLogo?: string;
  logoImgTag?: string;
  recipientEmail: string;
  recipientName?: string;
}

/**
 * Modern, Cool & Responsive HTML Email Templates
 * Automatically synchronizes with Website Identity & Branding ("Brand Display Name *" and "Badge Text")
 */
export function generateOtpEmailHtml(params: OtpEmailTemplateParams): { subject: string; html: string; text: string } {
  const { otp, purpose, brandName = 'SmartKhata', recipientEmail, recipientName } = params;
  const cleanBrandName = (brandName || 'SmartKhata').replace(/[^a-zA-Z0-9\s.-]/g, '').trim() || 'SmartKhata';

  let title = 'Verification Code';
  let introMessage = 'Use the verification code below to complete your authentication:';
  let subject = `${cleanBrandName} - Your verification code is ${otp}`;
  let purposeBadge = 'Verification Code';

  if (purpose === 'signup') {
    title = 'Verify Your Email Address';
    purposeBadge = 'Account Activation';
    introMessage = `Welcome${recipientName ? ' ' + recipientName : ''}! Thank you for creating an account. Please enter the verification code below to verify your email address:`;
    subject = `${cleanBrandName} - Your verification code is ${otp}`;
  } else if (purpose === 'login') {
    title = 'Sign-In Verification';
    purposeBadge = 'Sign-In Security';
    introMessage = `A sign-in request was initiated for your account (${recipientEmail}). Enter the verification code below to complete your sign-in:`;
    subject = `${cleanBrandName} - Your sign-in code is ${otp}`;
  } else if (purpose === 'forgot_password') {
    title = 'Password Reset Request';
    purposeBadge = 'Password Reset';
    introMessage = `We received a request to reset your password for ${cleanBrandName}. Enter the verification code below to set up a new password:`;
    subject = `${cleanBrandName} - Password reset code: ${otp}`;
  } else if (purpose === 'resend') {
    title = 'New Verification Code';
    purposeBadge = 'New Code';
    introMessage = 'Here is your new one-time verification code:';
    subject = `${cleanBrandName} - Your verification code is ${otp}`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 20px 28px; text-align: left;">
              <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 18px;">
                ${cleanBrandName}
              </div>
              <h1 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 12px 0;">
                ${title}
              </h1>
              <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
                ${introMessage}
              </p>
              <div style="background-color: #f1f5f9; border-radius: 6px; border: 1px solid #cbd5e1; padding: 18px; text-align: center; margin: 20px 0;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 6px; font-weight: 600;">
                  ${purposeBadge}
                </div>
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a; display: inline-block;">
                  ${otp}
                </span>
              </div>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0 0;">
                This code is valid for 10 minutes. If you did not make this request, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: left; font-size: 12px; color: #94a3b8; line-height: 1.4;">
              &copy; ${new Date().getFullYear()} ${cleanBrandName}. All rights reserved.<br>
              Automated message sent to ${recipientEmail}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${cleanBrandName} - ${title}\n\n${introMessage}\n\nVERIFICATION CODE: ${otp}\n\nThis code is valid for 10 minutes.\nIf you did not make this request, please ignore this email.\n\n© ${new Date().getFullYear()} ${cleanBrandName}. All rights reserved.`;

  return { subject, html, text };
}

/**
 * Dispatches the OTP email via direct custom SMTP
 * Automatically reads live "Brand Display Name *" and "Badge Text" from Database
 */
export async function sendOtpEmailDirect(params: {
  to: string;
  otp: string;
  purpose: 'signup' | 'login' | 'forgot_password' | 'resend';
  recipientName?: string;
  brandName?: string;
  badgeText?: string;
  brandLogo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await getActiveSmtpConfig();

    if (!config.enabled) {
      return {
        success: false,
        error: 'Email verification is currently turned OFF by system administrator.',
      };
    }

    if (!config.host || !config.user || !config.pass) {
      return {
        success: false,
        error: 'SMTP credentials are not configured. Please check SMTP settings in Admin Settings.',
      };
    }

    // Always fetch latest live Brand Display Name & Badge directly from Database
    let liveBrandName = params.brandName?.trim();
    let liveBadgeText = params.badgeText?.trim() || '';
    let liveLogo = params.brandLogo?.trim() || '';

    try {
      const globalBrand = await getGlobalBrandingFromDb();
      if (globalBrand.websiteName && globalBrand.websiteName.trim()) {
        liveBrandName = globalBrand.websiteName.trim();
      }
      if (globalBrand.websiteBadgeText && globalBrand.websiteBadgeText.trim()) {
        liveBadgeText = globalBrand.websiteBadgeText.trim();
      }
      if (globalBrand.websiteLogo && globalBrand.websiteLogo.trim()) {
        liveLogo = globalBrand.websiteLogo.trim();
      }
    } catch (err) {
      console.warn('[emailService] Could not resolve live branding from DB:', err);
    }

    const finalBrandName = liveBrandName || 'KhataPro';

    const { imgTag: logoImgTag, attachments: logoAttachments } = resolveEmailLogo(liveLogo, finalBrandName);

    const { subject, html, text } = generateOtpEmailHtml({
      otp: params.otp,
      purpose: params.purpose,
      brandName: finalBrandName,
      badgeText: liveBadgeText,
      brandLogo: liveLogo,
      logoImgTag,
      recipientEmail: params.to,
      recipientName: params.recipientName,
    });

    const transporter = await createSmtpTransporter();

    // Display name: use custom configured display name (without <email>), or live Brand Display Name
    let displayName = config.from ? config.from.replace(/<[^>]+>/g, '').replace(/['"]/g, '').trim() : '';
    if (!displayName || displayName.toLowerCase() === 'khatapro' || displayName.toLowerCase() === 'smartkhata') {
      displayName = finalBrandName;
    }

    // Auto background attach SMTP Username / Mailbox Email as the sender address:
    const senderEmail = config.user.trim();
    const formattedFrom = `"${displayName}" <${senderEmail}>`;
    const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1] : 'smartkhata.app';
    const cleanMessageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 10)}@${senderDomain}>`;

    const info = await transporter.sendMail({
      from: formattedFrom,
      to: params.to,
      replyTo: senderEmail,
      subject,
      text,
      html,
      attachments: logoAttachments && logoAttachments.length > 0 ? logoAttachments : undefined,
      messageId: cleanMessageId,
      envelope: {
        from: senderEmail,
        to: params.to,
      },
      headers: {
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      },
    });

    console.log(`[SMTP Mailer] OTP dispatched to ${params.to} using live brand "${finalBrandName}" | MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error('[SMTP Mailer] Failed to dispatch email:', err);
    return {
      success: false,
      error: err.message || 'SMTP server error while sending email.',
    };
  }
}


/**
 * Simple, Clean & Responsive HTML Welcome Email for New Signups
 * Designed to ensure high deliverability and avoid spam/junk filters
 */
export function generateWelcomeEmailHtml(params: {
  recipientEmail: string;
  recipientName?: string;
  brandName?: string;
  badgeText?: string;
  brandLogo?: string;
  logoImgTag?: string;
  portalUrl?: string;
}): { subject: string; html: string; text: string } {
  const { recipientEmail, recipientName, brandName = 'KhataPro', portalUrl } = params;
  const cleanBrandName = brandName.trim() || 'KhataPro';
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
  const subject = `Welcome to ${cleanBrandName} - Your account is ready`;
  const targetUrl = portalUrl || 'https://smartkhata.netsell.in/login';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${cleanBrandName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 20px 28px; text-align: left;">
              <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 18px;">
                ${cleanBrandName}
              </div>
              <h1 style="font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 12px 0;">
                Welcome to ${cleanBrandName}
              </h1>
              <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 16px 0;">
                ${greeting}
              </p>
              <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
                Your merchant account has been registered and activated successfully. You can now manage your digital ledger, track customer payments, and create GST invoices with ease.
              </p>
              <div style="background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; padding: 16px 20px; margin: 20px 0;">
                <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">
                  What you can do with your account:
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.6;">
                  <li>Digital Khata &amp; customer credit tracking</li>
                  <li>Instant UPI collections with dynamic QR</li>
                  <li>GST billing, invoices, and payment receipts</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 24px 0 16px 0;">
                <a href="${targetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  Sign In to Your Dashboard &rarr;
                </a>
              </div>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0 0;">
                Registered Email: <strong>${recipientEmail}</strong><br>
                For your security, never share your login credentials or verification codes with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: left; font-size: 12px; color: #94a3b8; line-height: 1.4;">
              &copy; ${new Date().getFullYear()} ${cleanBrandName}. All rights reserved.<br>
              This is an automated account notification.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Welcome to ${cleanBrandName}!\n\n${greeting}\n\nYour merchant account has been registered and activated successfully.\n\nWith ${cleanBrandName}, you can:\n- Manage customer credit & khata ledger\n- Collect instant UPI payments via QR\n- Generate GST invoices & receipts\n\nSign in to your dashboard here:\n${targetUrl}\n\nRegistered Email: ${recipientEmail}\n\n© ${new Date().getFullYear()} ${cleanBrandName}. All rights reserved.`;

  return { subject, html, text };
}

/**
 * Dispatches the Welcome Email to a newly registered or verified user
 */
export async function sendWelcomeEmailDirect(params: {
  to: string;
  recipientName?: string;
  brandName?: string;
  badgeText?: string;
  brandLogo?: string;
  portalUrl?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await getActiveSmtpConfig();

    if (!config.enabled) {
      return { success: false, error: 'SMTP is disabled.' };
    }

    if (config.triggers && config.triggers.welcomeEmail === false) {
      console.log('[WelcomeEmail] Welcome email is turned OFF in SMTP triggers.');
      return { success: true, error: 'Welcome email trigger is deactivated.' };
    }

    if (!config.host || !config.user || !config.pass) {
      return { success: false, error: 'SMTP credentials missing.' };
    }

    // Resolve live brand
    let liveBrandName = params.brandName?.trim();
    let liveBadgeText = params.badgeText?.trim() || '';
    let liveLogo = params.brandLogo?.trim() || '';

    try {
      const globalBrand = await getGlobalBrandingFromDb();
      if (globalBrand.websiteName && globalBrand.websiteName.trim()) {
        liveBrandName = globalBrand.websiteName.trim();
      }
      if (globalBrand.websiteBadgeText && globalBrand.websiteBadgeText.trim()) {
        liveBadgeText = globalBrand.websiteBadgeText.trim();
      }
      if (globalBrand.websiteLogo && globalBrand.websiteLogo.trim()) {
        liveLogo = globalBrand.websiteLogo.trim();
      }
    } catch {}

    const finalBrandName = liveBrandName || 'KhataPro';

    const { imgTag: logoImgTag, attachments: logoAttachments } = resolveEmailLogo(liveLogo, finalBrandName);

    const { subject, html, text } = generateWelcomeEmailHtml({
      recipientEmail: params.to,
      recipientName: params.recipientName,
      brandName: finalBrandName,
      badgeText: liveBadgeText,
      brandLogo: liveLogo,
      logoImgTag,
      portalUrl: params.portalUrl,
    });

    const transporter = await createSmtpTransporter();

    let displayName = config.from ? config.from.replace(/<[^>]+>/g, '').replace(/['"]/g, '').trim() : '';
    if (!displayName || displayName.toLowerCase() === 'khatapro' || displayName.toLowerCase() === 'smartkhata') {
      displayName = finalBrandName;
    }

    const senderEmail = config.user.trim();
    const formattedFrom = `"${displayName}" <${senderEmail}>`;
    const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1] : 'smartkhata.app';
    const cleanMessageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 10)}@${senderDomain}>`;

    const info = await transporter.sendMail({
      from: formattedFrom,
      to: params.to,
      replyTo: senderEmail,
      subject,
      text,
      html,
      attachments: logoAttachments && logoAttachments.length > 0 ? logoAttachments : undefined,
      messageId: cleanMessageId,
      envelope: {
        from: senderEmail,
        to: params.to,
      },
      headers: {
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      },
    });

    console.log(`[WelcomeEmail] Welcome email delivered to ${params.to} | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[WelcomeEmail] Failed to send welcome email:', err);
    return { success: false, error: err.message };
  }
}
