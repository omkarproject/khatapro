import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { generateOtpEmailHtml } from '@/lib/emailService';
import { getGlobalBrandingFromDb } from '@/lib/globalBranding';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, user, pass, from, testEmail = 'anantyadav8924@gmail.com' } = body;

    if (!host || !user || !pass) {
      return NextResponse.json(
        { success: false, message: 'SMTP Host, Username, and Password are required to test connection.' },
        { status: 400 }
      );
    }

    const cleanPort = Number(port) || 587;
    const isSecure = cleanPort === 465;

    const transporter = nodemailer.createTransport({
      host: host.trim(),
      port: cleanPort,
      secure: isSecure,
      auth: {
        user: user.trim(),
        pass: pass.trim(),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // 1. Verify connection
    await transporter.verify();

    // 2. Fetch live Brand Display Name & Badge from database
    const brand = await getGlobalBrandingFromDb().catch(() => null);
    const brandName = brand?.websiteName?.trim() || 'KhataPro';
    const badgeText = brand?.websiteBadgeText?.trim() || '';
    const brandLogo = brand?.websiteLogo?.trim() || '';

    // 3. Send test email
    const { subject, html, text } = generateOtpEmailHtml({
      otp: '984210',
      purpose: 'login',
      brandName,
      badgeText,
      brandLogo,
      recipientEmail: testEmail,
      recipientName: 'Administrator',
    });

    let senderEmail = user.trim();
    if (from) {
      const match = from.match(/<([^>]+)>/);
      if (match && match[1]) {
        senderEmail = match[1].trim();
      } else if (from.includes('@')) {
        senderEmail = from.trim();
      }
    }
    const formattedFrom = `"${brandName}" <${senderEmail}>`;

    const info = await transporter.sendMail({
      from: formattedFrom,
      to: testEmail,
      subject: `[SMTP Test Successful] ${subject}`,
      text,
      html,
    });

    return NextResponse.json({
      success: true,
      message: `SMTP connection verified successfully! A test email was delivered to ${testEmail} using brand name "${brandName}".`,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('SMTP test error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to connect to SMTP mail server.' },
      { status: 500 }
    );
  }
}
