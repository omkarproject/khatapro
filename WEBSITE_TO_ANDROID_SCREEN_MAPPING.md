# Website-to-Android Screen Mapping

| # | Website Route | Website Title | Current Android Route | Current Status | Target Corrected Android Route |
|---|---|---|---|---|---|
| 1 | `/` | Dashboard | `/(tabs)/index.tsx` | **INCORRECT** (Wrong KPI cards, missing `QuickAddRecordModal`, `QuickUPICollectModal`, `CustomerShareModal`, `Expense Mix`, `Low Stock`, `Savings`, Admin Helpdesk) | `/(tabs)/index.tsx` (Exact 4 KPI cards + widgets + modals) |
| 2 | `/khata` | Digital KhataBook | `/(tabs)/khata.tsx`, `/khata/[customerId].tsx`, `/khata/groups.tsx` | **INCORRECT** (Missing website header/filter chips, `You'll Get`/`You'll Give` summary bar, `excludeTransactions` handling) | `/(tabs)/khata.tsx` + `/khata/[customerId].tsx` + `/khata/groups.tsx` |
| 3 | `/customers` | Customers CRM | `/customers/[id].tsx` only | **INCORRECT / MISSING** (No top-level `/customers` CRM list screen matching website) | `/(tabs)/customers.tsx` (in bottom nav!) + `/customers/[id].tsx` |
| 4 | `/upi-collection` | Collect Payment | `/collect/index.tsx` | **INCORRECT** (Missing 4 Standee themes `indigo/bharat/emerald/minimal`, Shop Standee card preview, Collection History) | `/collect/index.tsx` (Full Standee + QR + Cashfree/Razorpay + History) |
| 5 | `/invoices` | Billing & Invoices | `/(tabs)/invoices.tsx`, `/invoices/create.tsx` | **INCORRECT** (Missing Sales/Purchase/Quotation type, CGST/SGST/IGST + custom charges, `partially_paid`/`overdue` filters, edit invoice) | `/invoices/index.tsx` + `/invoices/create.tsx` |
| 6 | `/notes-tasks` | Notes & Tasks | `/notes-tasks/index.tsx` | **INCORRECT** (Missing note colors, pin toggle, priority selector, due dates) | `/notes-tasks/index.tsx` |
| 7 | `/expenses` | Expense Tracker | `/(tabs)/expenses.tsx` | **INCORRECT** (Missing Today/Week/Month summary cards, recurring/tags, edit expense) | `/(tabs)/expenses.tsx` |
| 8 | `/savings` | Savings Goals | `/savings/index.tsx` | **MATCHED (Partial)** — Needs deposit history & deadline display | `/savings/index.tsx` |
| 9 | `/inventory` | Inventory & Stock | `/inventory/index.tsx` | **INCORRECT** (Missing edit product, purchase price, low-stock filter, stock-in/out buttons) | `/inventory/index.tsx` |
| 10 | `/reminders` | Payment Reminders | `/reminders/index.tsx` | **MATCHED (Partial)** — Needs reminder type & channel badges | `/reminders/index.tsx` |
| 11 | `/documents` | Document Vault | `/documents/index.tsx` | **INCORRECT** (Missing all 6 website categories filter & preview) | `/documents/index.tsx` |
| 12 | `/analytics` | Financial Analytics | `/analytics/index.tsx` | **INCORRECT** (Missing date range filter & website report sections) | `/analytics/index.tsx` |
| 13 | `/settings` | Settings | `/settings/index.tsx`, `/backup/index.tsx`, `/admin/index.tsx` | **INCORRECT** (Missing Dark Mode toggle, Language/Currency, 2FA status, tabbed Settings matching website) | `/settings/index.tsx` + `/backup/index.tsx` + `/admin/index.tsx` |
| 14 | Bottom Nav | `MobileNav.tsx` | `/(tabs)/_layout.tsx` | **INCORRECT** (Had `Home, Khata, Bills, Expense, More` instead of `Home, Khata, [Collect QR], Expenses, CRM`) | `/(tabs)/_layout.tsx` (`Home, Khata, Collect, Expenses, CRM`) |
| 15 | Sidebar Drawer | `Sidebar.tsx` | Missing (replaced by `More` tab) | **MISSING** | `SidebarDrawer.tsx` + Top `NavbarHeader.tsx` (13 exact website items!) |
