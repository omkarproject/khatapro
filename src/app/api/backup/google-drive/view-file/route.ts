import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDriveForUser } from '@/lib/driveTokenHelper';
import { downloadDriveFileBuffer } from '@/lib/googleDrive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const download = searchParams.get('download') === 'true';
    const userId = searchParams.get('userId') || req.cookies.get('skp_auth_session')?.value;

    if (!fileId) {
      return NextResponse.json({ success: false, message: 'fileId parameter is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { drive } = await getAuthenticatedDriveForUser(userId);

    // Get file metadata for mimeType and filename
    let mimeType = 'application/octet-stream';
    let fileName = 'file';
    try {
      const meta = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType',
      });
      if (meta.data.mimeType) mimeType = meta.data.mimeType;
      if (meta.data.name) fileName = meta.data.name;
    } catch (e) {
      console.warn('Could not fetch file metadata, using default stream:', e);
    }

    const buffer = await downloadDriveFileBuffer(drive, fileId);

    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Cache-Control', 'public, max-age=3600');

    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('File stream error from Google Drive:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to stream file from Google Drive' },
      { status: 500 }
    );
  }
}
