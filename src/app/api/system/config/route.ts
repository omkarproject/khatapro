import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET: Returns the global system config (maintenanceMode & betaTestingEnabled)
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const configDoc = await db.collection('system_config').findOne({ id: 'global_config' });

    if (configDoc) {
      return NextResponse.json({
        success: true,
        maintenanceMode: configDoc.maintenanceMode || {
          enabled: false,
          durationMinutes: 15,
          reason: 'Transformer me aag lag gai ⚡💥🔥 many people repair kar rahe hain 👨‍🔧🛠️',
        },
        betaTestingEnabled: Boolean(configDoc.betaTestingEnabled),
      });
    }

    return NextResponse.json({
      success: true,
      maintenanceMode: {
        enabled: false,
        durationMinutes: 15,
        reason: 'Transformer me aag lag gai ⚡💥🔥 many people repair kar rahe hain 👨‍🔧🛠️',
      },
      betaTestingEnabled: false,
    });
  } catch (error: any) {
    console.error('System config GET error:', error);
    // Return safe default if database connection is slow
    return NextResponse.json({
      success: true,
      maintenanceMode: {
        enabled: false,
        durationMinutes: 15,
        reason: 'Transformer me aag lag gai ⚡💥🔥 many people repair kar rahe hain 👨‍🔧🛠️',
      },
      betaTestingEnabled: false,
    });
  }
}

// POST: Save or update global system config
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { maintenanceMode, betaTestingEnabled } = body;

    const { db } = await connectToDatabase();
    
    const updatePayload: any = {
      updatedAt: new Date().toISOString(),
    };

    if (maintenanceMode !== undefined) {
      updatePayload.maintenanceMode = maintenanceMode;
    }

    if (betaTestingEnabled !== undefined) {
      updatePayload.betaTestingEnabled = Boolean(betaTestingEnabled);
    }

    await db.collection('system_config').updateOne(
      { id: 'global_config' },
      { $set: updatePayload },
      { upsert: true }
    );

    const updated = await db.collection('system_config').findOne({ id: 'global_config' });

    return NextResponse.json({
      success: true,
      maintenanceMode: updated?.maintenanceMode,
      betaTestingEnabled: Boolean(updated?.betaTestingEnabled),
    });
  } catch (error: any) {
    console.error('System config POST error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update system config',
    }, { status: 500 });
  }
}
