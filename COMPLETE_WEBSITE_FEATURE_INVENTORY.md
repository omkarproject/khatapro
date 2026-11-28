# Complete Website Feature Inventory (`src/` Source Verified)

This inventory is verified directly from `src/app/`, `src/components/`, `src/context/AppContext.tsx`, and `src/lib/`.

## 1. Shell, Navigation & Design System
- **Theme Tokens (`src/app/globals.css`)**:
  - Light mode: `--background: #F8FAFC`, `--foreground: #000000`, `--card: rgba(255,255,255,0.85)`, `--card-border: rgba(226,232,240,0.8)`, `--primary: #4F46E5`, high-contrast `#000000` body typography.
  - Dark mode (`.dark`): `--background: #0B0F19`, `--foreground: #F8FAFC`, `--card: rgba(17,24,39,0.75)`, `--card-border: rgba(55,65,81,0.5)`, `--primary: #6366F1`.
  - Card radius: `24px` (`.glass-card` / `rounded-2xl`), Gradient primary: `#4F46E5 -> #06B6D4`.
- **Top Navbar (`src/components/Navbar.tsx`)**:
  - Hamburger drawer toggle, Brand Logo + Name + Badge, Global Search (`GlobalSearchModal`), Dark/Light Mode toggle, Quick UPI Collect (`QrCode`), Currency/Language switcher, Notifications bell (low stock, reminders, group notifications, P2P live edit/delete alerts, support tickets), OfflineSyncNotch, User Profile / Devices / Logout menu.
- **Sidebar (`src/components/Sidebar.tsx`) — 13 Exact Menu Items**:
  1. `Dashboard` (`/`)
  2. `Digital KhataBook` (`/khata`, badge `Core`)
  3. `Customers CRM` (`/customers`)
  4. `Collect Payment` (`/upi-collection`)
  5. `Billing & Invoices` (`/invoices`)
  6. `Notes & Tasks` (`/notes-tasks`, badge `New`)
  7. `Expense Tracker` (`/expenses`)
  8. `Savings Goals` (`/savings`)
  9. `Inventory & Stock` (`/inventory`)
  10. `Payment Reminders` (`/reminders`)
  11. `Document Vault` (`/documents`)
  12. `Financial Analytics` (`/analytics`)
  13. `Settings` (`/settings`)
  - Bottom footer: `100% Secure` + `v1.0` + `settings.websiteBadgeText`
- **Mobile Bottom Navigation (`src/components/MobileNav.tsx`) — 5 Exact Items**:
  1. `Home` (`/`)
  2. `Khata` (`/khata`)
  3. Center floating gradient action button `Collect` (`QrCode` -> opens `QuickUPICollectModal`)
  4. `Expenses` (`/expenses`)
  5. `CRM` (`/customers`)

## 2. Dashboard (`src/app/page.tsx`)
- **4 KPI Cards (2x2 Grid)**:
  1. `KHATA`: `abs(khataCredit - khataDebit)`, color rose if `khataDebit > khataCredit` else emerald; sub-row `↑ {khataDebit} • ↓ {khataCredit}` + `BookOpen` link to `/khata`.
  2. `EXPENSES`: `currentMonthExpenses` in rose; sub-row `W: {currentWeekExpenses} • D: {todayExpenses}` + `Receipt` link to `/expenses`.
  3. `NET AMOUNT`: `(khataCredit - khataDebit) - currentMonthExpenses`; top-right `+` button (`QuickAddRecordModal`), sub-row `K: {khataBase} • E: {currentMonthExpenses} • I: {unpaidInvoices}` + `TrendingUp/Down` icon.
  4. `ONLINE COLLECTIONS`: `totalOnlineCollections` (via `isOnlineCollectionTxn`), top-right `QrCode` (`QuickUPICollectModal`), sub-row `Collection Hub` + `Hub` link to `/upi-collection`.
- **Admin Live Support & Help Desk Bar** (Admin-only): `Online 24/7` + clickable stats pill (`Alerts`, `Open`, `Progress`, `Solved`).
- **Row 2**:
  - `Top Credit Receivables` (`Follow Up` badge, `All Customers →`, top 4 debtors with avatar/initial, `Share2` -> `CustomerShareModal`)
  - `Expense Mix` (`Details →`, category bars + %, `Total Monthly Burn`)
- **Row 3**:
  - `Low Stock Thresholds` (`Manage Stock →`, amber low-stock alerts + `Stock In`)
  - `Savings & Reserve Progress` (`View Goals →`, top 2 goals with progress bar)

## 3. Core Business Modules
- **Digital KhataBook (`/khata`)**: Customer list + search + filters (`All`, `You'll Get`, `You'll Give`, `Settled`), Add/Edit Customer, Udhar/Jama keypad/entry, Edit/Delete with `editHistory` audit trail, Attachments, P2P Merchant Link, Shared Khata Groups + Join/Approve/Split Bills, PDF statement, WhatsApp share, Voice/Note.
- **Customers CRM (`/customers`)**: Grid/List view, Add/Edit/Delete Customer, Credit Limit, GSTIN, Exclude Transactions toggle, Rating stars, Multiple Bank Accounts + UPI IDs, Customer Drive Folders & Files (upload/rename/delete/preview), Digital Business Card.
- **Collect Payment Hub (`/upi-collection`)**: 4 Shop Standee QR themes (`indigo`, `bharat`, `emerald`, `minimal`), Custom QR upload, Dynamic amount QR, Download/Share QR card, Payment Collection History, Gateway status (`Cashfree`, `Razorpay`, `UPI`).
- **Billing & Invoices (`/invoices`)**: GST/Non-GST, Sales/Purchase/Quotation, Invoice Templates, CGST/SGST/IGST + custom charges (Delivery, Packaging, Service Fee), Discounts, Line-item product picker, Status (`paid`, `unpaid`, `partially_paid`, `overdue`, `draft`), PDF/Image export, Payment link + server verify.
- **Notes & Tasks (`/notes-tasks`)**: Notes (pinned, color, reminder, image attachment) + Tasks (priority, due date, completed toggle).
- **Expense Tracker (`/expenses`)**: Monthly budget cap, categories, recurring flag, tags, receipt upload, W/D/M breakdown.
- **Savings Goals (`/savings`)**: Target, deadline, deposits history with receipts, progress %.
- **Inventory & Stock (`/inventory`)**: SKU, barcode, purchase/selling price, currentStock, minStock low-stock alerts, unit, supplier, location.
- **Payment Reminders (`/reminders`)**: Upcoming/Overdue/Custom/Recurring, channels (`whatsapp`, `sms`, `email`), message template, payment token link.
- **Document Vault (`/documents`)**: Categories (`invoice`, `bill`, `receipt`, `contract`, `identity`, `tax`), Drive/Supabase upload & preview.
- **Financial Analytics (`/analytics`)**: Revenue vs Expense, Debtor analytics, Category mix, Payment mode breakdown, Date filters.
- **Settings & Admin Control Center (`/settings`)**: Business Profile, Payment Gateways (UPI/Cashfree/Razorpay), Google Drive & Telegram Backup + Backup/Restore (`/backup`), Security & 2FA + Active Devices, Language & Currency, Admin Tabs (Branding/Logo/Badge, Maintenance Mode, Broadcast Banner, User CRM, Support Tickets, SMTP Test, Database Reset).
