import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// GET: On-demand fetch of Google Drive folders and files for a single customer
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const cookieUser = req.cookies.get('skp_auth_session')?.value;
    const userId = searchParams.get('userId') || cookieUser;

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'customerId is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, folders: [], files: [] });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, folders: [], files: [] });
    }

    let foldersQuery = supabase.from('customer_drive_folders').select('*').eq('customer_id', customerId);
    let filesQuery = supabase.from('customer_drive_files').select('*').eq('customer_id', customerId);

    if (userId) {
      foldersQuery = foldersQuery.eq('user_id', userId);
      filesQuery = filesQuery.eq('user_id', userId);
    }

    const [foldersRes, filesRes] = await Promise.all([foldersQuery, filesQuery]);

    const folders = (foldersRes.data || []).map((row: any) => ({
      id: row.id,
      customerId: row.customer_id,
      name: row.name,
      color: row.color || undefined,
      createdAt: row.created_at,
    }));

    const files = (filesRes.data || []).map((row: any) => {
      let extractedDriveFileId = '';
      const candidateUrl = row.url || row.data_url || '';
      if (candidateUrl.includes('view-file?fileId=')) {
        extractedDriveFileId = candidateUrl.split('view-file?fileId=')[1]?.split('&')[0];
      } else if (candidateUrl.includes('/file/d/')) {
        const match = candidateUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) extractedDriveFileId = match[1];
      } else if (/^[a-zA-Z0-9_-]{25,}$/.test(candidateUrl)) {
        extractedDriveFileId = candidateUrl;
      }

      const proxyUrl = extractedDriveFileId ? `/api/backup/google-drive/view-file?fileId=${extractedDriveFileId}` : '';
      const finalDisplayUrl = proxyUrl || (row.data_url && row.data_url !== 'file' ? row.data_url : '') || row.url || '';

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
    });

    return NextResponse.json({
      success: true,
      customerId,
      folders,
      files,
    });
  } catch (error: any) {
    console.error('Customer files on-demand fetch error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Save folders and files for a single customer on-demand
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, userId, folders, files } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'customerId is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, message: 'Local mode preserved' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to database' }, { status: 500 });
    }

    const effectiveUserId = userId || req.cookies.get('skp_auth_session')?.value || 'usr_001';

    if (Array.isArray(folders)) {
      const folderRows = folders.map((f: any) => ({
        id: f.id,
        user_id: effectiveUserId,
        customer_id: customerId,
        name: f.name || 'NEW FOLDER',
        color: f.color || '#F59E0B',
        created_at: f.createdAt || new Date().toISOString(),
      }));

      // Delete removed folders for this customer
      const activeFolderIds = new Set(folderRows.map(r => r.id));
      const { data: existingFolders } = await supabase
        .from('customer_drive_folders')
        .select('id')
        .eq('customer_id', customerId);

      if (existingFolders && existingFolders.length > 0) {
        const toDelete = existingFolders.map(e => e.id).filter(id => !activeFolderIds.has(id));
        if (toDelete.length > 0) {
          await supabase.from('customer_drive_folders').delete().in('id', toDelete);
        }
      }

      if (folderRows.length > 0) {
        await supabase.from('customer_drive_folders').upsert(folderRows, { onConflict: 'id, user_id' });
      }
    }

    if (Array.isArray(files)) {
      const fileRows = files.map((f: any) => ({
        id: f.id,
        user_id: effectiveUserId,
        customer_id: customerId,
        folder_id: f.folderId || null,
        name: f.name || 'document',
        size: Number(f.size) || 0,
        type: f.type || '',
        mime_type: f.mimeType || 'application/octet-stream',
        url: f.url || '',
        data_url: (f.dataUrl && f.dataUrl.length < 500000) ? f.dataUrl : (f.driveFileId ? `/api/backup/google-drive/view-file?fileId=${f.driveFileId}` : ''),
        created_at: f.createdAt || new Date().toISOString(),
        uploaded_at: f.uploadedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const activeFileIds = new Set(fileRows.map(r => r.id));
      const { data: existingFiles } = await supabase
        .from('customer_drive_files')
        .select('id')
        .eq('customer_id', customerId);

      if (existingFiles && existingFiles.length > 0) {
        const toDelete = existingFiles.map(e => e.id).filter(id => !activeFileIds.has(id));
        if (toDelete.length > 0) {
          await supabase.from('customer_drive_files').delete().in('id', toDelete);
        }
      }

      if (fileRows.length > 0) {
        await supabase.from('customer_drive_files').upsert(fileRows, { onConflict: 'id, user_id' });
      }
    }

    return NextResponse.json({ success: true, message: 'Customer Drive vault updated successfully' });
  } catch (error: any) {
    console.error('Customer files on-demand save error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
