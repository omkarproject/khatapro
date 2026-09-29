import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { initialCustomers, initialTransactions, initialProducts, initialInvoices, initialExpenses } from '@/services/mockData';

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
      role: role || 'business_owner',
      createdAt: new Date().toISOString(),
    };

    await usersCol.insertOne(newUser as any);

    // Seed starter data scoped to this brand new user
    const now = new Date().toISOString();
    
    // Seed initial customers with this user's ID
    const userCustomers = initialCustomers.slice(0, 3).map((c, i) => ({
      ...c,
      id: `cust_${userId}_${i + 1}`,
      userId: userId,
      createdAt: now,
    }));
    if (userCustomers.length > 0) {
      await db.collection('customers').insertMany(userCustomers as any[]);
    }

    // Seed initial products
    const userProducts = initialProducts.slice(0, 4).map((p, i) => ({
      ...p,
      id: `prod_${userId}_${i + 1}`,
      userId: userId,
      createdAt: now,
    }));
    if (userProducts.length > 0) {
      await db.collection('products').insertMany(userProducts as any[]);
    }

    const { password: _, ...safeUser } = newUser;

    return NextResponse.json({
      success: true,
      message: 'Account created and initialized successfully in MongoDB Atlas!',
      user: safeUser,
      token: `token_${userId}_${Date.now()}`,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to register account' }, { status: 500 });
  }
}
