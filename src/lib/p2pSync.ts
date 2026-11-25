export function normalizePhone(p?: string | null): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export function invertTransactionType(type?: string | null): string {
  if (type === 'credit' || type === 'give') return 'debit';
  if (type === 'debit' || type === 'collection' || type === 'received' || type === 'got') return 'credit';
  if (type === 'income') return 'expense';
  if (type === 'expense') return 'income';
  return type || 'debit';
}

export function buildTransactionDbRow(t: any, userId: string) {
  const dbType =
    t.type === 'debit' ||
    t.type === 'received' ||
    t.type === 'income' ||
    t.type === 'collection' ||
    t.type === 'got'
      ? 'got'
      : 'give';

  const baseTags: string[] = Array.isArray(t.tags) ? [...t.tags] : [];
  if (t.groupId && !baseTags.some((x) => x.startsWith('__grp_id:'))) {
    baseTags.push(`__grp_id:${t.groupId}`);
  }
  if (t.groupName && !baseTags.some((x) => x.startsWith('__grp_name:'))) {
    baseTags.push(`__grp_name:${encodeURIComponent(t.groupName)}`);
  }
  if (Array.isArray(t.splitMembers) && t.splitMembers.length > 0 && !baseTags.some((x) => x.startsWith('__grp_split:'))) {
    baseTags.push(`__grp_split:${JSON.stringify(t.splitMembers)}`);
  }
  if (Array.isArray(t.editHistory) && t.editHistory.length > 0) {
    const filtered = baseTags.filter((x) => !x.startsWith('__grp_edits:'));
    baseTags.length = 0;
    baseTags.push(...filtered, `__grp_edits:${JSON.stringify(t.editHistory)}`);
  }
  if (t.isDeleted || t.status === 'deleted') {
    if (!baseTags.includes('__is_deleted:true')) baseTags.push('__is_deleted:true');
    if (t.deletedAt && !baseTags.some((x) => x.startsWith('__del_at:'))) {
      baseTags.push(`__del_at:${t.deletedAt}`);
    }
    if (t.deletedBy && !baseTags.some((x) => x.startsWith('__del_by:'))) {
      baseTags.push(`__del_by:${encodeURIComponent(t.deletedBy)}`);
    }
  }

  const metaObj = {
    __sk_meta: true,
    origType: t.type || (dbType === 'give' ? 'credit' : 'debit'),
    customerName: t.customerName || '',
    createdBy: t.createdBy || '',
    referenceNo: t.referenceNo || '',
    tags: baseTags,
  };

  const sanitizedAttachments = (t.attachments || [])
    .map((att: any) => {
      let obj: any = null;
      if (typeof att === 'object' && att !== null) {
        if (att.__sk_meta) return null;
        obj = att;
      } else if (typeof att === 'string') {
        if (att.includes('__sk_meta')) return null;
        try {
          obj = JSON.parse(att);
        } catch {
          return att;
        }
      } else {
        return '';
      }

      if (obj) {
        let safeUrl = obj.url || '';
        if (safeUrl.startsWith('data:') && obj.driveFileId && !obj.driveFileId.startsWith('file_')) {
          safeUrl = `/api/backup/google-drive/view-file?fileId=${obj.driveFileId}`;
        }
        return JSON.stringify({ ...obj, url: safeUrl });
      }
      return '';
    })
    .filter(Boolean);

  sanitizedAttachments.push(JSON.stringify(metaObj));

  return {
    id: String(t.id),
    user_id: userId,
    customer_id: t.customerId || null,
    type: dbType,
    amount: Number(t.amount) || 0,
    date: t.date || new Date().toISOString().split('T')[0],
    description: t.note || t.description || '',
    category: t.category || 'General',
    payment_mode: t.paymentMode || t.payment_mode || 'cash',
    status: t.isDeleted || t.status === 'deleted' ? 'deleted' : t.status || 'completed',
    bill_number: t.referenceNo || '',
    invoice_id: t.invoiceId || null,
    attachments: sanitizedAttachments,
    created_at: t.createdAt || new Date().toISOString(),
    updated_at: t.updatedAt || new Date().toISOString(),
  };
}

export function decodeTransactionDbRow(row: any) {
  let origType: string = row.type === 'got' ? 'debit' : row.type === 'give' ? 'credit' : row.type;
  let customerName = row.customer_name || '';
  let createdBy = row.created_by || '';
  let referenceNo = row.bill_number || row.reference_no || '';
  let tags: string[] = Array.isArray(row.tags) ? [...row.tags] : [];
  let isDeleted = row.status === 'deleted';
  let deletedAt: string | undefined;
  let deletedBy: string | undefined;
  let editHistory: any[] | undefined;

  const cleanAttachments: string[] = [];
  (row.attachments || []).forEach((att: string) => {
    try {
      const obj = typeof att === 'string' ? JSON.parse(att) : att;
      if (obj && obj.__sk_meta) {
        if (obj.origType) origType = obj.origType;
        if (obj.customerName && !customerName) customerName = obj.customerName;
        if (obj.createdBy && !createdBy) createdBy = obj.createdBy;
        if (obj.referenceNo && !referenceNo) referenceNo = obj.referenceNo;
        if (Array.isArray(obj.tags)) tags = obj.tags;
        return;
      }
      cleanAttachments.push(typeof att === 'string' ? att : JSON.stringify(att));
    } catch {
      if (typeof att === 'string') cleanAttachments.push(att);
    }
  });

  tags.forEach((tag: string) => {
    if (tag.startsWith('__grp_edits:')) {
      try {
        editHistory = JSON.parse(tag.replace('__grp_edits:', ''));
      } catch {}
    } else if (tag.startsWith('__del_at:')) {
      deletedAt = tag.replace('__del_at:', '');
      isDeleted = true;
    } else if (tag.startsWith('__del_by:')) {
      try {
        deletedBy = decodeURIComponent(tag.replace('__del_by:', ''));
      } catch {
        deletedBy = tag.replace('__del_by:', '');
      }
      isDeleted = true;
    } else if (tag === '__is_deleted:true') {
      isDeleted = true;
    }
  });

  return {
    id: String(row.id),
    customerId: row.customer_id || undefined,
    customerName,
    type: origType,
    amount: Number(row.amount) || 0,
    date: row.date || new Date().toISOString().split('T')[0],
    category: row.category || 'General',
    paymentMode: row.payment_mode || 'cash',
    note: row.description || row.note || '',
    tags,
    attachments: cleanAttachments,
    status: isDeleted ? 'deleted' : row.status || 'completed',
    isDeleted,
    deletedAt,
    deletedBy,
    editHistory,
    referenceNo,
    createdBy,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

export async function recalculateCustomerBalance(
  supabase: any,
  userId: string,
  customerId: string
): Promise<number> {
  const { data: txns } = await supabase
    .from('transactions')
    .select('type, amount, status, attachments')
    .eq('user_id', userId)
    .eq('customer_id', customerId);

  let balance = 0;
  if (txns) {
    for (const raw of txns) {
      const decoded = decodeTransactionDbRow(raw);
      if (decoded.isDeleted || decoded.status === 'deleted') continue;
      const amt = Number(decoded.amount) || 0;
      if (decoded.type === 'credit' || decoded.type === 'give') {
        balance += amt;
      } else if (
        decoded.type === 'debit' ||
        decoded.type === 'got' ||
        decoded.type === 'collection' ||
        decoded.type === 'received'
      ) {
        balance -= amt;
      }
    }
  }

  await supabase
    .from('customers')
    .update({ outstanding_balance: balance, updated_at: new Date().toISOString() })
    .eq('id', customerId)
    .eq('user_id', userId);

  return balance;
}

export async function mirrorTransactionsFromDb(params: {
  supabase: any;
  sourceUserId: string;
  sourceDisplayName: string;
  sourcePhone: string;
  sourceCustomerIds: string[];
  targetUserId: string;
  targetCustomerId: string;
  targetPhone: string;
}): Promise<number> {
  const {
    supabase,
    sourceUserId,
    sourceDisplayName,
    sourcePhone,
    sourceCustomerIds,
    targetUserId,
    targetCustomerId,
    targetPhone,
  } = params;

  const validSourceIds = Array.from(new Set(sourceCustomerIds.filter(Boolean)));
  if (validSourceIds.length === 0 || !targetCustomerId) return 0;

  const { data: sourceRows } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', sourceUserId)
    .in('customer_id', validSourceIds);

  const directRows = (sourceRows || []).filter(
    (r: any) => r && r.id && !String(r.id).startsWith('peer_txn_')
  );

  let mirroredCount = 0;
  for (const raw of directRows) {
    const t = decodeTransactionDbRow(raw);
    const peerTxnId = `peer_txn_${t.id}`;
    const invertedType = invertTransactionType(t.type);

    const peerTags = (t.tags || []).filter(
      (tag: string) => !tag.startsWith('__del_') && tag !== '__is_deleted:true'
    );
    if (!peerTags.includes('__p2p_peer')) peerTags.push('__p2p_peer');
    if (!peerTags.some((tag: string) => tag.startsWith('__peer_user_id:'))) {
      peerTags.push(`__peer_user_id:${sourceUserId}`);
    }
    if (sourcePhone && !peerTags.some((tag: string) => tag.startsWith('__peer_phone:'))) {
      peerTags.push(`__peer_phone:${sourcePhone}`);
    }
    if (targetPhone && !peerTags.some((tag: string) => tag.startsWith('__cust_phone:'))) {
      peerTags.push(`__cust_phone:${targetPhone}`);
    }

    const peerTxnObj = {
      id: peerTxnId,
      customerId: targetCustomerId,
      customerName: sourceDisplayName,
      type: invertedType,
      amount: t.amount,
      date: t.date,
      category: t.category || (invertedType === 'credit' ? 'Credit Given' : 'Payment Received'),
      paymentMode: t.paymentMode || 'upi',
      note: t.note || '',
      tags: peerTags,
      attachments: t.attachments || [],
      status: t.isDeleted ? 'deleted' : t.status || 'completed',
      isDeleted: t.isDeleted,
      deletedAt: t.deletedAt,
      deletedBy: t.deletedBy,
      editHistory: t.editHistory,
      referenceNo: String(t.id),
      createdBy: sourceDisplayName,
      createdAt: t.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('transactions')
      .upsert(buildTransactionDbRow(peerTxnObj, targetUserId), { onConflict: 'id, user_id' });

    if (!error) {
      mirroredCount++;
    } else {
      console.warn('mirrorTransactionsFromDb upsert error:', error.message);
    }
  }

  await recalculateCustomerBalance(supabase, targetUserId, targetCustomerId);
  return mirroredCount;
}

export function broadcastPeerAlert(
  supabase: any,
  targetUserId: string,
  alert: Record<string, any>
) {
  try {
    const peerChan = supabase.channel(`khatapro_realtime_${targetUserId}`);
    peerChan.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        peerChan
          .send({
            type: 'broadcast',
            event: 'khatapro_device_sync',
            payload: {
              userId: targetUserId,
              originDeviceId: 'server_p2p_sync',
              action: 'p2p_transaction_alert',
              alert,
              timestamp: Date.now(),
            },
          })
          .finally(() => {
            setTimeout(() => {
              try {
                supabase.removeChannel(peerChan);
              } catch {}
            }, 1000);
          });
      }
    });
  } catch (err) {
    console.warn('broadcastPeerAlert warning:', err);
  }
}
