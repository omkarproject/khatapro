export type UserRole = 'admin' | 'user' | 'super_admin' | 'business_owner';

export type EntityType =
  | 'customers'
  | 'transactions'
  | 'invoices'
  | 'expenses'
  | 'products'
  | 'savings_goals'
  | 'payment_reminders'
  | 'notes'
  | 'tasks'
  | 'documents';

export interface KhataGroupMember {
  userId: string;
  username?: string;
  name: string;
  businessName?: string;
  phone?: string;
  role: 'creator' | 'member';
  joinedAt: string;
}

export interface KhataGroup {
  id: string;
  name: string;
  description?: string;
  createdByUserId: string;
  createdByUsername?: string;
  createdByName?: string;
  members: KhataGroupMember[];
  pendingRequests?: any[];
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  logo?: string;
  businessName: string;
  businessGst?: string;
  businessAddress?: string;
  upiId?: string;
  currency?: string;
  currencySymbol?: string;
  language?: string;
  isBlocked?: boolean;
  blockedReason?: string;
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
  outstandingBalance: number;
  category: 'VIP' | 'Regular' | 'Wholesale' | 'Retail' | 'Merchant';
  status: 'active' | 'overdue' | 'blocked' | 'deleted';
  isDeleted?: boolean;
  deletedAt?: string;
  excludeTransactions?: boolean;
  rating: number;
  notes?: string;
  avatar?: string;
  avatarUrl?: string;
  bankAccounts?: CustomerBankAccount[];
  upiDetails?: CustomerUpiDetail[];
  p2pPeerUserId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType = 'credit' | 'debit' | 'income' | 'expense' | 'collection' | 'payment' | 'transfer' | 'adjustment';
export type PaymentMode = 'upi' | 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';

export interface TransactionSplitMember {
  customerId: string;
  customerName: string;
  share: number;
  shareAmount?: number;
}

export interface TransactionEditAudit {
  editedAt: string;
  editedBy: string;
  prevAmount?: number;
  newAmount: number;
  previousAmount?: number;
  prevNote?: string;
  newNote?: string;
  previousNote?: string;
  prevType?: TransactionType;
  newType?: TransactionType;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  peerUserId?: string;
  peerPhone?: string;
  category: string;
  paymentMode: PaymentMode;
  note?: string;
  tags?: string[];
  attachments?: string[];
  referenceNo?: string;
  gatewayTxnId?: string;
  receiptNo?: string;
  dueDate?: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled' | 'deleted';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  groupId?: string;
  groupName?: string;
  splitMembers?: TransactionSplitMember[];
  editHistory?: TransactionEditAudit[];
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
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
  notes?: string;
  terms?: string;
  stockDeducted?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  updatedAt?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  deadline: string;
  notes?: string;
  documentUrl?: string;
  deposits?: Array<{ id: string; amount: number; date: string; notes?: string; receiptUrl?: string; createdAt: string }>;
  createdAt: string;
  updatedAt?: string;
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
  updatedAt?: string;
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
  driveFileId?: string;
  uploadedAt: string;
  updatedAt?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  description: string;
  reminderDate?: string;
  reminderTime?: string;
  category?: string;
  color?: string;
  isPinned?: boolean;
  attachedImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: string;
  reminderDate?: string;
  reminderTime?: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
}

export interface DeviceSession {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  ip: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  isCurrent?: boolean;
  isRevoked?: boolean;
}

export type SyncQueueStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  user_id: string;
  idempotency_key: string;
  entity_type: string;
  entity_id: string;
  operation: SyncOperation;
  payload_json: string;
  base_version: string | null;
  status: SyncQueueStatus;
  retry_count: number;
  next_retry_at: number;
  last_error: string | null;
  created_at: string;
}
