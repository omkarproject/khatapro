import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { botToken, chatId, backupJson, caption, fileName, isTest } = body;

    if (!botToken || !botToken.trim()) {
      return NextResponse.json(
        { success: false, message: 'Telegram Bot Token is required.' },
        { status: 400 }
      );
    }

    if (!chatId || !chatId.trim()) {
      return NextResponse.json(
        { success: false, message: 'Telegram Chat ID is required.' },
        { status: 400 }
      );
    }

    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();

    // If pure test connection without sending full backup file
    if (isTest && !backupJson) {
      const getMeRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const getMeData = await getMeRes.json();
      if (!getMeData.ok) {
        return NextResponse.json({
          success: false,
          message: `Telegram Bot Error: ${getMeData.description || 'Invalid Bot Token'}`,
        });
      }

      const testMsgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: `🔔 *SmartKhata Pro - Telegram Connection Test*\n\n✅ Bot connected successfully!\n🤖 Bot: @${getMeData.result.username}\n⏰ Time: ${new Date().toLocaleString('en-IN')}\n\nAutomated JSON database backups are ready to be delivered to this chat.`,
          parse_mode: 'Markdown',
        }),
      });

      const testMsgData = await testMsgRes.json();
      if (!testMsgData.ok) {
        return NextResponse.json({
          success: false,
          message: `Could not send message to Chat ID (${cleanChatId}): ${testMsgData.description || 'Chat not found'}. Make sure you have opened the bot and pressed /start first!`,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Success! Connected to @${getMeData.result.username} and sent confirmation ping to Chat ID: ${cleanChatId}.`,
      });
    }

    // Full Backup Document Sending
    if (!backupJson) {
      return NextResponse.json(
        { success: false, message: 'No backup payload provided.' },
        { status: 400 }
      );
    }

    const targetFileName = fileName || `SmartKhataPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    const finalCaption = caption || `📦 *SmartKhata Pro - Automated Database Backup*\n📅 Date: ${new Date().toLocaleString('en-IN')}\n🔐 Encrypted JSON Snapshot`;

    // Construct FormData for multipart sendDocument upload
    const formData = new FormData();
    formData.append('chat_id', cleanChatId);
    formData.append('caption', finalCaption);
    formData.append('parse_mode', 'Markdown');

    const jsonBlob = new Blob([typeof backupJson === 'string' ? backupJson : JSON.stringify(backupJson, null, 2)], {
      type: 'application/json',
    });
    formData.append('document', jsonBlob, targetFileName);

    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      return NextResponse.json({
        success: false,
        message: `Telegram Error: ${tgData.description || 'Failed to send backup document'}.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Backup snapshot "${targetFileName}" successfully delivered to Telegram!`,
      sentAt: new Date().toISOString(),
      fileId: tgData.result?.document?.file_id,
    });
  } catch (error: any) {
    console.error('Telegram backup error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error while dispatching to Telegram' },
      { status: 500 }
    );
  }
}
