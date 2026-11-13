import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { generateOtpEmailHtml } from '@/lib/emailService';

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

    // 2. Send test email
    const { subject, html, text } = generateOtpEmailHtml({
      otp: '984210',
      purpose: 'login',
      brandName: 'KhataPro SMTP Test',
      recipientEmail: testEmail,
      recipientName: 'Administrator',
    });

    const info = await transporter.sendMail({
      from: from ? from.trim() : `KhataPro Admin <${user.trim()}>`,
      to: testEmail,
      subject: `[SMTP Test Successful] ${subject}`,
      text,
      html,
    });

    return NextResponse.json({
      success: true,
      message: `SMTP connection verified successfully! A test email was delivered to ${testEmail}.`,
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
