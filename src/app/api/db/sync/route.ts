import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// GET: Fetch all 14 modules for a specific user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId query parameter is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const [
      customers,
      transactions,
      products,
      invoices,
      expenses,
      savingsGoals,
      reminders,
      documents,
      notes,
      tasks,
      passwords,
      settingsDoc,
      userDoc,
    ] = await Promise.all([
      db.collection('customers').find({ userId }).toArray(),
      db.collection('transactions').find({ userId }).toArray(),
      db.collection('products').find({ userId }).toArray(),
      db.collection('invoices').find({ userId }).toArray(),
      db.collection('expenses').find({ userId }).toArray(),
      db.collection('savingsGoals').find({ userId }).toArray(),
      db.collection('reminders').find({ userId }).toArray(),
      db.collection('documents').find({ userId }).toArray(),
      db.collection('notes').find({ userId }).toArray(),
      db.collection('tasks').find({ userId }).toArray(),
      db.collection('passwords').find({ userId }).toArray(),
      db.collection('settings').findOne({ userId }),
      db.collection('users').findOne({ $or: [{ id: userId }, { _id: userId }] } as any),
    ]);

    // Strip internal Mongo _id
    const cleanArray = (arr: any[]) => arr.map(({ _id, ...rest }) => rest);

    let finalData = {
      customers: cleanArray(customers),
      transactions: cleanArray(transactions),
      products: cleanArray(products),
      invoices: cleanArray(invoices),
      expenses: cleanArray(expenses),
      savingsGoals: cleanArray(savingsGoals),
      reminders: cleanArray(reminders),
      documents: cleanArray(documents),
      notes: cleanArray(notes),
      tasks: cleanArray(tasks),
      passwords: cleanArray(passwords),
      settings: settingsDoc ? (({ _id, ...s }) => s)(settingsDoc) : null,
      user: userDoc ? (({ password, _id, ...u }) => u)(userDoc) : null,
    };

    // If Supabase is configured and has data for this user, merge/prefer Supabase
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const [sbCust, sbTxn, sbInv, sbProd, sbExp, sbSavings, sbRem, sbDoc, sbNotes, sbTasks, sbPass, sbSet, sbProfile] = await Promise.all([
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

          if (sbCust.data && sbCust.data.length > 0) finalData.customers = sbCust.data;
          if (sbTxn.data && sbTxn.data.length > 0) finalData.transactions = sbTxn.data;
          if (sbInv.data && sbInv.data.length > 0) finalData.invoices = sbInv.data;
          if (sbProd.data && sbProd.data.length > 0) finalData.products = sbProd.data;
          if (sbExp.data && sbExp.data.length > 0) finalData.expenses = sbExp.data;
          if (sbSavings.data && sbSavings.data.length > 0) finalData.savingsGoals = sbSavings.data;
          if (sbRem.data && sbRem.data.length > 0) finalData.reminders = sbRem.data;
          if (sbDoc.data && sbDoc.data.length > 0) finalData.documents = sbDoc.data;
          if (sbNotes.data && sbNotes.data.length > 0) finalData.notes = sbNotes.data;
          if (sbTasks.data && sbTasks.data.length > 0) finalData.tasks = sbTasks.data;
          if (sbPass.data && sbPass.data.length > 0) finalData.passwords = sbPass.data;
          if (sbSet.data) finalData.settings = sbSet.data;
          if (sbProfile.data) finalData.user = sbProfile.data;
        } catch (sbQueryErr) {
          console.warn('Supabase query error during sync GET:', sbQueryErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      data: finalData,
    });
  } catch (error: any) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch user data' }, { status: 500 });
  }
}

// POST: Save or bulk-sync all user data to cloud
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, data } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 });
    }

    // 1. Sync to Supabase PostgreSQL if configured
    if (isSupabaseConfigured() && data) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const syncSbTable = async (table: string, items: any[] | undefined) => {
            if (!Array.isArray(items)) return;
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
              payment_settings: data.settings.paymentSettings,
              dark_mode: data.settings.darkMode,
              updated_at: new Date().toISOString(),
            });
          }
        } catch (sbSyncErr) {
          console.warn('Supabase sync POST error:', sbSyncErr);
        }
      }
    }

    // 2. Sync to MongoDB Atlas for persistence and safe migration
    const { db } = await connectToDatabase();

    const syncCollection = async (colName: string, items: any[] | undefined) => {
      if (!Array.isArray(items)) return;
      const col = db.collection(colName);
      const activeIds = items.map(i => i.id).filter(Boolean);
      await col.deleteMany({ userId, id: { $nin: activeIds } });

      for (const item of items) {
        if (!item.id) continue;
        const docToSave = { ...item, userId };
        delete (docToSave as any)._id;
        await col.updateOne(
          { id: item.id, userId },
          { $set: docToSave },
          { upsert: true }
        );
      }
    };

    if (data) {
      await Promise.all([
        syncCollection('customers', data.customers),
        syncCollection('transactions', data.transactions),
        syncCollection('products', data.products),
        syncCollection('invoices', data.invoices),
        syncCollection('expenses', data.expenses),
        syncCollection('savingsGoals', data.savingsGoals),
        syncCollection('reminders', data.reminders),
        syncCollection('documents', data.documents),
        syncCollection('notes', data.notes),
        syncCollection('tasks', data.tasks),
        syncCollection('passwords', data.passwords),
      ]);

      if (data.settings) {
        const sDoc = { ...data.settings, userId };
        delete (sDoc as any)._id;
        await db.collection('settings').updateOne(
          { userId },
          { $set: sDoc },
          { upsert: true }
        );
      }

      if (data.profile) {
        const pDoc = { ...data.profile, userId };
        delete (pDoc as any)._id;
        await db.collection('users').updateOne(
          { $or: [{ id: userId }, { _id: userId }] } as any,
          { $set: pDoc },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All business data synchronized successfully!',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to sync data' }, { status: 500 });
  }
}
