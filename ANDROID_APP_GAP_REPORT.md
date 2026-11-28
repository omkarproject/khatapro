# Android App Gap Report (`mobile-app/` vs `src/`)

## Critical Architectural & UI/UX Gaps Found

1. **Missing Website Shell (`Navbar` + `Sidebar` Drawer + `MobileNav`)**:
   - Website uses a **Top Navbar** (Hamburger button, Brand Logo + Name + Badge, Global Search, Theme toggle, Quick Collect QR, Notifications Bell, Profile/Devices/Logout) + **Slide-out Sidebar Drawer** with **13 exact menu items** + **Mobile Bottom Nav** (`Home`, `Khata`, center floating `Collect` QR button, `Expenses`, `CRM`).
   - Current Android app used a generic 5-tab bar (`Home`, `Khata`, `Bills`, `Expense`, `More`) with no top navbar, no slide-out sidebar, and no center floating `Collect` button.

2. **Dashboard Mismatch (`src/app/page.tsx` vs `mobile-app/src/app/(tabs)/index.tsx`)**:
   - Current Android dashboard had 4 simplified cards (`Pending Collection`, `You Will Give`, `Total Received`, `Month Expense`) instead of the website's exact 4 KPI cards (`KHATA`, `EXPENSES`, `NET AMOUNT`, `ONLINE COLLECTIONS`).
   - Missing `QuickAddRecordModal` (`+` on Net Amount card), `QuickUPICollectModal` (`QrCode` on Online Collections card), `CustomerShareModal` (`Share2` on Top Credit Receivables), `Expense Mix` category bar chart, `Low Stock Thresholds` amber alert widget, `Savings & Reserve Progress` widget, and Admin `Live Support & Help Desk` status strip.
   - `khataDebit` calculation omitted the `txnsKhataDebit > 0 ? txnsKhataDebit : customersDue` fallback, and `totalOnlineCollections` didn't match `isOnlineCollectionTxn`.

3. **Missing Top-Level `Customers CRM` Screen**:
   - Website has `/customers` in both Sidebar and Mobile Bottom Nav (`CRM`). Android only had `/customers/[id].tsx` reachable from a ledger screen.

4. **Missing Light/Dark Theme Identity & High-Contrast Tokens**:
   - Website enforces high-contrast `#000000` text on `#F8FAFC` in light mode and `#F8FAFC` on `#0B0F19` in dark mode, with `.glass-card` (`rounded-2xl`, `border-slate-200/80`), Indigo `#4F46E5` primary, and Cyan `#06B6D4` gradient accents.
   - Current Android app hardcoded light-only `#0F172A` / `#F8FAFC` without Dark Mode support.

5. **Invoice, Inventory, Expense & Collect Hub Gaps**:
   - Collect Payment lacked the 4 website Shop Standee QR themes (`indigo`, `bharat`, `emerald`, `minimal`) and collection history.
   - Invoices lacked CGST/SGST/IGST breakdown + delivery/packaging charges + edit invoice.
   - Inventory lacked stock-in/out quick adjustment and low-stock filter.
