import nodemailer from 'nodemailer';
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
    enabled: process.env.SMTP_ENABLED !== 'false',
    host: (process.env.SMTP_HOST || 'my.mailbux.com').replace(/['"]/g, '').trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    user: (process.env.SMTP_USER || 'admin@rpmdg.me').replace(/['"]/g, '').trim(),
    pass: (process.env.SMTP_PASS || 'Rpmdgadmin@2026#').replace(/['"]/g, '').trim(),
    from: (process.env.SMTP_FROM || 'AutoPrint Xerox Cloud').replace(/['"]/g, '').trim(),
    secure: Number(process.env.SMTP_PORT) === 465,
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

export interface OtpEmailTemplateParams {
  otp: string;
  purpose: 'signup' | 'login' | 'forgot_password' | 'resend';
  brandName?: string;
  badgeText?: string;
  brandLogo?: string;
  recipientEmail: string;
  recipientName?: string;
}

/**
 * Modern, Cool & Responsive HTML Email Templates
 * Automatically synchronizes with Website Identity & Branding ("Brand Display Name *" and "Badge Text")
 */
export function generateOtpEmailHtml(params: OtpEmailTemplateParams): { subject: string; html: string; text: string } {
  const { otp, purpose, brandName = 'KhataPro', badgeText: customBadgeText, brandLogo, recipientEmail, recipientName } = params;
  const cleanBrandName = brandName.trim() || 'KhataPro';
  const cleanBadgeText = customBadgeText?.trim() || '';

  let title = 'Your Verification Code';
  let badgeText = 'Verification OTP';
  let badgeColor = '#4f46e5'; // Indigo
  let introMessage = 'Use the 6-digit verification code below to complete your authentication request.';
  let subject = `[${cleanBrandName}] Your Verification Code: ${otp}`;

  if (purpose === 'signup') {
    title = 'Welcome! Verify Your New Account';
    badgeText = 'Account Signup';
    badgeColor = '#059669'; // Emerald
    introMessage = `Hello${recipientName ? ' ' + recipientName : ''}, welcome to ${cleanBrandName}! Please enter this one-time code to verify your email and activate your business ledger vault.`;
    subject = `🎉 Welcome to ${cleanBrandName} — Verify Your Account (${otp})`;
  } else if (purpose === 'login') {
    title = 'Login Security Verification';
    badgeText = 'Secure Sign-In';
    badgeColor = '#4f46e5'; // Indigo
    introMessage = `A login attempt was initiated for your account (${recipientEmail}). Enter the code below to complete your sign-in.`;
    subject = `🔐 [${cleanBrandName}] Sign-In OTP: ${otp}`;
  } else if (purpose === 'forgot_password') {
    title = 'Password Reset Request';
    badgeText = 'Account Recovery';
    badgeColor = '#e11d48'; // Rose
    introMessage = `We received a request to reset the password for your ${cleanBrandName} account. Enter this code to set up a new password.`;
    subject = `🔑 [${cleanBrandName}] Password Reset Code: ${otp}`;
  } else if (purpose === 'resend') {
    title = 'New Verification Code';
    badgeText = 'Resent Code';
    badgeColor = '#d97706'; // Amber
    introMessage = `Here is your requested new verification code. All previous codes have been invalidated.`;
    subject = `🔄 [${cleanBrandName}] New Verification OTP: ${otp}`;
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
      background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 50%, #10b981 100%);
    }
    .content {
      padding: 36px 32px 32px;
      text-align: center;
    }
    .brand-logo-area {
      margin-bottom: 24px;
    }
    .brand-header-row {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .brand-name {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      display: inline-block;
      vertical-align: middle;
    }
    .brand-badge-tag {
      display: inline-block;
      vertical-align: middle;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      border: 1px solid rgba(165, 180, 252, 0.35);
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: ${badgeColor}22;
      color: ${badgeColor};
      border: 1px solid ${badgeColor}44;
      margin-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }
    .description {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 28px 0;
    }
    .otp-box-wrapper {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 24px 20px;
      margin: 0 auto 20px auto;
      text-align: center;
      max-width: 380px;
    }
    .otp-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .otp-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 40px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #38bdf8;
      text-indent: 8px;
    }
    .expiry-note {
      font-size: 12px;
      color: #eab308;
      margin-bottom: 28px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .security-notice {
      background-color: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 12px;
      line-height: 1.5;
      color: #94a3b8;
      text-align: left;
      border-left: 3px solid #6366f1;
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
          ${brandLogo ? `<img src="${brandLogo}" alt="${cleanBrandName}" style="max-height: 44px; max-width: 170px; object-fit: contain; margin-bottom: 12px; display: inline-block; border-radius: 8px;" /><br>` : ''}
          <div class="brand-header-row">
            <span class="brand-name">⚡ ${cleanBrandName}</span>
            ${cleanBadgeText ? `<span class="brand-badge-tag">${cleanBadgeText}</span>` : ''}
          </div>
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
          🛡️ <strong>Security Tip:</strong> Never share this code with anyone. ${cleanBrandName} employees or support agents will never ask for your verification code or password. If you did not make this request, please ignore this email.
        </div>
      </div>

      <div class="footer">
        &copy; ${new Date().getFullYear()} ${cleanBrandName}${cleanBadgeText ? ' &bull; ' + cleanBadgeText : ''}. All rights reserved.<br>
        Autonomous Financial Operating System &bull; High-Security Authentication
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `[${cleanBrandName}] ${title}\n\n${introMessage}\n\nYOUR VERIFICATION CODE: ${otp}\n\nThis code will expire in 10 minutes.\n\nSecurity Notice: Never share this OTP with anyone. If you did not request this code, please ignore this email.`;

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

    const { subject, html, text } = generateOtpEmailHtml({
      otp: params.otp,
      purpose: params.purpose,
      brandName: finalBrandName,
      badgeText: liveBadgeText,
      brandLogo: liveLogo,
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

    const info = await transporter.sendMail({
      from: formattedFrom,
      to: params.to,
      subject,
      text,
      html,
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
 * Modern, Cool & Responsive HTML Welcome Email for New Signups & First Login
 */
export function generateWelcomeEmailHtml(params: {
  recipientEmail: string;
  recipientName?: string;
  brandName?: string;
  badgeText?: string;
  brandLogo?: string;
  portalUrl?: string;
}): { subject: string; html: string; text: string } {
  const { recipientEmail, recipientName, brandName = 'KhataPro', badgeText: customBadgeText, brandLogo, portalUrl } = params;
  const cleanBrandName = brandName.trim() || 'KhataPro';
  const cleanBadgeText = customBadgeText?.trim() || '';
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello Business Owner,';
  const subject = `🎉 Welcome to ${cleanBrandName}! Your Merchant Ledger is Activated`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${cleanBrandName}</title>
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
      max-width: 580px;
      margin: 0 auto;
      background: linear-gradient(180deg, #161e2e 0%, #0f172a 100%);
      border-radius: 24px;
      border: 1px solid #1e293b;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .header-bar {
      height: 6px;
      background: linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #6366f1 100%);
    }
    .content {
      padding: 40px 36px 36px;
      text-align: center;
    }
    .brand-logo-area {
      margin-bottom: 24px;
    }
    .brand-header-row {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .brand-name {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      display: inline-block;
      vertical-align: middle;
    }
    .brand-badge-tag {
      display: inline-block;
      vertical-align: middle;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      border: 1px solid rgba(110, 231, 183, 0.35);
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
      margin-bottom: 20px;
    }
    .title {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }
    .description {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 32px 0;
    }
    .features-grid {
      text-align: left;
      margin: 0 0 32px 0;
      display: block;
    }
    .feature-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .feature-icon {
      font-size: 22px;
      line-height: 1;
      padding-top: 2px;
    }
    .feature-title {
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 3px;
    }
    .feature-desc {
      font-size: 11.5px;
      color: #94a3b8;
      line-height: 1.45;
    }
    .action-btn {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 32px;
      border-radius: 14px;
      text-decoration: none;
      box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
      margin-bottom: 28px;
    }
    .security-notice {
      background-color: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 12px;
      line-height: 1.5;
      color: #94a3b8;
      text-align: left;
      border-left: 3px solid #10b981;
    }
    .footer {
      border-top: 1px solid #1e293b;
      padding: 24px 32px;
      background-color: #0b1120;
      text-align: center;
      font-size: 11px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header-bar"></div>
      
      <div class="content">
        <div class="brand-logo-area">
          ${brandLogo ? `<img src="${brandLogo}" alt="${cleanBrandName}" style="max-height: 46px; max-width: 180px; object-fit: contain; margin-bottom: 12px; display: inline-block; border-radius: 8px;" /><br>` : ''}
          <div class="brand-header-row">
            <span class="brand-name">⚡ ${cleanBrandName}</span>
            ${cleanBadgeText ? `<span class="brand-badge-tag">${cleanBadgeText}</span>` : ''}
          </div>
        </div>

        <div>
          <span class="badge">Merchant Account Live</span>
        </div>

        <h1 class="title">Welcome Aboard! 🎉</h1>
        <p class="description">
          ${greeting} Congratulations! Your business ledger account has been successfully registered and activated on <strong>${cleanBrandName}</strong>.
        </p>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <div>
              <div class="feature-title">Smart Khata &amp; Ledger Automation</div>
              <div class="feature-desc">Track customer debts, credit limits, payments, and instant WhatsApp payment reminders with ease.</div>
            </div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <div>
              <div class="feature-title">Instant UPI &amp; Payment Gateway</div>
              <div class="feature-desc">Collect payments seamlessly via Dynamic QR, Razorpay, Cashfree, PhonePe, and Direct UPI.</div>
            </div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">☁️</div>
            <div>
              <div class="feature-title">Zero-Shared Private Google Drive Storage</div>
              <div class="feature-desc">Your customer bills, receipts, and images stay strictly encrypted in your own private Google Drive.</div>
            </div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">🧾</div>
            <div>
              <div class="feature-title">Professional GST Billing &amp; Invoices</div>
              <div class="feature-desc">Create, print, and export high-resolution bills, quotation receipts, and thermal slips in 5 seconds.</div>
            </div>
          </div>
        </div>

        ${portalUrl ? `<a href="${portalUrl}" class="action-btn">Launch Your Dashboard &rarr;</a>` : ''}

        <div class="security-notice">
          🛡️ <strong>Security Tip:</strong> Keep your login credentials confidential. ${cleanBrandName} support will never ask for your password or verification codes.
        </div>
      </div>

      <div class="footer">
        &copy; ${new Date().getFullYear()} ${cleanBrandName}${cleanBadgeText ? ' &bull; ' + cleanBadgeText : ''}. All rights reserved.<br>
        Autonomous Financial Operating System &bull; Next-Gen Business Intelligence
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `Welcome to ${cleanBrandName}!\n\n${greeting} Your merchant ledger account has been activated.\n\nFeatures available:\n- Smart Khata & Customer Ledger\n- Instant UPI Collections\n- Private Google Drive Cloud Backup\n- Professional GST Billing\n\nThank you for choosing ${cleanBrandName}!`;

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

    const { subject, html, text } = generateWelcomeEmailHtml({
      recipientEmail: params.to,
      recipientName: params.recipientName,
      brandName: finalBrandName,
      badgeText: liveBadgeText,
      brandLogo: liveLogo,
      portalUrl: params.portalUrl,
    });

    const transporter = await createSmtpTransporter();

    let displayName = config.from ? config.from.replace(/<[^>]+>/g, '').replace(/['"]/g, '').trim() : '';
    if (!displayName || displayName.toLowerCase() === 'khatapro' || displayName.toLowerCase() === 'smartkhata') {
      displayName = finalBrandName;
    }

    const senderEmail = config.user.trim();
    const formattedFrom = `"${displayName}" <${senderEmail}>`;

    const info = await transporter.sendMail({
      from: formattedFrom,
      to: params.to,
      subject,
      text,
      html,
    });

    console.log(`[WelcomeEmail] Welcome email delivered to ${params.to} | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[WelcomeEmail] Failed to send welcome email:', err);
    return { success: false, error: err.message };
  }
}
