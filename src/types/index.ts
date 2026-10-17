export type UserRole = 'admin' | 'user' | 'super_admin' | 'business_owner'; // Simplified to 2 primary roles in UI: Admin and Merchant (user)

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  logo?: string;
  businessName: string;
  businessGst?: string;
  businessAddress?: string;
  currency?: string;
  currencySymbol?: string;
  language?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  createdAt: string;
}

export type BroadcastType = 'banner' | 'popup' | 'notification';
export type BroadcastSeverity = 'info' | 'success' | 'warning' | 'error'; // green=success, yellow=warning, red=error, blue=info

export interface BroadcastMessage {
  id: string;
  title: string;
  content: string; // Plain text or HTML
  type: BroadcastType; // banner, popup, notification
  severity: BroadcastSeverity; // green=success, yellow=warning, red=error, blue=info
  targetType: 'all' | 'specific_user';
  targetUserId?: string; // If targeting specific merchant
  targetUserName?: string;
  isClosable: boolean;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'merchant';
  text: string;
  attachments?: string[]; // Image URLs or Drive file proxies
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNo: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  subject: string;
  status: 'open' | 'closed' | 'in_progress';
  priority: 'low' | 'medium' | 'high';
  category: 'Billing' | 'Technical' | 'Account' | 'General';
  unreadByAdmin: boolean;
  unreadByMerchant: boolean;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
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
  category: 'VIP' | 'Regular' | 'Wholesale' | 'Retail' | 'Merchant';
  status: 'active' | 'overdue' | 'blocked' | 'deleted';
  isDeleted?: boolean;
  deletedAt?: string;
  rating: number; // 1 - 5
  notes?: string;
  avatar?: string;
  avatarUrl?: string;
  driveAvatarId?: string;
  bankAccounts?: CustomerBankAccount[];
  upiDetails?: CustomerUpiDetail[];
  createdAt: string;
}

export type TransactionType = 'credit' | 'debit' | 'income' | 'expense' | 'collection' | 'payment' | 'transfer' | 'adjustment';
export type PaymentMode = 'upi' | 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';

export interface KhataGroupMember {
  customerId: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  role?: 'admin' | 'member';
  joinedAt?: string;
  merchantUserId?: string;
}

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
  prevSplitMembers?: TransactionSplitMember[];
  newSplitMembers?: TransactionSplitMember[];
  previousSplit?: any;
  newSplit?: any;
}

export interface KhataGroupJoinRequest {
  id: string;
  groupId: string;
  groupName: string;
  groupUsername: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface KhataGroup {
  id: string;
  name: string;
  username: string; // unique handle without leading @, stored lowercase e.g. "goa_trip"
  avatar?: string;
  avatarUrl?: string;
  memberCustomerIds?: string[]; // customer IDs in this group
  members: KhataGroupMember[]; // list of members in this group
  pendingRequests?: KhataGroupJoinRequest[]; // List of pending join requests awaiting creator approval
  creatorId: string; // userId of creator/admin
  creatorName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface KhataGroupNotification {
  id: string;
  groupId: string;
  groupName: string;
  groupUsername?: string;
  type: 'member_joined' | 'record_edited' | 'amount_divided' | 'join_request' | 'request_approved' | 'request_rejected';
  title: string;
  message: string;
  actorName?: string;
  actorUserId?: string;
  targetCustomerIds?: string[];
  memberIds?: string[];
  transactionId?: string;
  amount?: number;
  shareAmount?: number;
  details?: Record<string, any>;
  createdAt: string;
  isRead?: boolean;
  read?: boolean;
}

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
  driveReceiptId?: string;
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
  driveFileId?: string;
  uploadedAt: string;
}

export interface CustomerDriveFile {
  id: string;
  name: string;
  size: number;
  type: string;
  mimeType?: string;
  url?: string;
  driveFileId?: string;
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
  deletedPeerIds?: string[];
}

export type BackendProvider = 'supabase';

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

export interface GoogleDriveConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface SystemSettings {
  backendProvider: BackendProvider;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  googleDriveSettings?: GoogleDriveConfig;
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
  websiteName?: string;
  websiteLogo?: string;
  websiteFavicon?: string;
  websiteBadgeText?: string;
  websiteBadgeBg?: string;
  websiteTagline?: string;
  websiteSupportLocation?: string;
  websiteSupportPhone?: string;
  websiteSupportEmail?: string;
  termsAndConditions?: string;
  refundAndCancellation?: string;
  privacyPolicy?: string;
  broadcasts?: BroadcastMessage[];
  supportTickets?: SupportTicket[];
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


