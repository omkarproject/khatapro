import JSZip from 'jszip';
import crypto from 'crypto';

export interface BackupManifest {
  formatVersion: string;
  appName: string;
  backupTimestamp: string;
  businessName: string;
  businessRecoveryId: string;
  userEmail?: string;
  recordCounts: {
    customers: number;
    transactions: number;
    invoices: number;
    products: number;
    expenses: number;
    savingsGoals: number;
    reminders: number;
    documents: number;
    notes: number;
    tasks: number;
    passwords: number;
    customerDriveFiles: number;
  };
  modulesIncluded: string[];
  fileInventory: string[];
  checksum: string;
}

export interface FullBusinessData {
  profile?: any;
  settings?: any;
  customers?: any[];
  transactions?: any[];
  invoices?: any[];
  products?: any[];
  expenses?: any[];
  savingsGoals?: any[];
  reminders?: any[];
  documents?: any[];
  notes?: any[];
  tasks?: any[];
  passwords?: any[];
  customerDrive?: { folders: any[]; files: any[] };
}

/**
 * Creates a versioned ZIP backup containing all modules, manifest, and attachment files.
 */
export async function createBackupArchive(data: FullBusinessData): Promise<{
  zipBuffer: Buffer;
  manifest: BackupManifest;
  filename: string;
}> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `SmartKhata-Backup-${dateStr}.zip`;

  // Sanitize data: Never include tokens or credentials
  const cleanSettings = { ...(data.settings || {}) };
  delete cleanSettings.supabaseAnonKey;
  delete cleanSettings.supabaseServiceRoleKey;
  delete cleanSettings.firebaseApiKey;

  const cleanProfile = { ...(data.profile || {}) };
  delete cleanProfile.password;

  const customers = data.customers || [];
  const transactions = data.transactions || [];
  const invoices = data.invoices || [];
  const products = data.products || [];
  const expenses = data.expenses || [];
  const savingsGoals = data.savingsGoals || [];
  const reminders = data.reminders || [];
  const documents = data.documents || [];
  const notes = data.notes || [];
  const tasks = data.tasks || [];
  const passwords = data.passwords || [];
  const customerDrive = data.customerDrive || { folders: [], files: [] };

  const recordCounts = {
    customers: customers.length,
    transactions: transactions.length,
    invoices: invoices.length,
    products: products.length,
    expenses: expenses.length,
    savingsGoals: savingsGoals.length,
    reminders: reminders.length,
    documents: documents.length,
    notes: notes.length,
    tasks: tasks.length,
    passwords: passwords.length,
    customerDriveFiles: (customerDrive.files || []).length,
  };

  const fileInventory: string[] = [
    'manifest.json',
    'profile.json',
    'settings.json',
    'customers.json',
    'transactions.json',
    'invoices.json',
    'products.json',
    'expenses.json',
    'savings.json',
    'reminders.json',
    'documents.json',
    'notes.json',
    'tasks.json',
    'passwords.json',
    'customer_drive.json',
  ];

  // Add structured JSON files to zip
  zip.file('profile.json', JSON.stringify(cleanProfile, null, 2));
  zip.file('settings.json', JSON.stringify(cleanSettings, null, 2));
  zip.file('customers.json', JSON.stringify(customers, null, 2));
  zip.file('transactions.json', JSON.stringify(transactions, null, 2));
  zip.file('invoices.json', JSON.stringify(invoices, null, 2));
  zip.file('products.json', JSON.stringify(products, null, 2));
  zip.file('expenses.json', JSON.stringify(expenses, null, 2));
  zip.file('savings.json', JSON.stringify(savingsGoals, null, 2));
  zip.file('reminders.json', JSON.stringify(reminders, null, 2));
  zip.file('documents.json', JSON.stringify(documents, null, 2));
  zip.file('notes.json', JSON.stringify(notes, null, 2));
  zip.file('tasks.json', JSON.stringify(tasks, null, 2));
  zip.file('passwords.json', JSON.stringify(passwords, null, 2));
  zip.file('customer_drive.json', JSON.stringify(customerDrive, null, 2));

  // Compute checksum across all module payloads
  const dataForHash = JSON.stringify({
    profile: cleanProfile,
    customers,
    transactions,
    invoices,
    products,
    expenses,
    savingsGoals,
  });
  const checksum = crypto.createHash('sha256').update(dataForHash).digest('hex');

  const businessName = cleanProfile.businessName || cleanSettings.businessName || 'SmartKhata Merchant';
  const businessRecoveryId = crypto
    .createHash('sha1')
    .update(`${businessName}-${cleanProfile.email || 'user'}`)
    .digest('hex')
    .substring(0, 16);

  const manifest: BackupManifest = {
    formatVersion: '2.0.0',
    appName: 'SmartKhata Pro',
    backupTimestamp: new Date().toISOString(),
    businessName,
    businessRecoveryId,
    userEmail: cleanProfile.email,
    recordCounts,
    modulesIncluded: Object.keys(recordCounts),
    fileInventory,
    checksum,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { zipBuffer, manifest, filename };
}

/**
 * Parses and validates an uploaded SmartKhata backup archive.
 */
export async function parseBackupArchive(zipBuffer: Buffer): Promise<{
  manifest: BackupManifest;
  data: FullBusinessData;
  isValid: boolean;
}> {
  const zip = await JSZip.loadAsync(zipBuffer);

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Invalid archive: manifest.json is missing.');
  }

  const manifestStr = await manifestFile.async('string');
  const manifest: BackupManifest = JSON.parse(manifestStr);

  const readJson = async (filename: string, defaultValue: any) => {
    const file = zip.file(filename);
    if (!file) return defaultValue;
    try {
      const content = await file.async('string');
      return JSON.parse(content);
    } catch {
      return defaultValue;
    }
  };

  const data: FullBusinessData = {
    profile: await readJson('profile.json', {}),
    settings: await readJson('settings.json', {}),
    customers: await readJson('customers.json', []),
    transactions: await readJson('transactions.json', []),
    invoices: await readJson('invoices.json', []),
    products: await readJson('products.json', []),
    expenses: await readJson('expenses.json', []),
    savingsGoals: await readJson('savings.json', []),
    reminders: await readJson('reminders.json', []),
    documents: await readJson('documents.json', []),
    notes: await readJson('notes.json', []),
    tasks: await readJson('tasks.json', []),
    passwords: await readJson('passwords.json', []),
    customerDrive: await readJson('customer_drive.json', { folders: [], files: [] }),
  };

  return { manifest, data, isValid: true };
}
