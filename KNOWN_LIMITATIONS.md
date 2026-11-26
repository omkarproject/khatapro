# Known Limitations & Platform Notes (Native Android)

1. **Payment Gateways (Cashfree & Razorpay)**:
   - Gateway order creation and settlement verification reuse the existing Next.js server endpoints (`/api/cashfree/*`, `/api/razorpay/*`, `/api/pay/confirm`) so zero gateway secrets are stored in the APK. Requires active internet connectivity.
2. **Google Drive OAuth Connection**:
   - Initial Google Drive OAuth linking is performed via the web Settings page (where Google OAuth client secrets reside on the server). Once connected, the Android app uploads files, triggers backups, and restores snapshots directly via `/api/backup/google-drive/*`.
3. **P2P Merchant Linking & Shared Khata Groups**:
   - Bi-directional P2P linking (`/api/users/p2p-link`) and Shared Khata Groups (`/api/groups`, `/api/groups/join`) require internet connectivity to query and coordinate cross-merchant records.
4. **Offline Media Uploads**:
   - Receipts and documents captured offline are staged safely in device storage (`expo-file-system`). Viewing/sharing local staged files works offline; cloud upload to Google Drive / Supabase Storage occurs when online.
5. **Release Keystore**:
   - `mobile-app/android/app/smartkhata-release.keystore` is a generated local release keystore for signing the standalone APK and AAB. Back up this keystore securely before publishing to Google Play Store.
