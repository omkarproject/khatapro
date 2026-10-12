-- ==========================================================
-- SMARTKHATA PRO — PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Complete Schema Migration with Row Level Security (RLS)
-- ==========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Business Owner',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'super_admin',
  avatar_url TEXT DEFAULT '',
  business_name TEXT NOT NULL DEFAULT 'SmartKhata Merchant',
  business_gst TEXT DEFAULT '',
  business_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  backend_provider TEXT NOT NULL DEFAULT 'supabase',
  business_name TEXT DEFAULT '',
  business_logo TEXT DEFAULT '',
  business_tagline TEXT DEFAULT 'Track Money, Manage Business, Grow Faster',
  business_phone TEXT DEFAULT '',
  business_email TEXT DEFAULT '',
  business_address TEXT DEFAULT '',
  payment_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  monthly_budget_cap NUMERIC DEFAULT 150000,
  dark_mode BOOLEAN DEFAULT FALSE,
  telegram_backup JSONB DEFAULT '{}'::jsonb,
  maintenance_mode JSONB DEFAULT '{}'::jsonb,
  beta_testing_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  business_name TEXT DEFAULT '',
  gst_number TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  credit_limit NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'Regular',
  status TEXT DEFAULT 'active',
  rating INTEGER DEFAULT 5,
  notes TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  bank_accounts JSONB DEFAULT '[]'::jsonb,
  upi_details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 4. Transactions Table (Ledger Entries)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'credit', 'debit', 'income', 'expense', 'collection', 'payment', 'transfer', 'adjustment'
  amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  payment_mode TEXT DEFAULT 'upi',
  note TEXT DEFAULT '',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
  reference_no TEXT DEFAULT '',
  status TEXT DEFAULT 'completed',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 5. Products Table (Inventory & Items)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  barcode TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  purchase_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  supplier TEXT DEFAULT '',
  location TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 6. Invoices Table (Billing, Quotations, Sales & Purchase)
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sales',
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  customer_gst TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  payment_date TEXT,
  receipt_url TEXT,
  receipt_name TEXT,
  receipt_type TEXT,
  status_history JSONB DEFAULT '[]'::jsonb,
  applied_charges JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  terms TEXT,
  upi_payment_qr TEXT,
  stock_deducted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 7. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'General',
  date TEXT NOT NULL,
  payment_mode TEXT DEFAULT 'cash',
  notes TEXT,
  receipt_url TEXT,
  receipt_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 8. Savings Goals Table
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'Emergency Fund',
  deadline TEXT NOT NULL,
  notes TEXT,
  icon TEXT,
  document_url TEXT,
  document_name TEXT,
  document_type TEXT,
  deposits JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 9. Payment Reminders Table
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  reminder_type TEXT DEFAULT 'upcoming',
  channels TEXT[] DEFAULT ARRAY['sms']::TEXT[],
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  message_template TEXT DEFAULT '',
  note TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 10. Documents Vault Table
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  file_size TEXT DEFAULT '',
  related_entity_id TEXT,
  related_entity_name TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 11. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  reminder_date TEXT,
  reminder_time TEXT,
  category TEXT DEFAULT 'General',
  color TEXT DEFAULT 'amber',
  is_pinned BOOLEAN DEFAULT FALSE,
  attached_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 12. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_completed BOOLEAN DEFAULT FALSE,
  due_date TEXT,
  reminder_date TEXT,
  reminder_time TEXT,
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (id, user_id)
);

-- 13. Password Manager Table
CREATE TABLE IF NOT EXISTS public.passwords (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  recovery_key TEXT,
  attached_image TEXT,
  website_url TEXT,
  notes TEXT,
  category TEXT DEFAULT 'Business',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 14. Customer Drive Folders Table
CREATE TABLE IF NOT EXISTS public.customer_drive_folders (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 15. Customer Drive Files Table
CREATE TABLE IF NOT EXISTS public.customer_drive_files (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  size BIGINT DEFAULT 0,
  type TEXT DEFAULT '',
  mime_type TEXT,
  url TEXT,
  data_url TEXT NOT NULL,
  folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- 16. Google Drive Tokens Table (Server-side AES-256 encrypted OAuth credentials)
CREATE TABLE IF NOT EXISTS public.google_drive_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_tokens TEXT NOT NULL,
  google_email TEXT,
  folder_id TEXT,           -- HisabKitab root folder ID
  backups_folder_id TEXT,   -- HisabKitab/Backups folder ID
  manifest_folder_id TEXT,  -- HisabKitab/Backup Manifest folder ID
  docs_folder_id TEXT,      -- HisabKitab/Customer Documents folder ID
  is_connected BOOLEAN DEFAULT TRUE,
  last_connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Google Drive Backups History Table
CREATE TABLE IF NOT EXISTS public.google_drive_backups (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  record_counts JSONB DEFAULT '{}'::jsonb,
  manifest_version TEXT DEFAULT '2.0.0',
  status TEXT NOT NULL DEFAULT 'success', -- 'success' | 'failed' | 'in_progress'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Global Config Table (Single record for maintenance mode and beta status)
CREATE TABLE IF NOT EXISTS public.global_config (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  maintenance_mode JSONB DEFAULT '{}'::jsonb,
  beta_testing_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user isolation on all user-owned tables
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_backups ENABLE ROW LEVEL SECURITY;

-- Global config can be read by anyone, written only by service role or authenticated admins
ALTER TABLE public.global_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "global_config_read" ON public.global_config FOR SELECT USING (true);

-- User-scoped policies
CREATE POLICY "profiles_user_isolation" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "system_settings_isolation" ON public.system_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "customers_isolation" ON public.customers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_isolation" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_isolation" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_isolation" ON public.invoices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_isolation" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals_isolation" ON public.savings_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payment_reminders_isolation" ON public.payment_reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_isolation" ON public.documents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_isolation" ON public.notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_isolation" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "passwords_isolation" ON public.passwords FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cust_folders_isolation" ON public.customer_drive_folders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cust_files_isolation" ON public.customer_drive_files FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "drive_tokens_isolation" ON public.google_drive_tokens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "drive_backups_isolation" ON public.google_drive_backups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_user_id ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.payment_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_passwords_user_id ON public.passwords(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_backups_user ON public.google_drive_backups(user_id, created_at DESC);

-- ==========================================================
-- TRIGGER: Auto-create Profile on New Supabase User Signup
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, business_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Business Owner'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'SmartKhata Merchant'),
    'super_admin'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.system_settings (user_id, business_name, business_email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'SmartKhata Merchant'),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
