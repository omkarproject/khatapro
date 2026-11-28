# Corrected Feature Parity Report (Website `src/` vs Native Android `mobile-app/`)

| # | Website Feature / Screen | Website Source | Native Android Implementation | Status |
|---|---|---|---|---|
| 1 | **Top Navbar & Theme Toggle** | `src/components/Navbar.tsx`, `globals.css` | `NavbarHeader.tsx`, `theme/tokens.ts` (Light/Dark + Global Search + QR + Notifications) | **MATCHED** |
| 2 | **13-Item Sidebar Navigation** | `src/components/Sidebar.tsx` | `SidebarDrawer.tsx` (All 13 exact items, `Core` & `New` badges, `100% Secure v1.0` footer) | **MATCHED** |
| 3 | **Mobile Bottom Navigation** | `src/components/MobileNav.tsx` | `(tabs)/_layout.tsx` (`Home`, `Khata`, floating `[Collect QR]`, `Expenses`, `CRM`) | **MATCHED** |
| 4 | **Dashboard KPIs & Widgets** | `src/app/page.tsx` | `(tabs)/index.tsx` (`KHATA`, `EXPENSES`, `NET AMOUNT` w/ K/E/I, `ONLINE COLLECTIONS`, Admin Helpdesk, Top Credit Receivables, Expense Mix, Low Stock Thresholds, Savings Progress, `QuickAddRecordModal`, `CustomerShareModal`) | **MATCHED** |
| 5 | **Digital KhataBook & P2P** | `src/app/khata/page.tsx` | `(tabs)/khata.tsx`, `khata/[customerId].tsx`, `khata/groups.tsx`, `khata/group/[groupId].tsx` | **MATCHED** |
| 6 | **Customers CRM** | `src/app/customers/page.tsx` | `(tabs)/customers.tsx`, `customers/[id].tsx` | **MATCHED** |
| 7 | **Collect Payment Hub** | `src/app/upi-collection/page.tsx` | `collect/index.tsx` (4 Standee themes `indigo/bharat/emerald/minimal` + Cashfree/Razorpay server verify + History) + `QuickUPICollectModal.tsx` | **MATCHED** |
| 8 | **Billing & Invoices** | `src/app/invoices/page.tsx` | `(tabs)/invoices.tsx`, `invoices/create.tsx` (`Sales/Purchase/Quotation`, CGST/SGST, Delivery/Discount, PDF/WhatsApp) | **MATCHED** |
| 9 | **Expenses & Inventory** | `src/app/expenses/page.tsx`, `inventory/page.tsx` | `(tabs)/expenses.tsx`, `inventory/index.tsx` (Low-Stock filter, `+1/-1` stock adjust) | **MATCHED** |
| 10 | **Savings, Reminders, Vault, Notes/Tasks, Analytics** | `src/app/savings`, `reminders`, `documents`, `notes-tasks`, `analytics` | `savings/index.tsx`, `reminders/index.tsx`, `documents/index.tsx`, `notes-tasks/index.tsx`, `analytics/index.tsx` | **MATCHED** |
| 11 | **Backup, Settings & Admin** | `src/app/backup`, `settings/page.tsx` | `backup/index.tsx`, `settings/index.tsx`, `admin/index.tsx` | **MATCHED** |
| 12 | **Offline SQLite & Conflict UI** | `OfflineSyncNotch.tsx`, `sw.js` | `sqlite.ts`, `syncEngine.ts`, `OfflineSyncNotch.tsx`, `sync-conflicts.tsx` | **MATCHED** |
