import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const DEFAULT_CONFIG = {
  maintenanceMode: {
    enabled: false,
    durationMinutes: 15,
    reason: 'Transformer me aag lag gai ⚡💥🔥 many people repair kar rahe hain 👨‍🔧🛠️',
  },
  betaTestingEnabled: false,
};

// GET: Returns the global system config (maintenanceMode, betaTestingEnabled, websiteBranding, broadcasts, supportTickets)
export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data, error } = await supabase
          .from('global_config')
          .select('*')
          .eq('id', 'global_config')
          .single();

        if (data && !error) {
          const maintObj = data.maintenance_mode || {};
          return NextResponse.json({
            success: true,
            maintenanceMode: {
              enabled: Boolean(maintObj.enabled),
              durationMinutes: maintObj.durationMinutes || 15,
              reason: maintObj.reason || DEFAULT_CONFIG.maintenanceMode.reason,
              endTime: maintObj.endTime,
            },
            betaTestingEnabled: Boolean(data.beta_testing_enabled),
            websiteBranding: maintObj.websiteBranding || null,
            broadcasts: Array.isArray(maintObj.broadcasts) ? maintObj.broadcasts : [],
            supportTickets: Array.isArray(maintObj.supportTickets) ? maintObj.supportTickets : [],
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...DEFAULT_CONFIG,
      websiteBranding: null,
      broadcasts: [],
      supportTickets: [],
    });
  } catch (error: any) {
    console.error('System config GET error:', error);
    return NextResponse.json({
      success: true,
      ...DEFAULT_CONFIG,
      websiteBranding: null,
      broadcasts: [],
      supportTickets: [],
    });
  }
}

// POST: Save or update global system config in Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { maintenanceMode, betaTestingEnabled, websiteBranding, broadcasts, supportTickets } = body;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Supabase Cloud Database is not configured',
      }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        success: false,
        message: 'Could not connect to Supabase Cloud Database',
      }, { status: 500 });
    }

    // Read current global config to preserve existing properties
    const { data: existingData } = await supabase
      .from('global_config')
      .select('*')
      .eq('id', 'global_config')
      .single();

    const currentMaint = (existingData && typeof existingData.maintenance_mode === 'object' && existingData.maintenance_mode !== null)
      ? existingData.maintenance_mode
      : {};

    const updatedMaint = {
      ...currentMaint,
      ...(maintenanceMode !== undefined ? maintenanceMode : {}),
    };

    if (websiteBranding !== undefined) {
      updatedMaint.websiteBranding = websiteBranding;

      // Write physical image assets to public directory for instant SSR & reload
      try {
        if (websiteBranding?.websiteLogo && typeof websiteBranding.websiteLogo === 'string' && websiteBranding.websiteLogo.startsWith('data:image/')) {
          const parts = websiteBranding.websiteLogo.split(',');
          if (parts[1]) {
            fs.writeFileSync(path.join(process.cwd(), 'public', 'brand-logo.png'), Buffer.from(parts[1], 'base64'));
          }
        }
        if (websiteBranding?.websiteFavicon && typeof websiteBranding.websiteFavicon === 'string' && websiteBranding.websiteFavicon.startsWith('data:image/')) {
          const parts = websiteBranding.websiteFavicon.split(',');
          if (parts[1]) {
            const buf = Buffer.from(parts[1], 'base64');
            fs.writeFileSync(path.join(process.cwd(), 'public', 'brand-favicon.png'), buf);
            fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.ico'), buf);
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><image href="data:image/png;base64,${parts[1]}" width="64" height="64"/></svg>`;
            fs.writeFileSync(path.join(process.cwd(), 'public', 'icon.svg'), svgContent);
          }
        }

        const appIcon = path.join(process.cwd(), 'src', 'app', 'icon.svg');
        if (fs.existsSync(appIcon)) {
          try { fs.unlinkSync(appIcon); } catch {}
        }
      } catch (writeErr) {
        console.warn('Could not write physical brand assets to public directory:', writeErr);
      }
    }

    if (broadcasts !== undefined) {
      updatedMaint.broadcasts = broadcasts;
    }

    if (supportTickets !== undefined) {
      updatedMaint.supportTickets = supportTickets;
    }

    const updatePayload: any = {
      id: 'global_config',
      maintenance_mode: updatedMaint,
      updated_at: new Date().toISOString(),
    };

    if (betaTestingEnabled !== undefined) {
      updatePayload.beta_testing_enabled = Boolean(betaTestingEnabled);
    }

    const { data, error } = await supabase
      .from('global_config')
      .upsert(updatePayload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to update system config in Supabase',
      }, { status: 500 });
    }

    const savedMaint = data?.maintenance_mode || {};

    const resp = NextResponse.json({
      success: true,
      maintenanceMode: {
        enabled: Boolean(savedMaint.enabled),
        durationMinutes: savedMaint.durationMinutes || 15,
        reason: savedMaint.reason || DEFAULT_CONFIG.maintenanceMode.reason,
        endTime: savedMaint.endTime,
      },
      betaTestingEnabled: Boolean(data?.beta_testing_enabled),
      websiteBranding: savedMaint.websiteBranding || null,
      broadcasts: savedMaint.broadcasts || [],
      supportTickets: savedMaint.supportTickets || [],
    });

    if (savedMaint.websiteBranding) {
      if (savedMaint.websiteBranding.websiteBadgeText !== undefined) {
        resp.cookies.set('skp_brand_badge', String(savedMaint.websiteBranding.websiteBadgeText), { maxAge: 31536000, path: '/' });
      }
      if (savedMaint.websiteBranding.websiteName) {
        resp.cookies.set('skp_brand_name', String(savedMaint.websiteBranding.websiteName), { maxAge: 31536000, path: '/' });
      }
    }

    return resp;
  } catch (error: any) {
    console.error('System config POST error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update system config',
    }, { status: 500 });
  }
}
