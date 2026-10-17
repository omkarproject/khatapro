import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

function normalizePhone(p?: string | null): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

// POST /api/users/p2p-link
// Bi-directional P2P linking: When Merchant A saves Merchant B, Merchant A is automatically created as a customer in Merchant B's account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentUserId, peerUserId: reqPeerUserId, peerPhone, peerEmail, currentUserProfile, peerCustomerData } = body;

    if (!currentUserId) {
      return NextResponse.json({ success: false, message: 'currentUserId is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to database' }, { status: 500 });
    }

    let peerUserId = reqPeerUserId;

    // If peerUserId not directly supplied, find it by phone/email
    if (!peerUserId) {
      const normPhone = normalizePhone(peerPhone || peerCustomerData?.phone);
      const cleanEmail = (peerEmail || peerCustomerData?.email || '').toLowerCase().trim();

      const { data: profiles } = await supabase.from('profiles').select('id, phone, email');
      const found = (profiles || []).find((p: any) => {
        if (p.id === currentUserId) return false;
        const pPhone = normalizePhone(p.phone);
        const pEmail = (p.email || '').toLowerCase().trim();
        if (normPhone && normPhone.length >= 10 && pPhone && pPhone === normPhone) return true;
        if (cleanEmail && pEmail && pEmail === cleanEmail) return true;
        return false;
      });

      if (found) {
        peerUserId = found.id;
      }
    }

    if (!peerUserId || peerUserId === currentUserId) {
      return NextResponse.json({
        success: true,
        linked: false,
        message: 'No peer merchant ID matched or self-linking prevented.',
      });
    }

    // Resolve current user's profile details
    let currentProfile = currentUserProfile;
    if (!currentProfile || !currentProfile.name) {
      const { data: cp } = await supabase.from('profiles').select('*').eq('id', currentUserId).maybeSingle();
      const { data: cs } = await supabase.from('system_settings').select('*').eq('user_id', currentUserId).maybeSingle();
      currentProfile = {
        name: cp?.full_name || cp?.name || cs?.business_name || 'Merchant',
        phone: cp?.phone || cs?.business_phone || '',
        email: cp?.email || cs?.business_email || '',
        businessName: cp?.business_name || cs?.business_name || '',
        businessGst: cp?.business_gst || cs?.payment_settings?.businessGst || '',
        businessAddress: cp?.business_address || cs?.business_address || '',
        avatarUrl: cp?.avatar_url || cs?.business_logo || '',
      };
    }

    const reciprocalCustId = `peer_cust_${currentUserId}`;
    const reciprocalName = (currentProfile.businessName || currentProfile.name || 'Peer Merchant').trim();

    // 1. Upsert reciprocal customer into peer merchant's customers table in Supabase
    const { error: custErr } = await supabase.from('customers').upsert({
      id: reciprocalCustId,
      user_id: peerUserId,
      name: reciprocalName,
      phone: currentProfile.phone || '',
      email: currentProfile.email || '',
      business_name: currentProfile.businessName || '',
      gst_number: currentProfile.businessGst || '',
      address: currentProfile.businessAddress || '',
      avatar: currentProfile.avatarUrl || null,
      category: 'Merchant',
      status: 'active',
      rating: 5,
      credit_limit: 100000,
      notes: 'Verified Peer Merchant (P2P Connected)',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id, user_id' });

    if (custErr) {
      console.warn('Error creating reciprocal customer in p2p-link:', custErr);
    }

    // 2. Also ensure current user's customer record for peer merchant is marked 'Merchant'
    if (peerCustomerData?.id) {
      await supabase.from('customers').update({
        category: 'Merchant',
        notes: peerCustomerData.notes || 'Verified Peer Merchant (P2P Connected)',
        updated_at: new Date().toISOString(),
      }).eq('id', peerCustomerData.id).eq('user_id', currentUserId);
    }

    return NextResponse.json({
      success: true,
      linked: true,
      reciprocalCustId,
      peerUserId,
      message: 'Reciprocal customer automatically created for peer merchant!',
    });
  } catch (error: any) {
    console.error('P2P linking error:', error);
    return NextResponse.json({ success: false, message: error.message || 'P2P link failed' }, { status: 500 });
  }
}
