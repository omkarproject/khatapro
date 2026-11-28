# UI/UX Comparison Report: Website (`src/`) vs Android (`mobile-app/`)

| Design Dimension | Original Website (`src/`) | Current Android (`mobile-app/`) | Status | Correction Action |
|---|---|---|---|---|
| **Color Palette (Light)** | `#F8FAFC` bg, `#FFFFFF` card, `#000000` high-contrast text, `#4F46E5` Indigo primary, `#06B6D4` Cyan accent | `#F8FAFC` bg, `#0F172A` text, Indigo `#4F46E5` | **INCORRECT** (No Dark Mode) | Create `theme/tokens.ts` with exact Light & Dark palettes + global theme toggle |
| **Color Palette (Dark)** | `#0B0F19` bg, `#111827` card, `#F8FAFC` text, `#6366F1` primary | Missing | **MISSING** | Add full Dark Mode support synced with `SecureStorage.getThemeMode()` |
| **Top Header** | Hamburger + Brand Logo/Name + Search + Theme + QR + Bell + Profile | None (bare SafeArea + OfflineSyncNotch) | **MISSING** | Build `NavbarHeader.tsx` matching website Navbar |
| **Sidebar Navigation** | 13 exact menu items with `Core` & `New` badges + `100% Secure v1.0` footer | Missing (`More` tab list instead) | **MISSING** | Build `SidebarDrawer.tsx` slide-out drawer with all 13 exact items |
| **Bottom Navigation** | `Home`, `Khata`, floating `[Collect QR]`, `Expenses`, `CRM` | `Home`, `Khata`, `Bills`, `Expense`, `More` | **INCORRECT** | Update `(tabs)/_layout.tsx` to exact 5-item `MobileNav.tsx` layout |
| **Dashboard Layout** | 4 KPI cards (`KHATA`, `EXPENSES`, `NET AMOUNT`, `ONLINE COLLECTIONS`) + Admin Helpdesk + `Top Credit Receivables` + `Expense Mix` + `Low Stock Thresholds` + `Savings & Reserve Progress` | 4 custom cards + `Top Pending Dues` + `Pending Sync` | **INCORRECT** | Rebuild `(tabs)/index.tsx` to match `src/app/page.tsx` 1:1 |
| **Quick Modals** | `QuickAddRecordModal`, `QuickUPICollectModal`, `CustomerShareModal`, `GlobalSearchModal` | Missing | **MISSING** | Build native modals for QuickAdd, QuickUPICollect, CustomerShare, GlobalSearch |
