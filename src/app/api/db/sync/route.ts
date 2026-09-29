import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET: Fetch all collections for a specific user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId query parameter is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const [
      customers,
      transactions,
      products,
      invoices,
      expenses,
      savingsGoals,
      reminders,
      documents,
      settingsDoc,
      userDoc,
    ] = await Promise.all([
      db.collection('customers').find({ userId }).toArray(),
      db.collection('transactions').find({ userId }).toArray(),
      db.collection('products').find({ userId }).toArray(),
      db.collection('invoices').find({ userId }).toArray(),
      db.collection('expenses').find({ userId }).toArray(),
      db.collection('savingsGoals').find({ userId }).toArray(),
      db.collection('reminders').find({ userId }).toArray(),
      db.collection('documents').find({ userId }).toArray(),
      db.collection('settings').findOne({ userId }),
      db.collection('users').findOne({ _id: userId } as any),
    ]);

    // Strip internal _id and return clean items
    const cleanArray = (arr: any[]) => arr.map(({ _id, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      userId,
      data: {
        customers: cleanArray(customers),
        transactions: cleanArray(transactions),
        products: cleanArray(products),
        invoices: cleanArray(invoices),
        expenses: cleanArray(expenses),
        savingsGoals: cleanArray(savingsGoals),
        reminders: cleanArray(reminders),
        documents: cleanArray(documents),
        settings: settingsDoc ? (({ _id, ...s }) => s)(settingsDoc) : null,
        user: userDoc ? (({ password, _id, ...u }) => u)(userDoc) : null,
      },
    });
  } catch (error: any) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch user data from MongoDB' }, { status: 500 });
  }
}

// POST: Save or bulk-sync all user data to MongoDB Atlas
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, data } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Helper for syncing a collection
    const syncCollection = async (colName: string, items: any[] | undefined) => {
      if (!Array.isArray(items)) return;
      const col = db.collection(colName);
      
      const activeIds = items.map(i => i.id).filter(Boolean);
      // Delete any items from MongoDB that are no longer in the active list (e.g. deleted by user)
      await col.deleteMany({ userId, id: { $nin: activeIds } });

      for (const item of items) {
        if (!item.id) continue;
        const docToSave = { ...item, userId };
        delete (docToSave as any)._id; // prevent immutable _id conflict
        await col.updateOne(
          { id: item.id, userId },
          { $set: docToSave },
          { upsert: true }
        );
      }
    };

    if (data) {
      await Promise.all([
        syncCollection('customers', data.customers),
        syncCollection('transactions', data.transactions),
        syncCollection('products', data.products),
        syncCollection('invoices', data.invoices),
        syncCollection('expenses', data.expenses),
        syncCollection('savingsGoals', data.savingsGoals),
        syncCollection('reminders', data.reminders),
        syncCollection('documents', data.documents),
      ]);

      if (data.settings) {
        const sDoc = { ...data.settings, userId };
        delete (sDoc as any)._id;
        await db.collection('settings').updateOne(
          { userId },
          { $set: sDoc },
          { upsert: true }
        );
      }

      if (data.profile) {
        const pDoc = { ...data.profile, userId };
        delete (pDoc as any)._id;
        await db.collection('users').updateOne(
          { _id: userId } as any,
          { $set: pDoc },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All user data synchronized to MongoDB Atlas successfully!',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to sync data to MongoDB' }, { status: 500 });
  }
}
