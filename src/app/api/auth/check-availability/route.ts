import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

function normalizePhone(p?: string | null): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanEmail = (body?.email || '').toLowerCase().trim();
    const normPhone = normalizePhone(body?.phone);

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, emailExists: false, phoneExists: false });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, emailExists: false, phoneExists: false });
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, phone');

    let emailExists = false;
    let phoneExists = false;

    if (profiles && profiles.length > 0) {
      if (cleanEmail && cleanEmail.includes('@')) {
        emailExists = profiles.some(
          (p: any) => (p.email || '').toLowerCase().trim() === cleanEmail
        );
      }
      if (normPhone && normPhone.length >= 10) {
        phoneExists = profiles.some(
          (p: any) => normalizePhone(p.phone) === normPhone
        );
      }
    }

    return NextResponse.json({
      success: true,
      emailExists,
      phoneExists,
    });
  } catch {
    return NextResponse.json({ success: true, emailExists: false, phoneExists: false });
  }
}
