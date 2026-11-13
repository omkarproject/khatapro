import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// Security check: Only verified Platform Super Admin can perform database wipe / reset
async function verifyAdminCaller(req: NextRequest, supabase: any, callerUserId?: string): Promise<{ isAdmin: boolean; adminUserId?: string; adminEmail?: string }> {
  const cookie = req.cookies.get('skp_auth_session')?.value;
  const header = req.headers.get('x-auth-session') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const candidateId = callerUserId || cookie || header;

  if (!candidateId) return { isAdmin: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', candidateId)
    .maybeSingle();

  if (!profile) return { isAdmin: false };

  const isAdmin =
    profile.email?.toLowerCase() === 'anantyadav8924@gmail.com' ||
    profile.role === 'super_admin' ||
    profile.role === 'admin';

  return {
    isAdmin,
    adminUserId: profile.id,
    adminEmail: profile.email,
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Supabase Cloud Database is not configured.' },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Could not connect to Supabase Cloud Database.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { callerUserId, resetMode = 'full_reset', confirmationPhrase } = body;

    // Strict safety phrase check to prevent accidental triggers
    if (confirmationPhrase !== 'RESET') {
      return NextResponse.json(
        { success: false, message: 'Invalid confirmation phrase. Please type "RESET" to confirm.' },
        { status: 400 }
      );
    }

    // Verify caller credentials
    const authCheck = await verifyAdminCaller(req, supabase, callerUserId);
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Super Admin authorization required.' },
        { status: 403 }
      );
    }

    // Identify Admin account to protect from deletion
    let adminUserId = authCheck.adminUserId;
    let adminEmail = authCheck.adminEmail || 'anantyadav8924@gmail.com';

    // Fallback: If adminUserId not resolved directly, search by known admin email
    if (!adminUserId) {
      const { data: adminProf } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', 'anantyadav8924@gmail.com')
        .maybeSingle();

      if (adminProf) {
        adminUserId = adminProf.id;
        adminEmail = adminProf.email;
      }
    }

    if (!adminUserId) {
      return NextResponse.json(
        { success: false, message: 'Safety check failed: Could not resolve Admin user account ID.' },
        { status: 400 }
      );
    }

    const cleanedTables: string[] = [];
    let deletedAuthUsersCount = 0;

    // -------------------------------------------------------------------------
    // CASE 1: FULL DATABASE FACTORY RESET (Keep Admin Login Account Only)
    // -------------------------------------------------------------------------
    if (resetMode === 'full_reset') {
      // 1. Wipe all operational child tables completely (both admin and user records)
      const dataTablesToWipe = [
        'customer_drive_files',
        'customer_drive_folders',
        'transactions',
        'invoices',
        'expenses',
        'payment_reminders',
        'savings_goals',
        'documents',
        'notes',
        'tasks',
        'passwords',
        'products',
        'customers',
        'google_drive_backups',
      ];

      for (const table of dataTablesToWipe) {
        try {
          await supabase.from(table).delete().neq('id', '___safety_keep_none___');
          cleanedTables.push(table);
        } catch (tblErr) {
          console.warn(`Error wiping table ${table}:`, tblErr);
        }
      }

      // 2. Clear Google Drive tokens for all non-admin users
      try {
        await supabase.from('google_drive_tokens').delete().neq('user_id', adminUserId);
        cleanedTables.push('google_drive_tokens (non-admin)');
      } catch {}

      // 3. Clear System Settings for non-admin users
      try {
        await supabase.from('system_settings').delete().neq('user_id', adminUserId);
        cleanedTables.push('system_settings (non-admin)');
      } catch {}

      // 4. Delete all profiles EXCEPT the Admin profile
      try {
        await supabase.from('profiles').delete().neq('id', adminUserId);
        cleanedTables.push('profiles (all non-admin users)');
      } catch (profErr) {
        console.warn('Error deleting non-admin profiles:', profErr);
      }

      // 5. Delete all Supabase Auth users EXCEPT the Admin user
      try {
        const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (userList?.users && Array.isArray(userList.users)) {
          for (const u of userList.users) {
            if (u.id !== adminUserId && u.email?.toLowerCase() !== adminEmail.toLowerCase()) {
              try {
                await supabase.auth.admin.deleteUser(u.id);
                deletedAuthUsersCount++;
              } catch (delErr) {
                console.warn(`Could not delete auth user ${u.id}:`, delErr);
              }
            }
          }
        }
      } catch (authErr) {
        console.warn('Error deleting auth users:', authErr);
      }

      return NextResponse.json({
        success: true,
        resetMode: 'full_reset',
        message: 'Full Database Reset Completed! All customer data, transactions, invoices, and non-admin users have been permanently erased. Admin login account remains intact.',
        adminPreserved: {
          id: adminUserId,
          email: adminEmail,
        },
        deletedAuthUsersCount,
        cleanedTables,
        timestamp: new Date().toISOString(),
      });
    }

    // -------------------------------------------------------------------------
    // CASE 2: RESET BUSINESS & LEDGER DATA ONLY (Keep All User Accounts & Logins)
    // -------------------------------------------------------------------------
    if (resetMode === 'ledger_only') {
      const dataTablesToWipe = [
        'customer_drive_files',
        'customer_drive_folders',
        'transactions',
        'invoices',
        'expenses',
        'payment_reminders',
        'savings_goals',
        'documents',
        'notes',
        'tasks',
        'passwords',
        'products',
        'customers',
        'google_drive_backups',
      ];

      for (const table of dataTablesToWipe) {
        try {
          await supabase.from(table).delete().neq('id', '___safety_keep_none___');
          cleanedTables.push(table);
        } catch (tblErr) {
          console.warn(`Error wiping table ${table}:`, tblErr);
        }
      }

      return NextResponse.json({
        success: true,
        resetMode: 'ledger_only',
        message: 'Business & Ledger Data Reset Completed! All customer ledgers, transactions, and bills have been cleared. All merchant login accounts were preserved.',
        cleanedTables,
        timestamp: new Date().toISOString(),
      });
    }

    // -------------------------------------------------------------------------
    // CASE 3: DELETE ALL REGULAR USERS (Keep Admin Account & Admin Business Data)
    // -------------------------------------------------------------------------
    if (resetMode === 'non_admin_users') {
      const userScopedTables = [
        'customer_drive_files',
        'customer_drive_folders',
        'transactions',
        'invoices',
        'expenses',
        'payment_reminders',
        'savings_goals',
        'documents',
        'notes',
        'tasks',
        'passwords',
        'products',
        'customers',
        'google_drive_backups',
        'google_drive_tokens',
        'system_settings',
      ];

      for (const table of userScopedTables) {
        try {
          await supabase.from(table).delete().neq('user_id', adminUserId);
          cleanedTables.push(`${table} (non-admin)`);
        } catch {}
      }

      try {
        await supabase.from('profiles').delete().neq('id', adminUserId);
        cleanedTables.push('profiles (non-admin)');
      } catch {}

      try {
        const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (userList?.users) {
          for (const u of userList.users) {
            if (u.id !== adminUserId && u.email?.toLowerCase() !== adminEmail.toLowerCase()) {
              try {
                await supabase.auth.admin.deleteUser(u.id);
                deletedAuthUsersCount++;
              } catch {}
            }
          }
        }
      } catch {}

      return NextResponse.json({
        success: true,
        resetMode: 'non_admin_users',
        message: 'Regular Users Reset Completed! All non-admin accounts and their data were deleted. Admin account and admin data remain intact.',
        deletedAuthUsersCount,
        cleanedTables,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, message: `Unknown reset mode: ${resetMode}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Database Reset error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to execute database reset' },
      { status: 500 }
    );
  }
}
