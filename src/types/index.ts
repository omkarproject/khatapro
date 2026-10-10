export type UserRole = 'super_admin' | 'business_owner' | 'manager' | 'accountant' | 'staff';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  businessName: string;
  businessGst?: string;
  businessAddress?: string;
  createdAt: string;
}

export interface CustomerBankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  accountType: 'Savings' | 'Current' | 'Corporate';
  isPrimary?: boolean;
  createdAt: string;
}

export interface CustomerUpiDetail {
  id: string;
  upiId: string;
  holderName?: string;
  appName?: string;
  qrImageUrl?: string;
  isPrimary?: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  businessName?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  creditLimit: number;
  outstandingBalance: number; // positive = customer owes us (Credit), negative = we owe customer (Debit)
  category: 'VIP' | 'Regular' | 'Wholesale' | 'Retail';
  status: 'active' | 'overdue' | 'blocked';
  rating: number; // 1 - 5
  notes?: string;
  avatar?: string;
  bankAccounts?: CustomerBankAccount[];
  upiDetails?: CustomerUpiDetail[];
  createdAt: string;
}

export type TransactionType = 'credit' | 'debit' | 'income' | 'expense' | 'collection' | 'payment' | 'transfer' | 'adjustment';
export type PaymentMode = 'upi' | 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  customerId?: string;
  customerName?: string;
  category: string;
  paymentMode: PaymentMode;
  note?: string;
  tags?: string[];
  attachments?: string[];
  referenceNo?: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number; // e.g. 18 for 18% GST
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'sales' | 'purchase' | 'quotation';
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerGst?: string;
  customerAddress?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  paidAmount: number;
  status: 'paid' | 'unpaid' | 'partially_paid' | 'overdue' | 'draft';
  paymentDate?: string;
  receiptUrl?: string;
  receiptName?: string;
  receiptType?: string;
  statusHistory?: InvoiceStatusHistoryEntry[];
  appliedCharges?: InvoiceAppliedCharge[];
  notes?: string;
  terms?: string;
  upiPaymentQr?: string;
  stockDeducted?: boolean;
  createdAt: string;
}

export interface InvoiceChargeConfig {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  enabled: boolean;
  isSystemTax?: boolean;
}

export interface InvoiceAppliedCharge {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  rate: number;
  amount: number;
}

export interface InvoiceStatusHistoryEntry {
  id: string;
  status: 'paid' | 'unpaid' | 'partially_paid' | 'overdue' | 'draft';
  date: string;
  amount?: number;
  notes?: string;
  receiptUrl?: string;
  receiptName?: string;
  receiptType?: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minStock: number;
  unit: 'pcs' | 'kg' | 'boxes' | 'liters' | 'meters';
  supplier?: string;
  location?: string;
  imageUrl?: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  paymentMode: PaymentMode;
  notes?: string;
  receiptUrl?: string;
  receiptUrls?: string[];
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
  tags: string[];
  createdAt: string;
}

export interface SavingsDeposit {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  receiptUrl?: string; // Data URL for image or PDF
  receiptName?: string;
  receiptType?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: 'Emergency Fund' | 'Business Expansion' | 'Tax Reserve' | 'Equipment' | 'Personal';
  deadline: string;
  notes?: string;
  icon?: string;
  documentUrl?: string; // Data URL for image or PDF attached in Notes section
  documentName?: string;
  documentType?: string;
  deposits?: SavingsDeposit[];
  createdAt: string;
}

export interface PaymentReminder {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  dueDate: string;
  reminderType: 'upcoming' | 'overdue' | 'custom' | 'recurring';
  channels: ('whatsapp' | 'sms' | 'email')[];
  status: 'pending' | 'sent' | 'scheduled';
  sentAt?: string;
  messageTemplate: string;
  note?: string;
  transactionId?: string;
  createdAt?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'invoice' | 'bill' | 'receipt' | 'contract' | 'identity' | 'tax';
  fileUrl: string;
  fileType: string;
  fileSize: string;
  relatedEntityId?: string;
  relatedEntityName?: string;
  uploadedAt: string;
}

export interface CustomerDriveFile {
  id: string;
  name: string;
  size: number;
  type: string;
  mimeType?: string;
  url?: string;
  dataUrl: string;
  folderId?: string | null;
  createdAt?: string;
  uploadedAt: string;
  updatedAt?: string;
}

export interface CustomerDriveFolder {
  id: string;
  name: string;
  createdAt: string;
  color?: string;
}

export type PaymentCollectionMode = 'direct_upi' | 'cashfree' | 'razorpay' | 'upi_gateway';

export interface PaymentSettings {
  collectionMode?: PaymentCollectionMode;
  upiId: string;
  payeeName: string;
  customQrUrl?: string; // Uploaded custom QR code image
  isDefaultQrSaved: boolean;
  businessGst?: string;
  currency: string;
  enableSoundAlerts: boolean;

  // Cashfree Payment Gateway Settings
  cashfreeAppId?: string;
  cashfreeSecretKey?: string;
  cashfreeEnv?: 'sandbox' | 'production';

  // Razorpay Payment Gateway Settings
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  razorpayEnv?: 'test' | 'live';

  // UPI Payment Gateway (PG) Settings
  upiGatewayProvider?: string;
  upiGatewayKey?: string;
  upiGatewaySecret?: string;
  upiGatewayWebhookUrl?: string;
}

export type BackendProvider = 'local' | 'supabase' | 'firebase' | 'mongodb';

export type BackupFrequency = 'daily' | 'every_2_days' | 'every_3_days' | 'weekly';
export type BackupDayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TelegramBackupSettings {
  enabled: boolean;
  botToken: string;
  chatId: string;
  frequency: BackupFrequency;
  selectedDay?: BackupDayOfWeek;
  backupTime: string; // e.g. "21:00"
  includeMedia: boolean; // with images/pdf or without images/pdf
  lastBackupAt?: string;
  lastBackupStatus?: 'success' | 'failed';
  lastBackupMessage?: string;
}

export interface MaintenanceModeConfig {
  enabled: boolean;
  endTime?: string; // ISO timestamp
  durationMinutes?: number;
  reason?: string;
}

export interface SystemSettings {
  backendProvider: BackendProvider;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  firebaseApiKey?: string;
  firebaseProjectId?: string;
  mongodbUri?: string;
  mongodbDbName?: string;
  businessName: string;
  businessLogo?: string;
  businessTagline: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  paymentSettings: PaymentSettings;
  monthlyBudgetCap?: number;
  darkMode: boolean;
  telegramBackup?: TelegramBackupSettings;
  maintenanceMode?: MaintenanceModeConfig;
  betaTestingEnabled?: boolean;
}

export interface NoteItem {
  id: string;
  title: string;
  description: string;
  reminderDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:MM
  category?: 'General' | 'Finance' | 'Customer' | 'Inventory' | 'Personal';
  color?: string; // e.g. 'amber', 'emerald', 'sky', 'indigo', 'rose', 'purple'
  isPinned?: boolean;
  attachedImage?: string; // Base64 data URL or image URL
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: string; // YYYY-MM-DD
  reminderDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:MM
  priority: 'low' | 'medium' | 'high';
  category?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PasswordItem {
  id: string;
  appName: string; // Web & App Name
  username: string; // User Name / ID / Email
  password: string; // Password
  recoveryKey?: string; // Recovery Key / 2FA Backup Key
  attachedImage?: string; // Screenshot / QR code backup image
  websiteUrl?: string; // Web URL
  notes?: string; // Notes
  category?: 'Banking' | 'Govt & Tax' | 'Business' | 'Social' | 'Utility' | 'Other';
  createdAt: string;
  updatedAt: string;
}


