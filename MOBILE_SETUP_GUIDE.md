# SmartKhata Native Android App — Setup & Build Guide

## 1. Architecture Overview
- **Framework**: React Native + Expo SDK 58 + Expo Router (TypeScript)
- **Local Offline Database**: Expo SQLite (`smartkhata_offline.db`, WAL mode) with persistent FIFO `sync_queue`, idempotency keys, exponential backoff, and conflict detection
- **Secure Storage**: Expo SecureStore + Android Biometric Lock (`expo-local-authentication`)
- **Backend Reuse**: Connects to existing Next.js `/api/*` backend (`https://smartkhata.netsell.in`) and Supabase PostgreSQL + Realtime (`https://efpszmfgiutgrjpaopnj.supabase.co`). Zero server secrets (`SUPABASE_SERVICE_ROLE_KEY`, payment secrets, Google OAuth secrets) are shipped in the APK/AAB.

## 2. Project Structure
- `mobile-app/src/app/` — Expo Router native screens (Tabs, Khata Ledger, P2P & Shared Groups, GST Invoicing, Collect Payment, Customer CRM, Inventory, Expenses, Savings, Reminders, Document Vault, Notes & Tasks, Analytics, Cloud Backup, Settings, Admin Control Center, Sync Conflicts)
- `mobile-app/src/db/sqlite.ts` — SQLite tables (`local_entities`, `sync_queue`, `sync_checkpoints`, `local_audit_log`)
- `mobile-app/src/services/` — `apiClient.ts`, `authService.ts`, `syncEngine.ts`, `mediaService.ts`, `secureStorage.ts`
- `mobile-app/src/context/MobileAppContext.tsx` — Offline-first state + Realtime sync orchestration

## 3. Running Locally (Development)
```powershell
cd mobile-app
npm install --legacy-peer-deps
npx tsc --noEmit
node --test __tests__/offlineLedger.test.mjs
npx expo start --android
```

## 4. Building Production APK & Play Store AAB
```powershell
cd mobile-app
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease bundleRelease --no-daemon
```

## 5. Build Output Paths
- **Signed Release APK**: `mobile-app/android/app/build/outputs/apk/release/app-release.apk`
- **Signed Play Store AAB**: `mobile-app/android/app/build/outputs/bundle/release/app-release.aab`
