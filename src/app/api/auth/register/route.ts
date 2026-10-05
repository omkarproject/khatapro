import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, businessName, phone, role } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, message: 'Name, email, and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');

    // Check if user already exists
    const existing = await usersCol.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json({ success: false, message: 'An account with this email already exists' }, { status: 409 });
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUser: any = {
      _id: userId,
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      password: password, // In production, hash with bcrypt
      businessName: (businessName || `${name}'s Business`).trim(),
      phone: (phone || '').trim(),
      role: 'super_admin',
      createdAt: new Date().toISOString(),
    };

    await usersCol.insertOne(newUser as any);

    // Initialize clean settings document scoped to this brand new user (clean slate)
    const cleanSettings = {
      userId,
      backendProvider: 'mongodb',
      mongodbUri: 'mongodb+srv://smartkhata:KhataPass%402026@cluster0.7evxtf6.mongodb.net/?appName=Cluster0',
      mongodbDbName: 'smartkhata_db',
      businessName: newUser.businessName,
      businessTagline: 'Track Money, Manage Business, Grow Faster',
      businessPhone: newUser.phone,
      businessEmail: newUser.email,
      businessAddress: '',
      paymentSettings: {
        collectionMode: 'direct_upi',
        upiId: '', // Clean blank: user configures their own UPI ID
        payeeName: newUser.businessName,
        customQrUrl: '', // Clean blank: user uploads/sets their own QR
        isDefaultQrSaved: false,
        businessGst: '',
        currency: 'INR',
        enableSoundAlerts: true,
        cashfreeAppId: '', // Clean blank: user sets their own API keys
        cashfreeSecretKey: '',
        cashfreeEnv: 'production',
        razorpayKeyId: '',
        razorpayKeySecret: '',
        razorpayWebhookSecret: '',
        razorpayEnv: 'live',
        upiGatewayProvider: 'Cashfree UPI Gateway',
        upiGatewayKey: '',
        upiGatewaySecret: '',
        upiGatewayWebhookUrl: '',
      },
      darkMode: false,
    };

    await db.collection('settings').updateOne(
      { userId },
      { $set: cleanSettings },
      { upsert: true }
    );

    const { password: _, ...safeUser } = newUser;

    const res = NextResponse.json({
      success: true,
      message: 'Account created and initialized successfully in MongoDB Atlas!',
      user: safeUser,
      token: `token_${userId}_${Date.now()}`,
    });

    res.cookies.set('skp_auth_session', String(userId), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });

    return res;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to register account' }, { status: 500 });
  }
}
