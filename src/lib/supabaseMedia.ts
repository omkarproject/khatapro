import crypto from 'crypto';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { ensureSmartKhataFolders, getOrCreateCategoryFolder, uploadAttachmentFile } from '@/lib/googleDrive';

export const MEDIA_BUCKET = 'khatapro-media';

let bucketEnsured = false;

export async function isDriveGloballyEnabled(supabase: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: gc } = await supabase
      .from('global_config')
      .select('maintenance_mode')
      .eq('id', 'global_config')
      .maybeSingle();
    const maint = gc?.maintenance_mode;
    if (maint?.googleDriveEnabled === false || maint?.googleDriveSettings?.enabled === false) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

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
  dataUrl: string,
  driveCtx?: { drive: any; filesFolderId: string } | null
): Promise<string> {
  if (!supabase || !dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx < 0) return dataUrl;

    const meta = dataUrl.slice(0, commaIdx);
    const base64Part = dataUrl.slice(commaIdx + 1);
    const mimeMatch = meta.match(/data:([^;]+);base64/i);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const extFromMime = mimeType.split('/')[1]?.split('+')[0]?.replace(/[^a-z0-9]/gi, '') || 'bin';

    const buffer = Buffer.from(base64Part, 'base64');
    if (!buffer || buffer.length === 0) return dataUrl;

    const rawClean = String(fileName || `file.${extFromMime}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalName = rawClean.includes('.') ? rawClean : `${rawClean}.${extFromMime}`;

    // If merchant has Google Drive connected & Drive Integration is ON, upload ONLY to their Google Drive
    if (driveCtx?.drive && driveCtx?.filesFolderId) {
      try {
        const targetFolderId = await getOrCreateCategoryFolder(driveCtx.drive, driveCtx.filesFolderId, folder || 'Uploads');
        const driveRes = await uploadAttachmentFile(driveCtx.drive, targetFolderId, finalName, mimeType, buffer, {
          description: `SmartKhata Pro [${folder}] | Synced`,
        });
        if (driveRes?.fileId) {
          return `/api/backup/google-drive/view-file?fileId=${driveRes.fileId}`;
        }
      } catch (driveErr) {
        console.warn('Drive offload fallback to Supabase Storage:', driveErr);
      }
    }

    const ok = await ensureMediaBucket(supabase);
    if (!ok) return dataUrl;

    const safeUserId = String(userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFolder = String(folder || 'uploads').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
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

  // Check if any data: URLs actually exist before doing Drive auth lookup
  const hasAnyDataUrl = (() => {
    const s = JSON.stringify(data);
    return s.includes('"data:');
  })();
  if (!hasAnyDataUrl) return;

  // Resolve merchant's Google Drive connection once if Drive Integration is globally ON
  let driveCtx: { drive: any; filesFolderId: string } | null = null;
  try {
    const driveOn = await isDriveGloballyEnabled(supabase);
    if (driveOn) {
      const driveObj = await getAuthenticatedDriveForUser(userId);
      if (driveObj?.drive) {
        let filesFolderId = driveObj.tokenRecord?.docs_folder_id;
        if (!filesFolderId) {
          const folders = await ensureSmartKhataFolders(driveObj.drive);
          filesFolderId = folders.filesId;
        }
        driveCtx = { drive: driveObj.drive, filesFolderId };
      }
    }
  } catch {
    driveCtx = null;
  }

  const tasks: Promise<void>[] = [];

  if (Array.isArray(data.customers)) {
    for (const c of data.customers) {
      if (c && typeof c.avatar === 'string' && c.avatar.startsWith('data:')) {
        tasks.push(
          uploadDataUrlToStorage(supabase, userId, 'avatars', `${c.id || 'cust'}.jpg`, c.avatar, driveCtx).then((url) => {
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
              uploadDataUrlToStorage(supabase, userId, 'bills', att.name || `bill_${t.id}_${idx}`, att.url, driveCtx).then((url) => {
                att.url = url;
              })
            );
          } else if (typeof att === 'string' && att.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(att);
              if (parsed && typeof parsed.url === 'string' && parsed.url.startsWith('data:')) {
                tasks.push(
                  uploadDataUrlToStorage(supabase, userId, 'bills', parsed.name || `bill_${t.id}_${idx}`, parsed.url, driveCtx).then((url) => {
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
          uploadDataUrlToStorage(supabase, userId, 'expenses', `exp_${e.id || 'receipt'}`, e.receiptUrl, driveCtx).then((url) => {
            e.receiptUrl = url;
          })
        );
      }
      if (Array.isArray(e.receiptUrls)) {
        e.receiptUrls.forEach((u: any, idx: number) => {
          if (typeof u === 'string' && u.startsWith('data:')) {
            tasks.push(
              uploadDataUrlToStorage(supabase, userId, 'expenses', `exp_${e.id || 'receipt'}_${idx}`, u, driveCtx).then((url) => {
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
          uploadDataUrlToStorage(supabase, userId, 'products', `prod_${p.id || 'img'}`, p.imageUrl, driveCtx).then((url) => {
            p.imageUrl = url;
          })
        );
      }
      if (Array.isArray(p.images)) {
        p.images.forEach((img: any, idx: number) => {
          if (typeof img === 'string' && img.startsWith('data:')) {
            tasks.push(
              uploadDataUrlToStorage(supabase, userId, 'products', `prod_${p.id || 'img'}_${idx}`, img, driveCtx).then((url) => {
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
          uploadDataUrlToStorage(supabase, userId, 'savings', s.documentName || `goal_${s.id}`, s.documentUrl, driveCtx).then((url) => {
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
          uploadDataUrlToStorage(supabase, userId, 'vault', d.fileName || d.title || `doc_${d.id}`, d.fileUrl, driveCtx).then((url) => {
            d.fileUrl = url;
          })
        );
      }
    }
  }

  if (data.profile && typeof data.profile.avatarUrl === 'string' && data.profile.avatarUrl.startsWith('data:')) {
    tasks.push(
      uploadDataUrlToStorage(supabase, userId, 'profile', 'avatar.jpg', data.profile.avatarUrl, driveCtx).then((url) => {
        data.profile.avatarUrl = url;
        if (data.settings && typeof data.settings.businessLogo === 'string' && data.settings.businessLogo.startsWith('data:')) {
          data.settings.businessLogo = url;
        }
      })
    );
  } else if (data.settings && typeof data.settings.businessLogo === 'string' && data.settings.businessLogo.startsWith('data:')) {
    tasks.push(
      uploadDataUrlToStorage(supabase, userId, 'profile', 'business_logo.jpg', data.settings.businessLogo, driveCtx).then((url) => {
        data.settings.businessLogo = url;
      })
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}
