import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { SupportTicket, SupportMessage } from '@/types';

// Helper to fetch tickets from global_config
async function getTicketsFromDb(): Promise<SupportTicket[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('global_config')
    .select('maintenance_mode')
    .eq('id', 'global_config')
    .single();

  if (error || !data) return [];
  const maint = data.maintenance_mode || {};
  return Array.isArray(maint.supportTickets) ? maint.supportTickets : [];
}

// Helper to save tickets to global_config
async function saveTicketsToDb(tickets: SupportTicket[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data: existing } = await supabase
    .from('global_config')
    .select('*')
    .eq('id', 'global_config')
    .single();

  const currentMaint = (existing && typeof existing.maintenance_mode === 'object' && existing.maintenance_mode !== null)
    ? existing.maintenance_mode
    : {};

  currentMaint.supportTickets = tickets;

  const { error } = await supabase
    .from('global_config')
    .upsert({
      id: 'global_config',
      maintenance_mode: currentMaint,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  return !error;
}

// GET: Retrieve support tickets
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const cookie = req.cookies.get('skp_auth_session')?.value;
    const header = req.headers.get('x-auth-session') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const callerId = cookie || header;

    let isRealAdmin = false;
    const supabase = getSupabaseAdmin();
    if (callerId && supabase) {
      const { data: prof } = await supabase.from('profiles').select('email, role').eq('id', callerId).maybeSingle();
      if (prof?.email === 'anantyadav8924@gmail.com' || prof?.role === 'super_admin' || prof?.role === 'admin') {
        isRealAdmin = true;
      }
    }

    const effectiveUserId = isRealAdmin && userId ? userId : (callerId || userId);
    if (!isRealAdmin && !effectiveUserId) {
      return NextResponse.json({ success: false, message: 'Authentication session required' }, { status: 401 });
    }

    const allTickets = await getTicketsFromDb();

    // Only genuine admins can view all tickets; merchants only see their own tickets
    const filtered = (isRealAdmin && !userId)
      ? allTickets
      : allTickets.filter(t => t.userId === effectiveUserId);

    return NextResponse.json({
      success: true,
      tickets: filtered,
    });
  } catch (error: any) {
    console.error('Support tickets GET error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch tickets' }, { status: 500 });
  }
}

// POST: Create a new support ticket or add a message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const allTickets = await getTicketsFromDb();

    if (action === 'create_ticket') {
      const {
        userId,
        userName,
        userEmail,
        userPhone,
        subject,
        category = 'General',
        priority = 'medium',
        initialMessage = '',
        attachments = [],
      } = body;

      if (!userId || !subject) {
        return NextResponse.json({ success: false, message: 'User ID and subject are required' }, { status: 400 });
      }

      const ticketId = 'ticket_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const ticketNo = 'SUP-' + Math.floor(1000 + Math.random() * 9000);

      const firstMessage: SupportMessage = {
        id: 'msg_' + Date.now(),
        ticketId,
        senderId: userId,
        senderName: userName || 'Merchant',
        senderRole: 'merchant',
        text: initialMessage.trim() || subject,
        attachments: Array.isArray(attachments) ? attachments : [],
        createdAt: new Date().toISOString(),
      };

      const newTicket: SupportTicket = {
        id: ticketId,
        ticketNo,
        userId,
        userName: userName || 'Merchant',
        userEmail: userEmail || '',
        userPhone: userPhone || '',
        subject: subject.trim(),
        status: 'open',
        priority,
        category,
        unreadByAdmin: true,
        unreadByMerchant: false,
        messages: [firstMessage],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedList = [newTicket, ...allTickets];
      await saveTicketsToDb(updatedList);

      return NextResponse.json({
        success: true,
        ticket: newTicket,
        message: 'Support ticket opened successfully. Admin has been notified!',
      });
    }

    if (action === 'add_message') {
      const { ticketId, senderId, senderName, senderRole, text, attachments = [] } = body;

      if (!ticketId || !text?.trim()) {
        return NextResponse.json({ success: false, message: 'Ticket ID and message text are required' }, { status: 400 });
      }

      const ticketIndex = allTickets.findIndex(t => t.id === ticketId);
      if (ticketIndex === -1) {
        return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 });
      }

      const existingTicket = allTickets[ticketIndex];
      const newMsg: SupportMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        ticketId,
        senderId,
        senderName: senderName || (senderRole === 'admin' ? 'Support Desk' : 'Merchant'),
        senderRole: senderRole || 'merchant',
        text: text.trim(),
        attachments: Array.isArray(attachments) ? attachments : [],
        createdAt: new Date().toISOString(),
      };

      const updatedTicket: SupportTicket = {
        ...existingTicket,
        status: senderRole === 'admin' ? (existingTicket.status === 'open' ? 'in_progress' : existingTicket.status) : existingTicket.status,
        unreadByAdmin: senderRole === 'merchant',
        unreadByMerchant: senderRole === 'admin',
        messages: [...(existingTicket.messages || []), newMsg],
        updatedAt: new Date().toISOString(),
      };

      allTickets[ticketIndex] = updatedTicket;
      await saveTicketsToDb(allTickets);

      return NextResponse.json({
        success: true,
        ticket: updatedTicket,
        newMessage: newMsg,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Support tickets POST error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to process request' }, { status: 500 });
  }
}

// PATCH: Update ticket status or mark read
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, status, markReadBy } = body;

    if (!ticketId) {
      return NextResponse.json({ success: false, message: 'Ticket ID is required' }, { status: 400 });
    }

    const allTickets = await getTicketsFromDb();
    const ticketIndex = allTickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    const currentTicket = allTickets[ticketIndex];
    const updated: SupportTicket = {
      ...currentTicket,
      ...(status ? { status } : {}),
      ...(markReadBy === 'admin' ? { unreadByAdmin: false } : {}),
      ...(markReadBy === 'merchant' ? { unreadByMerchant: false } : {}),
      updatedAt: new Date().toISOString(),
    };

    allTickets[ticketIndex] = updated;
    await saveTicketsToDb(allTickets);

    return NextResponse.json({
      success: true,
      ticket: updated,
    });
  } catch (error: any) {
    console.error('Support tickets PATCH error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to update ticket' }, { status: 500 });
  }
}
