# Website-to-Mobile Feature Parity Report

| Module | Website Feature | Native Android Implementation | Offline Support |
|---|---|---|---|
| **Auth & Security** | Login, Register, 6-digit OTP, 10-min Lockout, Active Devices, Logout All | `(auth)/login.tsx`, `(tabs)/more.tsx`, `authService.ts`, Biometric Lock | Cached session + Biometric unlock |
| **Smart Digital Khata** | Customers, Udhar/Jama, Edit History, Attachments, PDF, WhatsApp | `(tabs)/khata.tsx`, `khata/[customerId].tsx`, `mediaService.ts` | Full offline CRUD + `sync_queue` |
| **P2P & Shared Groups** | Bi-directional Merchant Link, P2P Mutate, Shared Groups, Split Bills | `khata/[customerId].tsx`, `khata/groups.tsx`, `khata/group/[groupId].tsx` | Cached ledger + online P2P sync |
| **GST Invoicing** | GST / Non-GST Bills, Line Items, Discounts, PDF Print/Share | `(tabs)/invoices.tsx`, `invoices/create.tsx` | Full offline bill creation + sync |
| **Payments** | Direct UPI QR, Cashfree Order/Verify, Razorpay Order/Verify | `collect/index.tsx` (QR + `upi://` intent + server verify) | Offline QR display; online gateway verify |
| **Customer CRM** | Profile, GSTIN, Credit Limit, UPI Details, KYC Vault, Business Card | `customers/[id].tsx` | Offline profile edit + staged uploads |
| **Expenses & Inventory** | Expense CRUD, Budget Cap, Receipt Camera, Product Stock & Low-Stock Alerts | `(tabs)/expenses.tsx`, `inventory/index.tsx` | Full offline CRUD + sync |
| **Savings & Reminders** | Savings Goals, Deposits, Payment Reminders, WhatsApp Nudge, Local Alerts | `savings/index.tsx`, `reminders/index.tsx` | Full offline CRUD + local notifications |
| **Vault, Notes & Analytics** | Document Vault, Notes & Tasks, Revenue/Expense/Debtor Analytics | `documents/index.tsx`, `notes-tasks/index.tsx`, `analytics/index.tsx` | Full offline read/write + sync |
| **Backup & Admin** | Google Drive Backup/Restore, JSON Export, Branding, Maintenance, Users, Reset | `backup/index.tsx`, `settings/index.tsx`, `admin/index.tsx` | Local JSON export offline; Drive/Admin online |
| **Offline Sync Engine** | Service Worker cache | SQLite WAL + FIFO `sync_queue` + Conflict Resolution UI (`sync-conflicts.tsx`) | 100% SQLite-backed offline-first |
