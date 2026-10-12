import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { downloadDriveFileBuffer } from '@/lib/googleDrive';
import { parseBackupArchive } from '@/lib/backupArchive';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { fileId, userId: reqUserId } = await req.json();
    const targetUserId = reqUserId || req.cookies.get('skp_auth_session')?.value;

    if (!fileId) {
      return NextResponse.json({ success: false, message: 'fileId is required' }, { status: 400 });
    }
    if (!targetUserId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Download archive from Google Drive
    const { drive } = await getAuthenticatedDriveForUser(targetUserId);
    const zipBuffer = await downloadDriveFileBuffer(drive, fileId);

    // Unpack and validate archive
    const { manifest, data } = await parseBackupArchive(zipBuffer);

    // Remap user ownership to the targetUserId (new or existing account)
    const remapItems = (items: any[] | undefined) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => ({
        ...item,
        userId: targetUserId,
        user_id: targetUserId,
      }));
    };

    const restoredCustomers = remapItems(data.customers);
    const restoredTransactions = remapItems(data.transactions);
    const restoredInvoices = remapItems(data.invoices);
    const restoredProducts = remapItems(data.products);
    const restoredExpenses = remapItems(data.expenses);
    const restoredSavings = remapItems(data.savingsGoals);
    const restoredReminders = remapItems(data.reminders);
    const restoredDocuments = remapItems(data.documents);
    const restoredNotes = remapItems(data.notes);
    const restoredTasks = remapItems(data.tasks);
    const restoredPasswords = remapItems(data.passwords);

    // Remap settings
    const restoredSettings = {
      ...(data.settings || {}),
      userId: targetUserId,
      user_id: targetUserId,
    };

    // Remap profile
    const restoredProfile = {
      ...(data.profile || {}),
      id: targetUserId,
      userId: targetUserId,
      businessName: data.profile?.businessName || manifest.businessName,
    };

    // 1. Persist into Supabase PostgreSQL
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const batchUpsert = async (table: string, records: any[]) => {
        if (!records || records.length === 0) return;
        for (const rec of records) {
          const row = { ...rec, user_id: targetUserId };
          delete (row as any).userId;
          await supabase.from(table).upsert(row, { onConflict: 'id, user_id' });
        }
      };

      await Promise.all([
        batchUpsert('customers', restoredCustomers),
        batchUpsert('transactions', restoredTransactions),
        batchUpsert('products', restoredProducts),
        batchUpsert('invoices', restoredInvoices),
        batchUpsert('expenses', restoredExpenses),
        batchUpsert('savings_goals', restoredSavings),
        batchUpsert('payment_reminders', restoredReminders),
        batchUpsert('documents', restoredDocuments),
        batchUpsert('notes', restoredNotes),
        batchUpsert('tasks', restoredTasks),
        batchUpsert('passwords', restoredPasswords),
      ]);

      await supabase.from('system_settings').upsert({
        user_id: targetUserId,
        business_name: restoredSettings.businessName,
        business_tagline: restoredSettings.businessTagline,
        business_phone: restoredSettings.businessPhone,
        business_email: restoredSettings.businessEmail,
        payment_settings: restoredSettings.paymentSettings,
        dark_mode: restoredSettings.darkMode,
        backend_provider: 'supabase',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (restoredProfile.businessName) {
        await supabase.from('profiles').upsert({
          id: targetUserId,
          business_name: restoredProfile.businessName,
          name: restoredProfile.name,
          phone: restoredProfile.phone,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    }

    const restoredCounts = {
      customers: restoredCustomers.length,
      transactions: restoredTransactions.length,
      invoices: restoredInvoices.length,
      products: restoredProducts.length,
      expenses: restoredExpenses.length,
      savingsGoals: restoredSavings.length,
      reminders: restoredReminders.length,
      documents: restoredDocuments.length,
      notes: restoredNotes.length,
      tasks: restoredTasks.length,
      passwords: restoredPasswords.length,
    };

    return NextResponse.json({
      success: true,
      message: `Successfully restored ${manifest.businessName} backup into this account!`,
      businessName: manifest.businessName,
      restoredCounts,
      restoredData: {
        customers: restoredCustomers,
        transactions: restoredTransactions,
        invoices: restoredInvoices,
        products: restoredProducts,
        expenses: restoredExpenses,
        savingsGoals: restoredSavings,
        reminders: restoredReminders,
        documents: restoredDocuments,
        notes: restoredNotes,
        tasks: restoredTasks,
        passwords: restoredPasswords,
        settings: restoredSettings,
        profile: restoredProfile,
      },
    });
  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to restore backup' },
      { status: 500 }
    );
  }
}
