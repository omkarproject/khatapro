import { MongoClient, Db } from 'mongodb';

const DEFAULT_URI = process.env.MONGODB_URI || 'mongodb+srv://smartkhata:KhataPass%402026@cluster0.7evxtf6.mongodb.net/?appName=Cluster0';
const DEFAULT_DB = process.env.MONGODB_DB || 'smartkhata_db';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(customUri?: string, customDbName?: string): Promise<{ client: MongoClient; db: Db }> {
  const uri = customUri || DEFAULT_URI;
  const dbName = customDbName || DEFAULT_DB;

  // If custom parameters are given and different, instantiate a dedicated client
  if (customUri && customUri !== DEFAULT_URI) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    return { client, db: client.db(dbName) };
  }

  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });

  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
