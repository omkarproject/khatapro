import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');

    const user = await usersCol.findOne({ email: cleanEmail });
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    if (user.password !== password) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    const { password: _, ...safeUser } = user;

    const res = NextResponse.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: safeUser,
      token: `token_${user.id || user._id}_${Date.now()}`,
    });

    res.cookies.set('skp_auth_session', String(user.id || user._id), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });

    return res;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to authenticate' }, { status: 500 });
  }
}
