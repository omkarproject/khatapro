import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin, resetSupabaseClients } from '@/lib/supabase';
import { invalidateSmtpCache } from '@/lib/emailService';

function updateEnvFile(updates: Record<string, string | number | boolean>) {
  const envPath = path.join(process.cwd(), '.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  for (const [key, rawValue] of Object.entries(updates)) {
    let formattedVal: string;
    if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      formattedVal = String(rawValue);
    } else {
      const trimmed = String(rawValue).trim();
      // If it's SMTP strings or contains spaces, keep them cleanly double-quoted
      if (['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].includes(key)) {
        const cleanNoQuotes = trimmed.replace(/^["']|["']$/g, '');
        formattedVal = `"${cleanNoQuotes}"`;
      } else {
        formattedVal = trimmed.replace(/^["']|["']$/g, '');
      }
    }

    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${formattedVal}`);
    } else {
      // Append key under appropriate section if present
      if (key.startsWith('NEXT_PUBLIC_SUPABASE') || key.startsWith('SUPABASE')) {
        const sectionMatch = content.match(/# 1\. Supabase[^\n]*/);
        if (sectionMatch && sectionMatch.index !== undefined) {
          const insertIdx = sectionMatch.index + sectionMatch[0].length;
          content = content.slice(0, insertIdx) + `\n${key}=${formattedVal}` + content.slice(insertIdx);
        } else {
          content += `\n${key}=${formattedVal}`;
        }
      } else if (key.startsWith('GOOGLE_')) {
        const sectionMatch = content.match(/# 2\. Google[^\n]*/);
        if (sectionMatch && sectionMatch.index !== undefined) {
          const insertIdx = sectionMatch.index + sectionMatch[0].length;
          content = content.slice(0, insertIdx) + `\n${key}=${formattedVal}` + content.slice(insertIdx);
        } else {
          content += `\n${key}=${formattedVal}`;
        }
      } else if (key.startsWith('SMTP_')) {
        const sectionMatch = content.match(/# 3\. Email[^\n]*/);
        if (sectionMatch && sectionMatch.index !== undefined) {
          const insertIdx = sectionMatch.index + sectionMatch[0].length;
          content = content.slice(0, insertIdx) + `\n${key}=${formattedVal}` + content.slice(insertIdx);
        } else {
          content += `\n${key}=${formattedVal}`;
        }
      } else {
        content += `\n${key}=${formattedVal}`;
      }
    }

    // Also update current process.env in memory immediately
    const cleanPlainVal = String(rawValue).replace(/^["']|["']$/g, '').trim();
    process.env[key] = cleanPlainVal;
  }

  // Write back to .env
  fs.writeFileSync(envPath, content, 'utf-8');
}

export async function GET(req: NextRequest) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const parseEnvVal = (key: string, fallback = '') => {
      const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
      if (match) {
        return match[1].replace(/^["']|["']$/g, '').trim();
      }
      return process.env[key] || fallback;
    };

    return NextResponse.json({
      success: true,
      supabase: {
        url: parseEnvVal('NEXT_PUBLIC_SUPABASE_URL', 'https://efpszmfgiutgrjpaopnj.supabase.co'),
        anonKey: parseEnvVal('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
        serviceRoleKey: parseEnvVal('SUPABASE_SERVICE_ROLE_KEY', ''),
      },
      googleDrive: {
        clientId: parseEnvVal('GOOGLE_CLIENT_ID', ''),
        clientSecret: parseEnvVal('GOOGLE_CLIENT_SECRET', ''),
        redirectUri: parseEnvVal('GOOGLE_REDIRECT_URI', ''),
      },
      smtp: {
        enabled: parseEnvVal('SMTP_ENABLED', 'true') !== 'false',
        host: parseEnvVal('SMTP_HOST', 'my.mailbux.com'),
        port: Number(parseEnvVal('SMTP_PORT', '587')) || 587,
        user: parseEnvVal('SMTP_USER', 'admin@rpmdg.me'),
        pass: parseEnvVal('SMTP_PASS', ''),
        from: parseEnvVal('SMTP_FROM', 'AutoPrint Xerox Cloud <admin@rpmdg.me>'),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, supabase: sbData, smtp: smtpData, googleDrive: driveData } = body;

    const updates: Record<string, string | number | boolean> = {};

    if (target === 'supabase' && sbData) {
      if (sbData.url !== undefined) updates['NEXT_PUBLIC_SUPABASE_URL'] = String(sbData.url).trim();
      if (sbData.anonKey !== undefined) updates['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = String(sbData.anonKey).trim();
      if (sbData.serviceRoleKey !== undefined) updates['SUPABASE_SERVICE_ROLE_KEY'] = String(sbData.serviceRoleKey).trim();

      updateEnvFile(updates);
      resetSupabaseClients();
    } else if (target === 'smtp' && smtpData) {
      if (smtpData.host !== undefined) updates['SMTP_HOST'] = String(smtpData.host).trim();
      if (smtpData.port !== undefined) updates['SMTP_PORT'] = Number(smtpData.port) || 587;
      if (smtpData.user !== undefined) updates['SMTP_USER'] = String(smtpData.user).trim();
      if (smtpData.pass !== undefined) updates['SMTP_PASS'] = String(smtpData.pass).trim();
      if (smtpData.from !== undefined) updates['SMTP_FROM'] = String(smtpData.from).trim();
      if (smtpData.enabled !== undefined) updates['SMTP_ENABLED'] = Boolean(smtpData.enabled);

      updateEnvFile(updates);
      invalidateSmtpCache();

      // Dual-sync to database global_config so triggers and serverless instances persist
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const { data: gc } = await supabase.from('global_config').select('maintenance_mode').eq('id', 'global_config').maybeSingle();
          const currentMaint = (gc && typeof gc.maintenance_mode === 'object' && gc.maintenance_mode !== null) ? { ...gc.maintenance_mode } : {};
          currentMaint.smtpSettings = {
            enabled: Boolean(smtpData.enabled),
            host: String(smtpData.host || '').trim(),
            port: Number(smtpData.port) || 587,
            user: String(smtpData.user || '').trim(),
            pass: String(smtpData.pass || '').trim(),
            from: String(smtpData.from || '').trim(),
            secure: Number(smtpData.port) === 465,
            triggers: smtpData.triggers || {
              signupOtp: true,
              loginOtp: false,
              forgotPasswordOtp: true,
              welcomeEmail: true,
            },
          };
          await supabase.from('global_config').upsert({ id: 'global_config', maintenance_mode: currentMaint, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        }
      } catch (dbErr) {
        console.warn('[env-config] DB sync note:', dbErr);
      }
    } else if (target === 'google_drive' && driveData) {
      if (driveData.clientId !== undefined) updates['GOOGLE_CLIENT_ID'] = String(driveData.clientId).trim();
      if (driveData.clientSecret !== undefined) updates['GOOGLE_CLIENT_SECRET'] = String(driveData.clientSecret).trim();
      if (driveData.redirectUri !== undefined) updates['GOOGLE_REDIRECT_URI'] = String(driveData.redirectUri).trim();

      updateEnvFile(updates);

      // Dual-sync to database system_settings for super_admin
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const { data: superAdmin } = await supabase.from('profiles').select('id').eq('email', 'anantyadav8924@gmail.com').maybeSingle();
          if (superAdmin?.id) {
            const { data: setRow } = await supabase.from('system_settings').select('payment_settings').eq('user_id', superAdmin.id).maybeSingle();
            const currentPay = (setRow && typeof setRow.payment_settings === 'object' && setRow.payment_settings !== null) ? { ...setRow.payment_settings } : {};
            currentPay.googleDriveSettings = {
              enabled: Boolean(driveData.enabled),
              clientId: String(driveData.clientId || '').trim(),
              clientSecret: String(driveData.clientSecret || '').trim(),
              redirectUri: String(driveData.redirectUri || '').trim(),
            };
            await supabase.from('system_settings').upsert({
              user_id: superAdmin.id,
              payment_settings: currentPay,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
          }
        }
      } catch (dbErr) {
        console.warn('[env-config] Drive DB sync note:', dbErr);
      }
    } else {
      return NextResponse.json({ success: false, message: 'Invalid target or payload.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `.env file and runtime configuration updated successfully!`,
      target,
    });
  } catch (error: any) {
    console.error('Error updating .env config:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to update .env configuration' }, { status: 500 });
  }
}
