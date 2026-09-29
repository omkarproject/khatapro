import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const uri = body.uri?.trim() || process.env.MONGODB_URI || 'mongodb+srv://smartkhata:KhataPass%402026@cluster0.7evxtf6.mongodb.net/?appName=Cluster0';
    const dbName = body.dbName?.trim() || process.env.MONGODB_DB || 'smartkhata_db';

    if (!uri) {
      return NextResponse.json({ success: false, message: 'MongoDB Connection URI is required' }, { status: 400 });
    }

    const startTime = Date.now();
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 7000 });
    await client.connect();
    const latency = Date.now() - startTime;

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    await client.close();

    // Mask password in URI for safe user display
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');

    return NextResponse.json({
      success: true,
      message: `Connected to MongoDB Atlas successfully! (${latency}ms ping)`,
      latency,
      database: dbName,
      cluster: maskedUri,
      collectionsCount: collections.length,
      collections: collections.map(c => c.name),
    });
  } catch (error: any) {
    console.error('MongoDB test connection failed:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to connect to MongoDB Atlas cluster',
    }, { status: 500 });
  }
}
