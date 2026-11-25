import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { DeviceSession } from '@/types';

async function broadcastDeviceSessionEvent(
  supabase: any,
  userId: string,
  payload: Record<string, any>
): Promise<void> {
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(finish, 1500);

    try {
      const chan = supabase.channel(`khatapro_realtime_${userId}`);
      chan.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          try {
            await chan.send({
              type: 'broadcast',
              event: 'khatapro_session_event',
              payload: {
                userId,
                timestamp: Date.now(),
                ...payload,
              },
            });
          } catch {}
          clearTimeout(timer);
          setTimeout(() => {
            try { supabase.removeChannel(chan); } catch {}
            finish();
          }, 180);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timer);
          try { supabase.removeChannel(chan); } catch {}
          finish();
        }
      });
    } catch {
      clearTimeout(timer);
      finish();
    }
  });
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  return (req as any).ip || '127.0.0.1';
}

function resolveUserId(req: NextRequest): string | null {
  const sessionCookie = req.cookies.get('skp_auth_session')?.value;
  if (sessionCookie && sessionCookie.trim()) return sessionCookie.trim();

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token) return token;
  }

  const urlUserId = req.nextUrl.searchParams.get('userId');
  if (urlUserId && urlUserId.trim()) return urlUserId.trim();

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = resolveUserId(req);
    const clientIp = getClientIp(req);
    const currentDeviceId = req.nextUrl.searchParams.get('deviceId') || req.headers.get('x-device-id') || '';

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized session' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        devices: [
          {
            id: currentDeviceId || 'dev_local',
            userId,
            deviceName: 'Local Device Session',
            deviceType: 'desktop',
            browser: 'Browser',
            os: 'Windows / Mac / Android',
            ip: clientIp,
            lastActive: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isCurrent: true,
            isRevoked: false,
          },
        ],
        isCurrentRevoked: false,
      });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Could not connect to database' }, { status: 500 });
    }

    // If user profile was deleted by Admin, immediately revoke session so user signs out
    try {
      const { data: existingProfile, error: profCheckErr } = await supabase
        .from('profiles')
        .select('id, is_blocked')
        .eq('id', userId)
        .maybeSingle();

      if (!profCheckErr && (!existingProfile || existingProfile.is_blocked)) {
        return NextResponse.json({
          success: true,
          devices: [],
          isCurrentRevoked: true,
          accountDeleted: !existingProfile,
        });
      }
    } catch {}

    let devices: DeviceSession[] = [];
    let tableExists = true;

    // 1. Try querying dedicated user_devices table
    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .order('last_active', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          tableExists = false;
        } else {
          console.warn('user_devices query error, falling back:', error.message);
          tableExists = false;
        }
      } else if (data) {
        devices = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          deviceName: row.device_name || 'Active Device',
          deviceType: row.device_type || 'desktop',
          browser: row.browser || '',
          os: row.os || '',
          ip: row.ip || clientIp,
          location: row.location || '',
          lastActive: row.last_active || row.updated_at || new Date().toISOString(),
          createdAt: row.created_at || new Date().toISOString(),
          isRevoked: Boolean(row.is_revoked),
          isCurrent: currentDeviceId ? row.id === currentDeviceId : false,
        }));
      }
    } catch {
      tableExists = false;
    }

    // 2. Also check system_settings.payment_settings.active_devices as dual-layer sync
    if (!tableExists || devices.length === 0 || !devices.some(d => d.id === currentDeviceId)) {
      try {
        const { data: userSettings } = await supabase
          .from('system_settings')
          .select('payment_settings')
          .eq('user_id', userId)
          .single();

        const paySettings = userSettings?.payment_settings || {};
        const storedDevices: any[] = Array.isArray(paySettings.active_devices) ? paySettings.active_devices : [];

        for (const sd of storedDevices) {
          const existingIdx = devices.findIndex(d => d.id === sd.id);
          if (existingIdx >= 0) {
            // If revoked in system_settings, ensure marked revoked
            if (sd.isRevoked) {
              devices[existingIdx].isRevoked = true;
            }
          } else {
            devices.push({
              ...sd,
              isCurrent: currentDeviceId ? sd.id === currentDeviceId : false,
            });
          }
        }
      } catch {}
    }

    // 3. Check if current device is revoked
    let isCurrentRevoked = false;
    if (currentDeviceId) {
      const matching = devices.find(d => d.id === currentDeviceId);
      if (matching && matching.isRevoked) {
        isCurrentRevoked = true;
      }
    }

    // Filter out revoked devices and deduplicate same device (same deviceName + browser + os + ip)
    const rawActive = devices.filter(d => !d.isRevoked);
    rawActive.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
    });

    const seenKeys = new Set<string>();
    const activeDevices: DeviceSession[] = [];
    for (const d of rawActive) {
      const fp = `${(d.deviceName || '').toLowerCase().trim()}|${(d.browser || '').toLowerCase().trim()}|${(d.os || '').toLowerCase().trim()}|${(d.ip || '').trim()}`;
      if (!seenKeys.has(fp)) {
        seenKeys.add(fp);
        activeDevices.push(d);
      }
    }

    return NextResponse.json({
      success: true,
      clientIp,
      isCurrentRevoked,
      devices: activeDevices,
    });
  } catch (error: any) {
    console.error('GET /api/auth/devices error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = resolveUserId(req);
    const clientIp = getClientIp(req);

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized session' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, deviceId, deviceName, deviceType, browser, os, location, keepCurrent } = body;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }

    const nowIso = new Date().toISOString();

    // ACTION: REGISTER OR HEARTBEAT
    if (action === 'register' || action === 'heartbeat') {
      const targetDevId = deviceId || `dev_${Date.now()}`;
      const targetDevName = deviceName || 'SmartKhata Session';
      const targetBrowser = browser || '';
      const targetOs = os || '';

      // 0. Remove duplicate active rows for the exact same device/browser/OS/IP so re-logins never create duplicate cards
      try {
        const { data: existingRows } = await supabase
          .from('user_devices')
          .select('id, device_name, browser, os, ip, is_revoked')
          .eq('user_id', userId)
          .eq('is_revoked', false);

        const dupIds = (existingRows || [])
          .filter((r: any) =>
            r.id !== targetDevId &&
            (r.device_name || '').toLowerCase().trim() === targetDevName.toLowerCase().trim() &&
            (r.browser || '').toLowerCase().trim() === targetBrowser.toLowerCase().trim() &&
            (r.os || '').toLowerCase().trim() === targetOs.toLowerCase().trim() &&
            (r.ip || '').trim() === clientIp.trim()
          )
          .map((r: any) => r.id);

        if (dupIds.length > 0) {
          await supabase.from('user_devices').delete().eq('user_id', userId).in('id', dupIds);
        }
      } catch {}

      // 1. Try upserting into user_devices table
      let tableSuccess = false;
      try {
        const { error } = await supabase.from('user_devices').upsert({
          id: targetDevId,
          user_id: userId,
          device_name: targetDevName,
          device_type: deviceType || 'desktop',
          browser: targetBrowser,
          os: targetOs,
          ip: clientIp,
          location: location || '',
          last_active: nowIso,
          is_revoked: false,
          created_at: nowIso,
        }, { onConflict: 'id,user_id' });

        if (!error) tableSuccess = true;
      } catch {}

      // 2. Also keep system_settings.payment_settings.active_devices updated as fallback (deduplicated)
      try {
        const { data: userSettings } = await supabase
          .from('system_settings')
          .select('payment_settings')
          .eq('user_id', userId)
          .single();

        const paySettings = userSettings?.payment_settings || {};
        let list: any[] = Array.isArray(paySettings.active_devices) ? [...paySettings.active_devices] : [];

        // Filter out duplicate non-revoked entries with same fingerprint
        list = list.filter((d: any) => {
          if (d.id === targetDevId) return true;
          if (d.isRevoked) return true;
          const sameFp =
            (d.deviceName || '').toLowerCase().trim() === targetDevName.toLowerCase().trim() &&
            (d.browser || '').toLowerCase().trim() === targetBrowser.toLowerCase().trim() &&
            (d.os || '').toLowerCase().trim() === targetOs.toLowerCase().trim() &&
            (d.ip || '').trim() === clientIp.trim();
          return !sameFp;
        });

        const existingIdx = list.findIndex(d => d.id === targetDevId);
        const deviceRecord: DeviceSession = {
          id: targetDevId,
          userId,
          deviceName: targetDevName,
          deviceType: deviceType || 'desktop',
          browser: browser || '',
          os: os || '',
          ip: clientIp,
          location: location || '',
          lastActive: nowIso,
          createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : nowIso,
          isRevoked: false,
        };

        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...deviceRecord, lastActive: nowIso, ip: clientIp, isRevoked: false };
        } else {
          list.push(deviceRecord);
        }

        // Limit to max 25 sessions
        if (list.length > 25) {
          list.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
          list = list.slice(0, 25);
        }

        await supabase.from('system_settings').update({
          payment_settings: {
            ...paySettings,
            active_devices: list,
          },
        }).eq('user_id', userId);
      } catch (settingsErr) {
        console.warn('Failed saving active_devices in system_settings:', settingsErr);
      }

      return NextResponse.json({
        success: true,
        message: 'Device session registered/refreshed',
        deviceId: targetDevId,
        ip: clientIp,
      });
    }

    // ACTION: LOGOUT SPECIFIC DEVICE
    if (action === 'logout_device' || action === 'revoke') {
      const targetDevId = deviceId;
      if (!targetDevId) {
        return NextResponse.json({ success: false, message: 'deviceId is required' }, { status: 400 });
      }

      // In user_devices table
      try {
        await supabase
          .from('user_devices')
          .update({ is_revoked: true, last_active: nowIso })
          .match({ id: targetDevId, user_id: userId });
      } catch {}

      // In system_settings fallback
      try {
        const { data: userSettings } = await supabase
          .from('system_settings')
          .select('payment_settings')
          .eq('user_id', userId)
          .single();

        const paySettings = userSettings?.payment_settings || {};
        let list: any[] = Array.isArray(paySettings.active_devices) ? [...paySettings.active_devices] : [];
        list = list.map(d => (d.id === targetDevId ? { ...d, isRevoked: true } : d));

        await supabase.from('system_settings').update({
          payment_settings: {
            ...paySettings,
            active_devices: list,
          },
        }).eq('user_id', userId);
      } catch {}

      await broadcastDeviceSessionEvent(supabase, userId, {
        action: 'logout_device',
        targetDeviceId: targetDevId,
        originDeviceId: 'server_devices_api',
      });

      return NextResponse.json({
        success: true,
        message: 'Device session revoked successfully',
        revokedDeviceId: targetDevId,
      });
    }

    // ACTION: LOGOUT ALL DEVICES (OR ALL OTHER DEVICES)
    if (action === 'logout_all' || action === 'logout_all_devices') {
      const shouldKeepCurrent = Boolean(keepCurrent && deviceId);

      // In user_devices table
      try {
        if (shouldKeepCurrent) {
          await supabase
            .from('user_devices')
            .update({ is_revoked: true, last_active: nowIso })
            .eq('user_id', userId)
            .neq('id', deviceId);
        } else {
          await supabase
            .from('user_devices')
            .update({ is_revoked: true, last_active: nowIso })
            .eq('user_id', userId);
        }
      } catch {}

      // In system_settings fallback
      try {
        const { data: userSettings } = await supabase
          .from('system_settings')
          .select('payment_settings')
          .eq('user_id', userId)
          .single();

        const paySettings = userSettings?.payment_settings || {};
        let list: any[] = Array.isArray(paySettings.active_devices) ? [...paySettings.active_devices] : [];

        if (shouldKeepCurrent) {
          list = list.map(d => (d.id === deviceId ? { ...d, isRevoked: false } : { ...d, isRevoked: true }));
        } else {
          list = list.map(d => ({ ...d, isRevoked: true }));
        }

        await supabase.from('system_settings').update({
          payment_settings: {
            ...paySettings,
            active_devices: list,
          },
        }).eq('user_id', userId);
      } catch {}

      await broadcastDeviceSessionEvent(supabase, userId, {
        action: shouldKeepCurrent ? 'logout_others' : 'logout_all',
        originDeviceId: shouldKeepCurrent ? deviceId : 'server_devices_api',
      });

      return NextResponse.json({
        success: true,
        message: shouldKeepCurrent
          ? 'All other devices have been logged out successfully.'
          : 'All devices logged out successfully.',
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/auth/devices error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = resolveUserId(req);
    const targetDevId = req.nextUrl.searchParams.get('deviceId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized session' }, { status: 401 });
    }

    if (!targetDevId) {
      return NextResponse.json({ success: false, message: 'deviceId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }

    const nowIso = new Date().toISOString();

    // 1. In user_devices
    try {
      await supabase
        .from('user_devices')
        .update({ is_revoked: true, last_active: nowIso })
        .match({ id: targetDevId, user_id: userId });
    } catch {}

    // 2. In system_settings
    try {
      const { data: userSettings } = await supabase
        .from('system_settings')
        .select('payment_settings')
        .eq('user_id', userId)
        .single();

      const paySettings = userSettings?.payment_settings || {};
      let list: any[] = Array.isArray(paySettings.active_devices) ? [...paySettings.active_devices] : [];
      list = list.map(d => (d.id === targetDevId ? { ...d, isRevoked: true } : d));

      await supabase.from('system_settings').update({
        payment_settings: {
          ...paySettings,
          active_devices: list,
        },
      }).eq('user_id', userId);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Device session revoked successfully',
      revokedDeviceId: targetDevId,
    });
  } catch (error: any) {
    console.error('DELETE /api/auth/devices error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
