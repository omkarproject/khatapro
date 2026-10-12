import { NextResponse } from 'next/server';

// Telegram backup has been discontinued and replaced with Supabase PostgreSQL & Google Drive Backup
export async function POST() {
  return NextResponse.json({
    success: false,
    message: 'Automated Telegram Backup has been discontinued. Please use Supabase PostgreSQL Cloud Sync and Google Drive Backup.',
  }, { status: 410 });
}
