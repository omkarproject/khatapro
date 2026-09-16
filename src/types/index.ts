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
  notes?: string;
  terms?: string;
  upiPaymentQr?: string;
  createdAt: string;
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
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
  tags: string[];
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

export interface SystemSettings {
  backendProvider: BackendProvider;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  firebaseApiKey?: string;
  firebaseProjectId?: string;
  mongodbUri?: string;
  mongodbDbName?: string;
  businessName: string;
  businessTagline: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  paymentSettings: PaymentSettings;
  darkMode: boolean;
}
