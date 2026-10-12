import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- MAPPERS: Frontend camelCase -> Supabase snake_case ---

function customerToDb(c: any, userId: string) {
  // Store only URL/link, do not store huge base64 strings in database
  const safeAvatar = c.avatarUrl || (c.avatar && !c.avatar.startsWith('data:') ? c.avatar : null);

  return {
    id: String(c.id),
    user_id: userId,
    name: c.name || '',
    phone: c.phone || '',
    email: c.email || '',
    business_name: c.businessName || '',
    gst_number: c.gstNumber || '',
    address: c.address || '',
    city: c.city || '',
    state: c.state || '',
    credit_limit: Number(c.creditLimit) || 0,
    outstanding_balance: Number(c.outstandingBalance) || 0,
    category: c.category || 'Regular',
    status: c.status || 'active',
    rating: Number(c.rating) || 5,
    notes: c.notes || '',
    avatar: safeAvatar || null,
    bank_accounts: Array.isArray(c.bankAccounts) ? c.bankAccounts : [],
    upi_details: Array.isArray(c.upiDetails) ? c.upiDetails : [],
    created_at: c.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function transactionToDb(t: any, userId: string) {
  // Strip large base64 data URLs from attachments so database strictly holds metadata records
  const sanitizedAttachments = (t.attachments || []).map((att: string) => {
    try {
      const obj = JSON.parse(att);
      if (obj.url && obj.url.startsWith('data:')) {
        return JSON.stringify({
          ...obj,
          url: obj.driveFileId ? `https://drive.google.com/file/d/${obj.driveFileId}/view` : '',
        });
      }
      return att;
    } catch {
      return att && !att.startsWith('data:') ? att : '';
    }
  }).filter(Boolean);

  return {
    id: String(t.id),
    user_id: userId,
    type: t.type || 'credit',
    amount: Number(t.amount) || 0,
    date: t.date || new Date().toISOString().split('T')[0],
    customer_id: t.customerId || null,
    customer_name: t.customerName || '',
    category: t.category || 'General',
    payment_mode: t.paymentMode || 'upi',
    note: t.note || '',
    tags: Array.isArray(t.tags) ? t.tags : [],
    attachments: sanitizedAttachments,
    reference_no: t.referenceNo || '',
    status: t.status || 'completed',
    created_by: t.createdBy || '',
    created_at: t.createdAt || new Date().toISOString(),
    updated_at: t.updatedAt || new Date().toISOString(),
  };
}

function productToDb(p: any, userId: string) {
  return {
    id: String(p.id),
    user_id: userId,
    name: p.name || '',
    sku: p.sku || '',
    barcode: p.barcode || '',
    category: p.category || 'General',
    purchase_price: Number(p.purchasePrice) || 0,
    selling_price: Number(p.sellingPrice) || 0,
    current_stock: Number(p.currentStock) || 0,
    min_stock: Number(p.minStock) || 0,
    unit: p.unit || 'pcs',
    supplier: p.supplier || '',
    location: p.location || '',
    image_url: p.imageUrl && !p.imageUrl.startsWith('data:') ? p.imageUrl : '',
    updated_at: p.updatedAt || new Date().toISOString(),
  };
}

function invoiceToDb(inv: any, userId: string) {
  return {
    id: String(inv.id),
    user_id: userId,
    invoice_number: inv.invoiceNumber || '',
    type: inv.type || 'sales',
    customer_id: inv.customerId || '',
    customer_name: inv.customerName || '',
    customer_phone: inv.customerPhone || '',
    customer_gst: inv.customerGst || '',
    customer_address: inv.customerAddress || '',
    issue_date: inv.issueDate || new Date().toISOString().split('T')[0],
    due_date: inv.dueDate || new Date().toISOString().split('T')[0],
    items: Array.isArray(inv.items) ? inv.items : [],
    subtotal: Number(inv.subtotal) || 0,
    discount_amount: Number(inv.discountAmount) || 0,
    tax_amount: Number(inv.taxAmount) || 0,
    cgst: Number(inv.cgst) || 0,
    sgst: Number(inv.sgst) || 0,
    igst: Number(inv.igst) || 0,
    total: Number(inv.total) || 0,
    paid_amount: Number(inv.paidAmount) || 0,
    status: inv.status || 'unpaid',
    payment_date: inv.paymentDate || null,
    receipt_url: inv.receiptUrl && !inv.receiptUrl.startsWith('data:') ? inv.receiptUrl : null,
    receipt_name: inv.receiptName || null,
    receipt_type: inv.receiptType || null,
    status_history: Array.isArray(inv.statusHistory) ? inv.statusHistory : [],
    applied_charges: Array.isArray(inv.appliedCharges) ? inv.appliedCharges : [],
    notes: inv.notes || null,
    terms: inv.terms || null,
    upi_payment_qr: inv.upiPaymentQr && !inv.upiPaymentQr.startsWith('data:') ? inv.upiPaymentQr : null,
    stock_deducted: Boolean(inv.stockDeducted),
    created_at: inv.createdAt || new Date().toISOString(),
  };
}

function expenseToDb(e: any, userId: string) {
  return {
    id: String(e.id),
    user_id: userId,
    title: e.title || '',
    amount: Number(e.amount) || 0,
    category: e.category || 'General',
    date: e.date || new Date().toISOString().split('T')[0],
    payment_mode: e.paymentMode || 'cash',
    notes: e.notes || null,
    receipt_url: e.receiptUrl && !e.receiptUrl.startsWith('data:') ? e.receiptUrl : null,
    receipt_urls: Array.isArray(e.receiptUrls) ? e.receiptUrls.filter((u: any) => typeof u === 'string' && !u.startsWith('data:')) : [],
    is_recurring: Boolean(e.isRecurring),
    recurring_frequency: e.recurringFrequency || null,
    tags: Array.isArray(e.tags) ? e.tags : [],
    created_at: e.createdAt || new Date().toISOString(),
  };
}

function savingsGoalToDb(s: any, userId: string) {
  return {
    id: String(s.id),
    user_id: userId,
    title: s.title || '',
    target_amount: Number(s.targetAmount) || 0,
    current_amount: Number(s.currentAmount) || 0,
    category: s.category || 'Emergency Fund',
    deadline: s.deadline || '',
    notes: s.notes || null,
    icon: s.icon || null,
    document_url: s.documentUrl && !s.documentUrl.startsWith('data:') ? s.documentUrl : null,
    document_name: s.documentName || null,
    document_type: s.documentType || null,
    deposits: Array.isArray(s.deposits) ? s.deposits : [],
    created_at: s.createdAt || new Date().toISOString(),
  };
}

function reminderToDb(r: any, userId: string) {
  return {
    id: String(r.id),
    user_id: userId,
    customer_id: r.customerId || '',
    customer_name: r.customerName || '',
    customer_phone: r.customerPhone || '',
    customer_email: r.customerEmail || '',
    amount: Number(r.amount) || 0,
    due_date: r.dueDate || '',
    reminder_type: r.reminderType || 'upcoming',
    channels: Array.isArray(r.channels) ? r.channels : ['sms'],
    status: r.status || 'pending',
    sent_at: r.sentAt || null,
    message_template: r.messageTemplate || '',
    note: r.note || null,
    transaction_id: r.transactionId || null,
    created_at: r.createdAt || new Date().toISOString(),
  };
}

function documentToDb(d: any, userId: string) {
  let fileUrl = d.fileUrl || '';
  if (fileUrl.startsWith('data:')) {
    fileUrl = d.driveFileId ? `/api/backup/google-drive/view-file?fileId=${d.driveFileId}` : '';
  }

  return {
    id: String(d.id),
    user_id: userId,
    title: d.title || '',
    category: d.category || 'general',
    file_url: fileUrl,
    file_type: d.fileType || '',
    file_size: d.fileSize || '',
    related_entity_id: d.relatedEntityId || null,
    related_entity_name: d.relatedEntityName || null,
    uploaded_at: d.uploadedAt || new Date().toISOString(),
  };
}

function noteToDb(n: any, userId: string) {
  return {
    id: String(n.id),
    user_id: userId,
    title: n.title || '',
    description: n.description || '',
    reminder_date: n.reminderDate || null,
    reminder_time: n.reminderTime || null,
    category: n.category || 'General',
    color: n.color || 'amber',
    is_pinned: Boolean(n.isPinned),
    attached_image: n.attachedImage && !n.attachedImage.startsWith('data:') ? n.attachedImage : null,
    created_at: n.createdAt || new Date().toISOString(),
    updated_at: n.updatedAt || new Date().toISOString(),
  };
}

function taskToDb(t: any, userId: string) {
  return {
    id: String(t.id),
    user_id: userId,
    title: t.title || '',
    description: t.description || '',
    is_completed: Boolean(t.isCompleted),
    due_date: t.dueDate || null,
    reminder_date: t.reminderDate || null,
    reminder_time: t.reminderTime || null,
    priority: t.priority || 'medium',
    category: t.category || 'General',
    created_at: t.createdAt || new Date().toISOString(),
    completed_at: t.completedAt || null,
  };
}

function passwordToDb(p: any, userId: string) {
  return {
    id: String(p.id),
    user_id: userId,
    app_name: p.appName || '',
    username: p.username || '',
    password: p.password || '',
    recovery_key: p.recoveryKey || null,
    attached_image: p.attachedImage && !p.attachedImage.startsWith('data:') ? p.attachedImage : null,
    website_url: p.websiteUrl || null,
    notes: p.notes || null,
    category: p.category || 'Business',
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: p.updatedAt || new Date().toISOString(),
  };
}

function customerDriveFolderToDb(f: any, userId: string) {
  return {
    id: String(f.id),
    user_id: userId,
    customer_id: f.customerId || '',
    name: f.name || '',
    color: f.color || null,
    created_at: f.createdAt || new Date().toISOString(),
  };
}

function customerDriveFileToDb(f: any, userId: string) {
  const safeUrl = f.url && !f.url.startsWith('data:') ? f.url : (f.driveFileId ? `https://drive.google.com/file/d/${f.driveFileId}/view` : null);
  return {
    id: String(f.id),
    user_id: userId,
    customer_id: f.customerId || '',
    name: f.name || '',
    size: Number(f.size) || 0,
    type: f.type || '',
    mime_type: f.mimeType || null,
    url: safeUrl,
    data_url: null, // Keep Supabase Postgres clean and lightweight without multi-megabyte base64
    folder_id: f.folderId || null,
    created_at: f.createdAt || new Date().toISOString(),
    uploaded_at: f.uploadedAt || new Date().toISOString(),
    updated_at: f.updatedAt || new Date().toISOString(),
  };
}

// --- MAPPERS: Supabase snake_case -> Frontend camelCase ---

function customerFromDb(row: any) {
  let avatarUrl = row.avatar || '';
  if (avatarUrl) {
    if (avatarUrl.includes('view-file?fileId=')) {
      // already a proxy url
    } else if (avatarUrl.includes('/file/d/')) {
      const match = avatarUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match) avatarUrl = `/api/backup/google-drive/view-file?fileId=${match[1]}`;
    }
  }

  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    businessName: row.business_name || '',
    gstNumber: row.gst_number || '',
    address: row.address || '',
    city: row.city || '',
    state: row.state || '',
    creditLimit: Number(row.credit_limit) || 0,
    outstandingBalance: Number(row.outstanding_balance) || 0,
    category: row.category || 'Regular',
    status: row.status || 'active',
    rating: Number(row.rating) || 5,
    notes: row.notes || '',
    avatar: avatarUrl,
    avatarUrl: avatarUrl,
    bankAccounts: row.bank_accounts || [],
    upiDetails: row.upi_details || [],
    createdAt: row.created_at,
  };
}

function transactionFromDb(row: any) {
  const transformedAttachments = (row.attachments || []).map((att: string) => {
    try {
      const obj = JSON.parse(att);
      let driveId = obj.driveFileId;
      if (!driveId && obj.url) {
        if (obj.url.includes('view-file?fileId=')) {
          driveId = obj.url.split('view-file?fileId=')[1]?.split('&')[0];
        } else if (obj.url.includes('/file/d/')) {
          const match = obj.url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (match) driveId = match[1];
        }
      }

      if (driveId) {
        return JSON.stringify({
          ...obj,
          driveFileId: driveId,
          url: `/api/backup/google-drive/view-file?fileId=${driveId}`,
        });
      }
      return att;
    } catch {
      return att;
    }
  });

  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount) || 0,
    date: row.date,
    customerId: row.customer_id || undefined,
    customerName: row.customer_name || '',
    category: row.category || 'General',
    paymentMode: row.payment_mode || 'upi',
    note: row.note || '',
    tags: row.tags || [],
    attachments: transformedAttachments,
    referenceNo: row.reference_no || '',
    status: row.status || 'completed',
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function productFromDb(row: any) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku || '',
    barcode: row.barcode || '',
    category: row.category || 'General',
    purchasePrice: Number(row.purchase_price) || 0,
    sellingPrice: Number(row.selling_price) || 0,
    currentStock: Number(row.current_stock) || 0,
    minStock: Number(row.min_stock) || 0,
    unit: row.unit || 'pcs',
    supplier: row.supplier || '',
    location: row.location || '',
    imageUrl: row.image_url || '',
    updatedAt: row.updated_at,
  };
}

function invoiceFromDb(row: any) {
  let receiptUrl = row.receipt_url || undefined;
  if (receiptUrl && receiptUrl.includes('/file/d/')) {
    const match = receiptUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) receiptUrl = `/api/backup/google-drive/view-file?fileId=${match[1]}`;
  }

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    type: row.type || 'sales',
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || '',
    customerGst: row.customer_gst || '',
    customerAddress: row.customer_address || '',
    issueDate: row.issue_date,
    dueDate: row.due_date,
    items: row.items || [],
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    cgst: Number(row.cgst) || 0,
    sgst: Number(row.sgst) || 0,
    igst: Number(row.igst) || 0,
    total: Number(row.total) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    status: row.status || 'unpaid',
    paymentDate: row.payment_date || undefined,
    receiptUrl: receiptUrl,
    receiptName: row.receipt_name || undefined,
    receiptType: row.receipt_type || undefined,
    statusHistory: row.status_history || [],
    appliedCharges: row.applied_charges || [],
    notes: row.notes || undefined,
    terms: row.terms || undefined,
    upiPaymentQr: row.upi_payment_qr || undefined,
    stockDeducted: Boolean(row.stock_deducted),
    createdAt: row.created_at,
  };
}

function expenseFromDb(row: any) {
  let receiptUrl = row.receipt_url || undefined;
  if (receiptUrl && receiptUrl.includes('/file/d/')) {
    const match = receiptUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) receiptUrl = `/api/backup/google-drive/view-file?fileId=${match[1]}`;
  }

  const receiptUrls = (row.receipt_urls || []).map((u: string) => {
    if (u && u.includes('/file/d/')) {
      const match = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match) return `/api/backup/google-drive/view-file?fileId=${match[1]}`;
    }
    return u;
  });

  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount) || 0,
    category: row.category || 'General',
    date: row.date,
    paymentMode: row.payment_mode || 'cash',
    notes: row.notes || undefined,
    receiptUrl: receiptUrl,
    receiptUrls: receiptUrls,
    isRecurring: Boolean(row.is_recurring),
    recurringFrequency: row.recurring_frequency || undefined,
    tags: row.tags || [],
    createdAt: row.created_at,
  };
}

function savingsGoalFromDb(row: any) {
  let docUrl = row.document_url || undefined;
  if (docUrl && docUrl.includes('/file/d/')) {
    const match = docUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) docUrl = `/api/backup/google-drive/view-file?fileId=${match[1]}`;
  }

  return {
    id: row.id,
    title: row.title,
    targetAmount: Number(row.target_amount) || 0,
    currentAmount: Number(row.current_amount) || 0,
    category: row.category || 'Emergency Fund',
    deadline: row.deadline || '',
    notes: row.notes || undefined,
    icon: row.icon || undefined,
    documentUrl: docUrl,
    documentName: row.document_name || undefined,
    documentType: row.document_type || undefined,
    deposits: row.deposits || [],
    createdAt: row.created_at,
  };
}

function reminderFromDb(row: any) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || '',
    customerEmail: row.customer_email || undefined,
    amount: Number(row.amount) || 0,
    dueDate: row.due_date,
    reminderType: row.reminder_type || 'upcoming',
    channels: row.channels || ['sms'],
    status: row.status || 'pending',
    sentAt: row.sent_at || undefined,
    messageTemplate: row.message_template || '',
    note: row.note || undefined,
    transactionId: row.transaction_id || undefined,
    createdAt: row.created_at,
  };
}

function documentFromDb(row: any) {
  let fileUrl = row.file_url || '';
  let driveFileId: string | undefined = undefined;
  if (fileUrl.includes('view-file?fileId=')) {
    driveFileId = fileUrl.split('view-file?fileId=')[1]?.split('&')[0];
  } else if (fileUrl.includes('/file/d/')) {
    const match = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) driveFileId = match[1];
  }

  return {
    id: row.id,
    title: row.title,
    category: row.category || 'general',
    fileUrl: fileUrl,
    fileType: row.file_type || '',
    fileSize: row.file_size || '',
    relatedEntityId: row.related_entity_id || undefined,
    relatedEntityName: row.related_entity_name || undefined,
    driveFileId,
    uploadedAt: row.uploaded_at,
  };
}

function noteFromDb(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    reminderDate: row.reminder_date || undefined,
    reminderTime: row.reminder_time || undefined,
    category: row.category || 'General',
    color: row.color || 'amber',
    isPinned: Boolean(row.is_pinned),
    attachedImage: row.attached_image || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskFromDb(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    isCompleted: Boolean(row.is_completed),
    dueDate: row.due_date || undefined,
    reminderDate: row.reminder_date || undefined,
    reminderTime: row.reminder_time || undefined,
    priority: row.priority || 'medium',
    category: row.category || 'General',
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
  };
}

function passwordFromDb(row: any) {
  return {
    id: row.id,
    appName: row.app_name,
    username: row.username,
    password: row.password,
    recoveryKey: row.recovery_key || undefined,
    attachedImage: row.attached_image || undefined,
    websiteUrl: row.website_url || undefined,
    notes: row.notes || undefined,
    category: row.category || 'Business',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function customerDriveFolderFromDb(row: any) {
  return {
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    color: row.color || undefined,
    createdAt: row.created_at,
  };
}

function customerDriveFileFromDb(row: any) {
  // Extract real Drive file ID (either raw ID or parsed from drive.google.com/file/d/ID/view)
  let extractedDriveFileId = row.url || '';
  if (extractedDriveFileId.includes('/file/d/')) {
    const match = extractedDriveFileId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) extractedDriveFileId = match[1];
  }

  // Streamable direct URL through our view-file proxy
  const proxyUrl = extractedDriveFileId ? `/api/backup/google-drive/view-file?fileId=${extractedDriveFileId}` : '';
  const finalDisplayUrl = row.data_url || proxyUrl || row.url || '';

  return {
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    size: Number(row.size) || 0,
    type: row.type || '',
    mimeType: row.mime_type || undefined,
    url: proxyUrl || row.url || undefined,
    driveFileId: extractedDriveFileId || undefined,
    dataUrl: finalDisplayUrl,
    folderId: row.folder_id || undefined,
    createdAt: row.created_at,
    uploadedAt: row.uploaded_at,
    updatedAt: row.updated_at,
  };
}

// GET: Fetch all modules for a specific user from Supabase PostgreSQL (returns camelCase objects)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId query parameter is required' }, { status: 400 });
    }

    if (!UUID_REGEX.test(userId)) {
      // Local/guest user session (not a UUID) -> return empty object gracefully
      return NextResponse.json({
        success: true,
        userId,
        provider: 'supabase',
        data: {},
      });
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
      sbDriveFld,
      sbDriveFile,
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
      supabase.from('customer_drive_folders').select('*').eq('user_id', userId),
      supabase.from('customer_drive_files').select('*').eq('user_id', userId),
      supabase.from('system_settings').select('*').eq('user_id', userId).single(),
      supabase.from('profiles').select('*').eq('id', userId).single(),
    ]);

    const logo = sbProfile.data?.avatar_url || sbSet.data?.payment_settings?.businessLogo || sbSet.data?.business_logo || '';

    const finalUser = sbProfile.data ? {
      id: sbProfile.data.id,
      name: sbProfile.data.name || sbProfile.data.full_name || '',
      email: sbProfile.data.email || '',
      phone: sbProfile.data.phone || '',
      businessName: sbProfile.data.business_name || '',
      avatarUrl: logo,
      role: sbProfile.data.role || 'user',
      createdAt: sbProfile.data.created_at || new Date().toISOString(),
    } : null;

    const finalSettings = sbSet.data ? {
      businessName: sbSet.data.business_name || '',
      businessLogo: logo,
      businessTagline: sbSet.data.business_tagline || '',
      businessPhone: sbSet.data.business_phone || '',
      businessEmail: sbSet.data.business_email || '',
      businessAddress: sbSet.data.business_address || '',
      paymentSettings: {
        ...(sbSet.data.payment_settings || {}),
        businessLogo: logo,
      },
      darkMode: Boolean(sbSet.data.dark_mode),
      backendProvider: sbSet.data.backend_provider || 'supabase',
    } : null;

    const finalData = {
      customers: (sbCust.data || []).map(customerFromDb),
      transactions: (sbTxn.data || []).map(transactionFromDb),
      products: (sbProd.data || []).map(productFromDb),
      invoices: (sbInv.data || []).map(invoiceFromDb),
      expenses: (sbExp.data || []).map(expenseFromDb),
      savingsGoals: (sbSavings.data || []).map(savingsGoalFromDb),
      reminders: (sbRem.data || []).map(reminderFromDb),
      documents: (sbDoc.data || []).map(documentFromDb),
      notes: (sbNotes.data || []).map(noteFromDb),
      tasks: (sbTasks.data || []).map(taskFromDb),
      passwords: (sbPass.data || []).map(passwordFromDb),
      customerDriveFolders: (sbDriveFld.data || []).map(customerDriveFolderFromDb),
      customerDriveFiles: (sbDriveFile.data || []).map(customerDriveFileFromDb),
      settings: finalSettings,
      user: finalUser,
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

    if (!UUID_REGEX.test(userId)) {
      // Guest or local mode without Supabase auth UUID
      return NextResponse.json({
        success: true,
        message: 'Local guest session preserved. Sign in to sync across devices.',
        provider: 'local',
      });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, message: 'Supabase Cloud Database is not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to Supabase Cloud Database' }, { status: 500 });
    }

    if (data) {
      // Helper to batch upsert converted rows and remove deleted records from Supabase
      const syncRowsWithDeletions = async (table: string, rows: any[]) => {
        const activeIds = new Set(rows.map(r => r.id));

        // 1. Delete rows in Supabase that the user has deleted
        const { data: existing, error: fetchErr } = await supabase
          .from(table)
          .select('id')
          .eq('user_id', userId);

        if (!fetchErr && existing && existing.length > 0) {
          const toDelete = existing.map(e => String(e.id)).filter(id => !activeIds.has(id));
          if (toDelete.length > 0) {
            for (let i = 0; i < toDelete.length; i += 50) {
              const chunk = toDelete.slice(i, i + 50);
              await supabase.from(table).delete().eq('user_id', userId).in('id', chunk);
            }
          }
        }

        // 2. Upsert active rows in batches of 50
        if (rows.length > 0) {
          const chunkSize = 50;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id, user_id' });
            if (error) {
              console.error(`Error syncing table ${table}:`, error.message);
            }
          }
        }
      };

      const promises: Promise<any>[] = [];

      if (Array.isArray(data.customers)) {
        const rows = data.customers.filter((c: any) => c && c.id).map((c: any) => customerToDb(c, userId));
        promises.push(syncRowsWithDeletions('customers', rows));
      }

      if (Array.isArray(data.transactions)) {
        const rows = data.transactions.filter((t: any) => t && t.id).map((t: any) => transactionToDb(t, userId));
        promises.push(syncRowsWithDeletions('transactions', rows));
      }

      if (Array.isArray(data.products)) {
        const rows = data.products.filter((p: any) => p && p.id).map((p: any) => productToDb(p, userId));
        promises.push(syncRowsWithDeletions('products', rows));
      }

      if (Array.isArray(data.invoices)) {
        const rows = data.invoices.filter((inv: any) => inv && inv.id).map((inv: any) => invoiceToDb(inv, userId));
        promises.push(syncRowsWithDeletions('invoices', rows));
      }

      if (Array.isArray(data.expenses)) {
        const rows = data.expenses.filter((e: any) => e && e.id).map((e: any) => expenseToDb(e, userId));
        promises.push(syncRowsWithDeletions('expenses', rows));
      }

      if (Array.isArray(data.savingsGoals)) {
        const rows = data.savingsGoals.filter((s: any) => s && s.id).map((s: any) => savingsGoalToDb(s, userId));
        promises.push(syncRowsWithDeletions('savings_goals', rows));
      }

      if (Array.isArray(data.reminders)) {
        const rows = data.reminders.filter((r: any) => r && r.id).map((r: any) => reminderToDb(r, userId));
        promises.push(syncRowsWithDeletions('payment_reminders', rows));
      }

      if (Array.isArray(data.documents)) {
        const rows = data.documents.filter((d: any) => d && d.id).map((d: any) => documentToDb(d, userId));
        promises.push(syncRowsWithDeletions('documents', rows));
      }

      if (Array.isArray(data.notes)) {
        const rows = data.notes.filter((n: any) => n && n.id).map((n: any) => noteToDb(n, userId));
        promises.push(syncRowsWithDeletions('notes', rows));
      }

      if (Array.isArray(data.tasks)) {
        const rows = data.tasks.filter((t: any) => t && t.id).map((t: any) => taskToDb(t, userId));
        promises.push(syncRowsWithDeletions('tasks', rows));
      }

      if (Array.isArray(data.passwords)) {
        const rows = data.passwords.filter((p: any) => p && p.id).map((p: any) => passwordToDb(p, userId));
        promises.push(syncRowsWithDeletions('passwords', rows));
      }

      if (Array.isArray(data.customerDriveFolders)) {
        const rows = data.customerDriveFolders.filter((f: any) => f && f.id).map((f: any) => customerDriveFolderToDb(f, userId));
        promises.push(syncRowsWithDeletions('customer_drive_folders', rows));
      }

      if (Array.isArray(data.customerDriveFiles)) {
        const rows = data.customerDriveFiles.filter((f: any) => f && f.id).map((f: any) => customerDriveFileToDb(f, userId));
        promises.push(syncRowsWithDeletions('customer_drive_files', rows));
      }

      const logoToSave = data.settings?.businessLogo || data.profile?.avatarUrl || '';

      if (data.settings) {
        const paymentSettingsWithLogo = {
          ...(data.settings.paymentSettings || {}),
          businessLogo: logoToSave || data.settings.paymentSettings?.businessLogo || '',
        };
        promises.push(
          Promise.resolve(
            supabase.from('system_settings').upsert({
              user_id: userId,
              business_name: data.settings.businessName,
              business_logo: logoToSave,
              business_tagline: data.settings.businessTagline,
              business_phone: data.settings.businessPhone,
              business_email: data.settings.businessEmail,
              business_address: data.settings.businessAddress,
              payment_settings: paymentSettingsWithLogo,
              dark_mode: data.settings.darkMode,
              backend_provider: 'supabase',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
          )
        );
      }

      if (data.profile) {
        promises.push(
          Promise.resolve(
            supabase.from('profiles').upsert({
              id: userId,
              name: data.profile.name,
              email: data.profile.email,
              phone: data.profile.phone,
              business_name: data.profile.businessName,
              business_gst: data.profile.businessGst || '',
              business_address: data.profile.businessAddress || '',
              avatar_url: logoToSave || data.profile.avatarUrl || '',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })
          )
        );
      }

      await Promise.all(promises);
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
