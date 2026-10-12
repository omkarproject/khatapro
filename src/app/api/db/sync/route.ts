import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// GET: Fetch all modules for a specific user from Supabase PostgreSQL
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId query parameter is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Supabase Cloud Database is not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to Supabase Cloud Database' }, { status: 500 });
    }

    const [
      sbCust,
      sbTxn,
      sbInv,
      sbProd,
      sbExp,
      sbSavings,
      sbRem,
      sbDoc,
      sbNotes,
      sbTasks,
      sbPass,
      sbSet,
      sbProfile,
    ] = await Promise.all([
      supabase.from('customers').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId),
      supabase.from('invoices').select('*').eq('user_id', userId),
      supabase.from('products').select('*').eq('user_id', userId),
      supabase.from('expenses').select('*').eq('user_id', userId),
      supabase.from('savings_goals').select('*').eq('user_id', userId),
      supabase.from('payment_reminders').select('*').eq('user_id', userId),
      supabase.from('documents').select('*').eq('user_id', userId),
      supabase.from('notes').select('*').eq('user_id', userId),
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('passwords').select('*').eq('user_id', userId),
      supabase.from('system_settings').select('*').eq('user_id', userId).single(),
      supabase.from('profiles').select('*').eq('id', userId).single(),
    ]);

    const finalData = {
      customers: sbCust.data || [],
      transactions: sbTxn.data || [],
      products: sbProd.data || [],
      invoices: sbInv.data || [],
      expenses: sbExp.data || [],
      savingsGoals: sbSavings.data || [],
      reminders: sbRem.data || [],
      documents: sbDoc.data || [],
      notes: sbNotes.data || [],
      tasks: sbTasks.data || [],
      passwords: sbPass.data || [],
      settings: sbSet.data || null,
      user: sbProfile.data || null,
    };

    return NextResponse.json({
      success: true,
      userId,
      provider: 'supabase',
      data: finalData,
    });
  } catch (error: any) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch user data' }, { status: 500 });
  }
}

// POST: Save or bulk-sync all user data to Supabase Cloud PostgreSQL
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, data } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Supabase Cloud Database is not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to Supabase Cloud Database' }, { status: 500 });
    }

    if (data) {
      const syncSbTable = async (table: string, items: any[] | undefined) => {
        if (!Array.isArray(items) || items.length === 0) return;
        for (const item of items) {
          if (!item.id) continue;
          const row = { ...item, user_id: userId };
          delete (row as any).userId;
          await supabase.from(table).upsert(row, { onConflict: 'id, user_id' });
        }
      };

      await Promise.all([
        syncSbTable('customers', data.customers),
        syncSbTable('transactions', data.transactions),
        syncSbTable('products', data.products),
        syncSbTable('invoices', data.invoices),
        syncSbTable('expenses', data.expenses),
        syncSbTable('savings_goals', data.savingsGoals),
        syncSbTable('payment_reminders', data.reminders),
        syncSbTable('documents', data.documents),
        syncSbTable('notes', data.notes),
        syncSbTable('tasks', data.tasks),
        syncSbTable('passwords', data.passwords),
      ]);

      if (data.settings) {
        await supabase.from('system_settings').upsert({
          user_id: userId,
          business_name: data.settings.businessName,
          business_tagline: data.settings.businessTagline,
          business_phone: data.settings.businessPhone,
          business_email: data.settings.businessEmail,
          payment_settings: data.settings.paymentSettings,
          dark_mode: data.settings.darkMode,
          backend_provider: 'supabase',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }

      if (data.profile) {
        await supabase.from('profiles').upsert({
          id: userId,
          name: data.profile.name,
          email: data.profile.email,
          phone: data.profile.phone,
          business_name: data.profile.businessName,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All business data synchronized successfully to Supabase PostgreSQL!',
      provider: 'supabase',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to sync data' }, { status: 500 });
  }
}
