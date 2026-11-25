import crypto from 'crypto';

export const MEDIA_BUCKET = 'khatapro-media';

let bucketEnsured = false;

export async function ensureMediaBucket(supabase: any): Promise<boolean> {
  if (!supabase) return false;
  if (bucketEnsured) return true;

  try {
    const { data: existing, error: getErr } = await supabase.storage.getBucket(MEDIA_BUCKET);
    if (existing && !getErr) {
      bucketEnsured = true;
      return true;
    }

    const { error: createErr } = await supabase.storage.createBucket(MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: 15 * 1024 * 1024, // 15 MB max per file
    });

    if (!createErr || String(createErr.message || '').toLowerCase().includes('already exists')) {
      bucketEnsured = true;
      return true;
    }
    console.warn('Could not auto-create media bucket:', createErr.message);
    return false;
  } catch (e) {
    console.warn('ensureMediaBucket exception:', e);
    return false;
  }
}

export async function uploadDataUrlToStorage(
  supabase: any,
  userId: string,
  folder: string,
  fileName: string,
  dataUrl: string
): Promise<string> {
  if (!supabase || !dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  try {
    const ok = await ensureMediaBucket(supabase);
    if (!ok) return dataUrl;

    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx < 0) return dataUrl;

    const meta = dataUrl.slice(0, commaIdx);
    const base64Part = dataUrl.slice(commaIdx + 1);
    const mimeMatch = meta.match(/data:([^;]+);base64/i);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const extFromMime = mimeType.split('/')[1]?.split('+')[0]?.replace(/[^a-z0-9]/gi, '') || 'bin';

    const buffer = Buffer.from(base64Part, 'base64');
    if (!buffer || buffer.length === 0) return dataUrl;

    const safeUserId = String(userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFolder = String(folder || 'uploads').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const rawClean = String(fileName || `file.${extFromMime}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalName = rawClean.includes('.') ? rawClean : `${rawClean}.${extFromMime}`;
    const uniq = crypto.randomBytes(4).toString('hex');
    const storagePath = `${safeUserId}/${safeFolder}/${Date.now()}_${uniq}_${finalName}`;

    const { error: uploadErr } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, buffer, {
      contentType: mimeType,
      cacheControl: '31536000',
      upsert: true,
    });

    if (uploadErr) {
      console.warn('uploadDataUrlToStorage error:', uploadErr.message);
      return dataUrl;
    }

    const { data: pubData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
    return pubData?.publicUrl || dataUrl;
  } catch (e) {
    console.warn('uploadDataUrlToStorage exception:', e);
    return dataUrl;
  }
}

export async function offloadSyncMediaToStorage(supabase: any, userId: string, data: any): Promise<void> {
  if (!supabase || !userId || !data || typeof data !== 'object') return;

  const tasks: Promise<void>[] = [];

  if (Array.isArray(data.customers)) {
    for (const c of data.customers) {
      if (c && typeof c.avatar === 'string' && c.avatar.startsWith('data:')) {
        tasks.push(
          uploadDataUrlToStorage(supabase, userId, 'avatars', `${c.id || 'cust'}.jpg`, c.avatar).then((url) => {
            c.avatar = url;
          })
        );
      }
    }
  }

  if (Array.isArray(data.transactions)) {
    for (const t of data.transactions) {
      if (t && Array.isArray(t.attachments)) {
        t.attachments.forEach((att: any, idx: number) => {
          if (typeof att === 'object' && att !== null && typeof att.url === 'string' && att.url.startsWith('data:')) {
            tasks.push(
              uploadDataUrlToStorage(supabase, userId, 'bills', att.name || `bill_${t.id}_${idx}`, att.url).then((url) => {
                att.url = url;
              })
            );
          } else if (typeof att === 'string' && att.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(att);
              if (parsed && typeof parsed.url === 'string' && parsed.url.startsWith('data:')) {
                tasks.push(
                  uploadDataUrlToStorage(supabase, userId, 'bills', parsed.name || `bill_${t.id}_${idx}`, parsed.url).then((url) => {
                    parsed.url = url;
                    t.attachments[idx] = JSON.stringify(parsed);
                  })
                );
              }
            } catch {}
          }
        });
      }
    }
  }

  if (Array.isArray(data.expenses)) {
    for (const e of data.expenses) {
      if (!e) continue;
      if (typeof e.receiptUrl === 'string' && e.receiptUrl.startsWith('data:')) {
        tasks.push(
          uploadDataUrlToStorage(supabase, userId, 'expenses', `exp_${e.id || 'receipt'}`, e.receiptUrl).then((url) => {
            e.receiptUrl = url;
          })
        );
      }
      if (Array.isArray(e.receiptUrls)) {
        e.receiptUrls.forEach((u: any, idx: number) => {
          if (typeof u === 'string' && u.startsWith('data:')) {
            tasks.push(
              uploadDataUrlToStorage(supabase, userId, 'expenses', `exp_${e.id || 'receipt'}_${idx}`, u).then((url) => {
                e.receiptUrls[idx] = url;
              })
            );
          }
        });
      }
    }
  }

  if (Array.isArray(data.products)) {
    for (const p of data.products) {
      if (!p) continue;
      if (typeof p.imageUrl === 'string' && p.imageUrl.startsWith('data:')) {
        tasks.push(
          uploadDataUrlToStorage(supabase, userId, 'products', `prod_${p.id || 'img'}`, p.imageUrl).then((url) => {
            p.imageUrl = url;
          })
        );
      }
      if (Array.isArray(p.images)) {
        p.images.forEach((img: any, idx: number) => {
          if (typeof img === 'string' && img.startsWith('data:')) {
            tasks.push(
              uploadDataUrlToStorage(supabase, userId, 'products', `prod_${p.id || 'img'}_${idx}`, img).then((url) => {
                p.images[idx] = url;
              })
            );
          }
        });
      }
    }
  }

  if (Array.isArray(data.savingsGoals)) {
    for (const s of data.savingsGoals) {
      if (s && typeof s.documentUrl === 'string' && s.documentUrl.startsWith('data:')) {
        tasks.push(
          uploadDataUrlToStorage(supabase, userId, 'savings', s.documentName || `goal_${s.id}`, s.documentUrl).then((url) => {
            s.documentUrl = url;
          })
        );
      }
    }
  }

  if (Array.isArray(data.documents)) {
    for (const d of data.documents) {
      if (d && typeof d.fileUrl === 'string' && d.fileUrl.startsWith('data:')) {
        tasks.push(
          uploadDataUrlToStorage(supabase, userId, 'vault', d.fileName || d.title || `doc_${d.id}`, d.fileUrl).then((url) => {
            d.fileUrl = url;
          })
        );
      }
    }
  }

  if (data.profile && typeof data.profile.avatarUrl === 'string' && data.profile.avatarUrl.startsWith('data:')) {
    tasks.push(
      uploadDataUrlToStorage(supabase, userId, 'profile', 'avatar.jpg', data.profile.avatarUrl).then((url) => {
        data.profile.avatarUrl = url;
        if (data.settings && typeof data.settings.businessLogo === 'string' && data.settings.businessLogo.startsWith('data:')) {
          data.settings.businessLogo = url;
        }
      })
    );
  } else if (data.settings && typeof data.settings.businessLogo === 'string' && data.settings.businessLogo.startsWith('data:')) {
    tasks.push(
      uploadDataUrlToStorage(supabase, userId, 'profile', 'business_logo.jpg', data.settings.businessLogo).then((url) => {
        data.settings.businessLogo = url;
      })
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}
