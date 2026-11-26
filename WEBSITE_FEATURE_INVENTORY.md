# WEBSITE FEATURE INVENTORY — KhataPro / SmartKhata

Verified directly from `src/app/`, `src/components/`, `src/lib/`, `src/services/`, and `src/types/index.ts`.

---

## 1. Core Pages & Routes (`src/app/`)

| Route | Module | Key Capabilities Verified in Source |
| :--- | :--- | :--- |
| `/` | **Dashboard** | 4 KPI cards (`KHATA` net/credit/debit, `EXPENSES` total/week/today, `NET AMOUNT` `K - E` + Unpaid `I`, `ONLINE COLLECTIONS`), Live Support ticket status bar, Top Pending Accounts with WhatsApp share, Expense Category Breakdown chart, Low Stock Alerts, Savings Goals progress, Quick Add modal. |
| `/khata` | **Digital KhataBook** | Customer list (All / Due / Advance / Group filters, search), P2P Verified Merchant badges, Udhar (Credit) & Jama (Debit) custom keypad entry, bill date, attachments (image/PDF -> Drive/Storage), voice notes mic, payment reminder auto-attach, single-txn PDF Bill (`Create Bill`), full ledger PDF/Excel/WhatsApp statement, transaction edit audit history (`editHistory`), soft-delete & restore (`deleted`), Exclude Transactions toggle, Shared Khata Groups (`@username`, join requests, bill splitting across members, group notifications, block/remove/leave). |
| `/customers` | **Customers CRM** | Add/edit/delete/restore customers, category (`VIP`, `Regular`, `Wholesale`, `Retail`, `Merchant`), credit limit, rating (1–5), GST/address/city/state, multiple Bank Accounts & UPI Details, per-customer Drive Vault (custom folders + files), Digital Business Card generator (`BusinessCardModal`), P2P merchant lookup & linking. |
| `/upi-collection` | **Collect Payment** | Multi-gateway collection (`Direct UPI`, `Cashfree PG`, `Razorpay`, `UPI Gateway`), custom QR upload, dynamic QR & shareable payment link (`/pay/[cid]/[pid]`), QR Card generator (`qrCardGenerator.ts`), online collection history. |
| `/invoices` | **Billing & Invoicing** | Sales, Purchase & Quotation types; item catalog picker; quantity, unit price, discount %, GST % (`CGST`/`SGST`/`IGST`), custom applied charges; multiple luxury HTML/PDF/image templates (`InvoiceTemplatesModal`); auto stock deduction & restore on delete; status history (`paid`, `unpaid`, `partially_paid`, `overdue`, `draft`) with receipt upload; WhatsApp/print/download. |
| `/expenses` | **Expense Tracker** | Log/edit/delete expenses, custom categories manager, recurring (`weekly`/`monthly`/`yearly`), multi-receipt upload, Monthly Budget Cap (`monthlyBudgetCap`) with utilization bar & mobile top strip, month/category/mode filters, CSV/Excel/PDF export, Recharts category donut. |
| `/savings` | **Savings Goals** | Create/edit/delete goals, categories, target & deadline, deposit logs (`deposits[]`) with receipt attachments, attached goal documents. |
| `/inventory` | **Inventory & Stock** | Product CRUD, SKU, barcode, category, purchase/selling/MRP prices, current & min stock alerts, unit types (`pcs`, `kg`, `boxes`, `liters`, `meters`), product image, stock valuation. |
| `/reminders` | **Payment Reminders** | Upcoming / overdue / custom / recurring reminders, channels (`whatsapp`, `sms`, `email`), auto-clear on payment settlement. |
| `/documents` | **Document Vault** | Categorized documents (`invoice`, `bill`, `receipt`, `contract`, `identity`, `tax`), lock/unlock toggle, Drive/Storage upload, preview & download. |
| `/analytics` | **Financial Analytics** | Recharts cashflow, profit/loss, revenue vs expense trends, top debtors/creditors, respects `excludeTransactions`. |
| `/notes-tasks` | **Notes & Tasks** | Notes (title, description, color, category, pin, reminder date/time, image attach, lock) + Tasks (priority, due/reminder date/time, completion toggle). |
| `/backup` | **Cloud Backup** | Google Drive backup & restore UI (`GoogleDriveBackupPanel`) + local JSON/ZIP export & import (`backupArchive.ts`). |
| `/settings` | **Settings & Admin** | **Business Profile:** details, logo, currency & multi-language (`i18n.ts`), invoice template, Telegram backup config, Password Manager (`PasswordItem`), Authenticator 2FA TOTP vault (`AuthenticatorItem`), Security (change password, enable Email/TOTP 2FA, Active Devices & Logout All). **Admin Tabs:** Website Branding + Merchant Broadcasts, Supabase DB/SQL setup, Email SMTP + triggers, Google Drive API config, User CRM (create/block/role/delete), Maintenance Mode + Beta toggle, Database Factory Reset & Purge. |
| `/login` | **Authentication** | Email/Phone/Username login, 10-min lockout after 3 wrong attempts, Signup with 6-digit email OTP, Forgot Password with OTP, optional 2FA step (Authenticator TOTP or Email OTP). |
| `/pay`, `/pay/[id]`, `/pay/[id]/[pid]` | **Public Checkout** | Customer-facing payment portal with 7-day expiry check, live due fetch, 2% PG fee logic (Cashfree/Razorpay), instant receipt & auto-settlement. |
| `/contact-us`, `/privacy-policy`, `/refund-and-cancellation`, `/terms-and-conditions` | **Public Info** | Dynamic policy/contact pages using branding settings. |

---

## 2. Global Overlays, Guardians & Secondary Features (`src/components/`)

- **`AuthGuard` & `MaintenanceOverlay` & `MaintenanceNoticeModal`:** Enforces login and platform maintenance lockouts (with admin bypass).
- **`BroadcastBanner`:** Displays active admin banners, popups, and notification broadcasts.
- **`GlobalSearchModal` (`Cmd+K`):** Searches across customers, transactions, invoices, and products.
- **`SupportChatWidget`:** Real-time merchant ↔ admin support ticketing with image attachments and unread badges.
- **`AutoBackupGuardian` & `CustomerDriveUploadGuardian`:** Background Google Drive backup scheduler and pending customer file uploader.
- **`DevicesModal`:** Lists active device sessions, current device badge, single-device revoke, and Logout All Devices.
- **`OfflineSyncNotch`:** Floating top status pill (`Offline Work` → `Online • Syncing 1%–100%` → `Synced 100%`).
