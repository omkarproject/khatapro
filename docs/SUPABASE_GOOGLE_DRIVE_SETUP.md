# SmartKhata Pro — Supabase & Google Drive Setup Guide

This document outlines the exact credentials, environment variables, Supabase SQL schema execution, and Google Cloud Console OAuth setup required for SmartKhata Pro.

---

## 1. Environment Variables Configuration

Add the following environment variables to your `.env.local` (local development) and in **Vercel Project Settings → Environment Variables**:

```env
# ==============================================================
# 1. SUPABASE POSTGRESQL & AUTH (PRIMARY CLOUD DATABASE)
# ==============================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==============================================================
# 2. GOOGLE OAUTH 2.0 & GOOGLE DRIVE API v3
# ==============================================================
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_REDIRECT_URI=https://khatapro-sandy.vercel.app/api/backup/google-drive/callback

# For local development:
# GOOGLE_REDIRECT_URI=http://localhost:3000/api/backup/google-drive/callback

# ==============================================================
# 3. AES-256-GCM TOKEN ENCRYPTION AT REST
# ==============================================================
DRIVE_TOKEN_ENCRYPTION_KEY=generate_a_random_32_character_secret_passphrase_here

# ==============================================================
# 4. VERCEL CRON DAILY AUTOMATION
# ==============================================================
CRON_SECRET=generate_a_strong_random_secret_here
```

> [!CAUTION]
> **Security Rule**: Never prefix `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `DRIVE_TOKEN_ENCRYPTION_KEY`, or `CRON_SECRET` with `NEXT_PUBLIC_`. These are server-only secrets.

---

## 2. Supabase Setup & Row Level Security (RLS)

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project (e.g. `smartkhata-pro`).
3. Navigate to **SQL Editor** in the left sidebar.
4. Copy the entire contents of [`supabase/schema.sql`](file:///c:/Users/Admin/Documents/khatapro/supabase/schema.sql) and paste it into the SQL Editor.
5. Click **Run**.
6. All 18 tables with Row Level Security (RLS), user isolation policies, performance indexes, and profile auto-creation triggers will be provisioned.

---

## 3. Google Cloud Console & Drive API Setup

### Step 3.1: Create Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** → **New Project**.
3. Name it `SmartKhata Pro` and click **Create**.

### Step 3.2: Enable Google Drive API
1. In the navigation menu, go to **APIs & Services** → **Library**.
2. Search for **Google Drive API**.
3. Click on **Google Drive API** and click **Enable**.

### Step 3.3: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**.
2. Select **External** and click **Create**.
3. Fill in:
   - **App name**: `SmartKhata Pro`
   - **User support email**: your email
   - **Developer contact information**: your email
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes** and select:
   - `.../auth/drive.file` (Per-file access created or opened by the app)
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
6. Click **Save and Continue**.
7. Under **Test Users**, add your personal Google email address (the one you will use to connect).
8. Click **Save and Continue**.

### Step 3.4: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**.
2. Click **Create Credentials** → **OAuth client ID**.
3. Select **Application type**: **Web application**.
4. Name: `SmartKhata Pro Web Client`.
5. Under **Authorized redirect URIs**, click **Add URI** and enter:
   - For Production: `https://khatapro-sandy.vercel.app/api/backup/google-drive/callback`
   - For Local Testing: `http://localhost:3000/api/backup/google-drive/callback`
6. Click **Create**.
7. Copy the **Client ID** and **Client Secret** into your environment variables.

---

## 4. Daily Automated Backup (Vercel Cron)

SmartKhata Pro includes automatic daily cron configuration in [`vercel.json`](file:///c:/Users/Admin/Documents/khatapro/vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/backup/google-drive/cron",
      "schedule": "0 2 * * *"
    }
  ]
}
```
* **Schedule**: Every night at 02:00 AM UTC.
* **Security**: Automatically secured with `CRON_SECRET`.
* **Execution**: Vercel invokes `/api/backup/google-drive/cron` with header `Authorization: Bearer <CRON_SECRET>`. The server securely queries all connected users, captures their active ledger snapshot, generates a versioned ZIP, and uploads it to their personal `HisabKitab/Backups/` folder.

---

## 5. Account Deletion & Recovery Walkthrough

When a user deletes their SmartKhata application account or starts on a new phone:
1. They create a **new SmartKhata account** or log in.
2. They navigate to **Settings → Cloud Backup**.
3. Under **Google Drive Backup & Restore**, they click **Connect Google Drive** and authenticate the **same Google account**.
4. They click **Restore Backup**.
5. The system searches the user's Google Drive for existing SmartKhata backup archives, displays their business name, date, file size, and record counts.
6. The user selects the backup, reviews the preview, and clicks **Confirm & Restore Workspace**.
7. The server remaps ownership to the new user ID while preserving all customer-transaction relationships, restores all ledger entries and documents, and reloads the active workspace!
