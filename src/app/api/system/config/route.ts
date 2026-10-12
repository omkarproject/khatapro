import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

const DEFAULT_CONFIG = {
  maintenanceMode: {
    enabled: false,
    durationMinutes: 15,
    reason: 'Transformer me aag lag gai ⚡💥🔥 many people repair kar rahe hain 👨‍🔧🛠️',
  },
  betaTestingEnabled: false,
};

// GET: Returns the global system config (maintenanceMode & betaTestingEnabled) from Supabase
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
          return NextResponse.json({
            success: true,
            maintenanceMode: data.maintenance_mode || DEFAULT_CONFIG.maintenanceMode,
            betaTestingEnabled: Boolean(data.beta_testing_enabled),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...DEFAULT_CONFIG,
    });
  } catch (error: any) {
    console.error('System config GET error:', error);
    return NextResponse.json({
      success: true,
      ...DEFAULT_CONFIG,
    });
  }
}

// POST: Save or update global system config in Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { maintenanceMode, betaTestingEnabled } = body;

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

    const updatePayload: any = {
      id: 'global_config',
      updated_at: new Date().toISOString(),
    };

    if (maintenanceMode !== undefined) {
      updatePayload.maintenance_mode = maintenanceMode;
    }

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

    return NextResponse.json({
      success: true,
      maintenanceMode: data?.maintenance_mode,
      betaTestingEnabled: Boolean(data?.beta_testing_enabled),
    });
  } catch (error: any) {
    console.error('System config POST error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update system config',
    }, { status: 500 });
  }
}
