import nodemailer from 'nodemailer';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export interface SmtpServerConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure?: boolean;
}

// In-memory runtime cache for custom SMTP settings saved by admin
let cachedSmtpConfig: SmtpServerConfig | null = null;
let lastSmtpFetchTime = 0;

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
    enabled: process.env.SMTP_ENABLED !== 'false',
    host: (process.env.SMTP_HOST || 'my.mailbux.com').replace(/['"]/g, '').trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    user: (process.env.SMTP_USER || 'admin@rpmdg.me').replace(/['"]/g, '').trim(),
    pass: (process.env.SMTP_PASS || 'Rpmdgadmin@2026#').replace(/['"]/g, '').trim(),
    from: (process.env.SMTP_FROM || 'AutoPrint Xerox Cloud <admin@rpmdg.me>').replace(/['"]/g, '').trim(),
    secure: Number(process.env.SMTP_PORT) === 465,
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
        cachedSmtpConfig = {
          enabled: dbSmtp.enabled !== undefined ? Boolean(dbSmtp.enabled) : envConfig.enabled,
          host: (dbSmtp.host || envConfig.host).trim(),
          port: Number(dbSmtp.port) || envConfig.port,
          user: (dbSmtp.user || envConfig.user).trim(),
          pass: (dbSmtp.pass || envConfig.pass).trim(),
          from: (dbSmtp.from || envConfig.from).trim(),
          secure: dbSmtp.secure !== undefined ? Boolean(dbSmtp.secure) : (Number(dbSmtp.port) === 465),
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

/**
 * Modern, Cool & Responsive HTML Email Templates
 */
export function generateOtpEmailHtml(params: {
  otp: string;
  purpose: 'signup' | 'login' | 'forgot_password' | 'resend';
  brandName?: string;
  recipientEmail: string;
  recipientName?: string;
}): { subject: string; html: string; text: string } {
  const { otp, purpose, brandName = 'KhataPro', recipientEmail, recipientName } = params;

  let title = 'Your Verification Code';
  let badgeText = 'Verification OTP';
  let badgeColor = '#4f46e5'; // Indigo
  let introMessage = 'Use the 6-digit verification code below to complete your authentication request.';
  let subject = `[${brandName}] Your Verification Code: ${otp}`;

  if (purpose === 'signup') {
    title = 'Welcome! Verify Your New Account';
    badgeText = 'Account Signup';
    badgeColor = '#059669'; // Emerald
    introMessage = `Hello${recipientName ? ' ' + recipientName : ''}, welcome to ${brandName}! Please enter this one-time code to verify your email and activate your business ledger vault.`;
    subject = `🎉 Welcome to ${brandName} — Verify Your Account (${otp})`;
  } else if (purpose === 'login') {
    title = 'Login Security Verification';
    badgeText = 'Secure Sign-In';
    badgeColor = '#4f46e5'; // Indigo
    introMessage = `A login attempt was initiated for your account (${recipientEmail}). Enter the code below to complete your sign-in.`;
    subject = `🔐 [${brandName}] Sign-In OTP: ${otp}`;
  } else if (purpose === 'forgot_password') {
    title = 'Password Reset Request';
    badgeText = 'Account Recovery';
    badgeColor = '#e11d48'; // Rose
    introMessage = `We received a request to reset the password for your ${brandName} account. Enter this code to set up a new password.`;
    subject = `🔑 [${brandName}] Password Reset Code: ${otp}`;
  } else if (purpose === 'resend') {
    title = 'New Verification Code';
    badgeText = 'Resent Code';
    badgeColor = '#d97706'; // Amber
    introMessage = `Here is your requested new verification code. All previous codes have been invalidated.`;
    subject = `🔄 [${brandName}] New Verification OTP: ${otp}`;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background: linear-gradient(180deg, #161e2e 0%, #0f172a 100%);
      border-radius: 24px;
      border: 1px solid #1e293b;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .header-bar {
      height: 6px;
      background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    }
    .content {
      padding: 40px 32px 32px;
      text-align: center;
    }
    .brand-logo-area {
      margin-bottom: 24px;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-transform: uppercase;
      background: linear-gradient(90deg, #818cf8 0%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: inline-block;
    }
    .badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      background-color: ${badgeColor}22;
      color: ${badgeColor};
      border: 1px solid ${badgeColor}44;
      margin-bottom: 16px;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #f8fafc;
      margin: 0 0 12px;
      letter-spacing: -0.3px;
    }
    .description {
      font-size: 13px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 28px;
    }
    .otp-box-wrapper {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
      border: 2px dashed #334155;
      border-radius: 20px;
      padding: 24px 16px;
      margin: 0 auto 28px;
      max-width: 380px;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .otp-code {
      font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 8px;
      color: #38bdf8;
      text-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
      margin: 0;
      padding-left: 8px; /* Balance letter-spacing */
    }
    .expiry-note {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #eab308;
      background: rgba(234, 179, 8, 0.1);
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1px solid rgba(234, 179, 8, 0.2);
      margin-bottom: 24px;
    }
    .security-notice {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 14px 16px;
      text-align: left;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }
    .security-notice strong {
      color: #94a3b8;
    }
    .footer {
      border-top: 1px solid #1e293b;
      padding: 24px 32px;
      background-color: #0b1120;
      text-align: center;
      font-size: 11px;
      color: #475569;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header-bar"></div>
      
      <div class="content">
        <div class="brand-logo-area">
          <div class="brand-name">⚡ ${brandName}</div>
        </div>

        <div>
          <span class="badge">${badgeText}</span>
        </div>

        <h1 class="title">${title}</h1>
        <p class="description">${introMessage}</p>

        <div class="otp-box-wrapper">
          <div class="otp-label">Your One-Time Password</div>
          <div class="otp-code">${otp}</div>
        </div>

        <div class="expiry-note">
          ⏱️ Valid for 10 minutes only
        </div>

        <div class="security-notice">
          🛡️ <strong>Security Tip:</strong> Never share this code with anyone. ${brandName} employees or support agents will never ask for your verification code or password. If you did not make this request, please ignore this email.
        </div>
      </div>

      <div class="footer">
        &copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.<br>
        Autonomous Financial Operating System &bull; High-Security Authentication
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `[${brandName}] ${title}\n\n${introMessage}\n\nYOUR VERIFICATION CODE: ${otp}\n\nThis code will expire in 10 minutes.\n\nSecurity Notice: Never share this OTP with anyone. If you did not request this code, please ignore this email.`;

  return { subject, html, text };
}

/**
 * Dispatches the OTP email via direct custom SMTP
 */
export async function sendOtpEmailDirect(params: {
  to: string;
  otp: string;
  purpose: 'signup' | 'login' | 'forgot_password' | 'resend';
  recipientName?: string;
  brandName?: string;
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

    const { subject, html, text } = generateOtpEmailHtml({
      otp: params.otp,
      purpose: params.purpose,
      brandName: params.brandName,
      recipientEmail: params.to,
      recipientName: params.recipientName,
    });

    const transporter = await createSmtpTransporter();

    const info = await transporter.sendMail({
      from: config.from,
      to: params.to,
      subject,
      text,
      html,
    });

    console.log(`[SMTP Mailer] OTP dispatched to ${params.to} | MessageId: ${info.messageId}`);
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
