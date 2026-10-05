import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { userId, email, currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.trim().length < 4) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 4 characters long' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');

    // Find user by userId or email
    let query: any = null;
    if (userId) {
      query = { $or: [{ id: userId }, { _id: userId }] };
    } else if (email) {
      query = { email: email.toLowerCase().trim() };
    }

    if (!query) {
      return NextResponse.json(
        { success: false, message: 'User identifier (userId or email) is required' },
        { status: 400 }
      );
    }

    const user = await usersCol.findOne(query);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User account not found in database' },
        { status: 404 }
      );
    }

    // If current password is provided, verify it matches
    if (currentPassword && user.password && user.password !== currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect. Please try again.' },
        { status: 401 }
      );
    }

    // Update password in MongoDB
    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          password: newPassword.trim(),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Password updated and saved successfully in MongoDB Atlas!',
    });
  } catch (error: any) {
    console.error('Password update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}
