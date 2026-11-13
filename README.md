<div align="center">

# ⚡ KhataPro — Next-Gen Financial OS & Digital Ledger

<p align="center">
  <strong>The Ultimate Cloud-Native Business Ledger, Invoicing, Billing & Payment Platform for Modern Merchants</strong>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 15" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://developers.google.com/drive"><img src="https://img.shields.io/badge/Google_Drive_API-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" alt="Google Drive API" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/Zero_Fixed_Domain-Universal_Host_Ready-indigo?style=flat-square" alt="Universal Host Ready" />
  <img src="https://img.shields.io/badge/Performance-Zero_Lag_60FPS-emerald?style=flat-square" alt="Zero Lag 60FPS" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License MIT" />
</p>

---

</div>

## 🌟 Highlights & Overview

**KhataPro** is a comprehensive, production-grade fintech web application built with **Next.js 15 App Router**, **React 19**, and **Supabase PostgreSQL**. Designed for shopkeepers, freelancers, and growing enterprises, it seamlessly combines ledger bookkeeping, GST billing, multi-gateway payments, and automated cloud backup.

---

## 🚀 Key Features

| Category | Features & Capabilities |
| :--- | :--- |
| 📒 **Smart Digital Khata** | Real-time Udhar (Credit) & Jama (Payment) ledger, customer balance tracking, credit limits, transaction histories, and instant PDF/WhatsApp account statements. |
| 🧾 **Invoicing & Billing** | GST and Non-GST compliant invoices, customizable templates, line-item taxes, item catalogs, QR payment codes, and one-click PDF receipt downloads. |
| 💳 **Omnichannel Payments** | Integrated **Direct UPI QR Generator**, **Cashfree Payment Gateway**, dynamic payment link generator (`/pay/[id]`), and webhook verification. |
| ☁️ **Dual-Mode Cloud Vault** | **1. Google Drive Vault (ON):** Automated AES-256 encrypted backups saved directly to merchant's private Drive folders.<br>**2. Database-Only Mode (OFF):** Unrestricted signup with zero Drive prompt; all customer records isolated cleanly per `user_id` in Supabase PostgreSQL. |
| 🛡️ **Auto Backup Guardian** | Silent background backup engine with live MB progress tracker, elapsed time, and interactive **[Cancel Today]** / **[Later]** session controls. |
| 🌐 **Zero Fixed Domain** | **100% Host-Agnostic:** No hardcoded links! Google OAuth, Cashfree callbacks, QR links, and APIs automatically detect the runtime domain on any VPS, Vercel, or custom domain. |
| 👥 **Customer CRM & Groups** | Customer profiles, P2P ledger linking, shared bill splitting, activity timeline, and auto-generated digital business cards. |
| ⚡ **Zero-Lag Smooth Engine** | GPU hardware acceleration, CSS `content-visibility`, request coalescing, and optimized DOM rendering for smooth 60fps performance on low-end budget smartphones. |
| ⚙️ **Admin Control Center** | Live website branding (Name, Logo, Favicon, Tagline), Maintenance Mode with live countdown timer, Broadcast announcements, and Support ticketing. |

---

## 🌐 Universal Host Portability (Host Anywhere!)

KhataPro is engineered with a **Universal Dynamic Domain Engine** (`src/lib/domain.ts`):
- ✅ **No Hardcoded URLs:** Works out-of-the-box on `localhost`, Vercel (`*.vercel.app`), Ubuntu/Debian VPS, AWS EC2, DigitalOcean, or custom domains.
- ✅ **Dynamic Google OAuth:** Redirect URIs (`/api/backup/google-drive/callback`) match your current runtime domain automatically.
- ✅ **Dynamic Payment Links:** Cashfree return URLs and shareable payment links always resolve to the exact active domain.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Turbopack, Server Actions)
- **Frontend:** [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide Icons](https://lucide.dev/)
- **Database & Auth:** [Supabase PostgreSQL](https://supabase.com/) with Row-Level Isolation
- **Cloud Vault:** [Google Drive API v3](https://developers.google.com/drive) (OAuth 2.0 & Service Accounts)
- **Payments:** Cashfree PG SDK, NPCI UPI Protocol, Razorpay Integration
- **Utilities:** ExcelJS, JSZip, Date-fns, Recharts, QRCode

---

## ⚡ Quick Start Setup

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/omkarproject/khatapro.git
cd khatapro
npm install
```

### 2. Configure Environment Variables

Copy the example environment configuration:

```bash
cp .env.example .env.local
```

Open `.env.local` and add your credentials:

```env
# Supabase Cloud Database (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth & Drive API (Optional - Can also be configured in Admin UI)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Security & Cron
DRIVE_TOKEN_ENCRYPTION_KEY=your_32_char_hex_encryption_key
CRON_SECRET=skp_cron_daily_backup_secret_2026_secure
```

> **Note:** `NEXT_PUBLIC_APP_URL` and `GOOGLE_REDIRECT_URI` are **optional**! KhataPro auto-detects your active domain on every request.

### 3. Initialize Supabase Database

Run the provided SQL script located at [`supabase/schema.sql`](supabase/schema.sql) in your **Supabase SQL Editor** to automatically create all required tables, indexes, and storage rules.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deployment Guide

### Option A: Deploy on Vercel (Recommended)

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Add the environment variables from `.env.example`.
4. Click **Deploy**. Vercel will build and serve your app globally.

---

### Option B: Deploy on VPS (Ubuntu / Debian / Nginx / PM2)

KhataPro runs flawlessly on any Linux VPS (DigitalOcean, AWS, Linode, Hetzner, etc.):

```bash
# 1. Install Node.js 18+ and PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2

# 2. Clone repo and build
git clone https://github.com/omkarproject/khatapro.git /var/www/khatapro
cd /var/www/khatapro
npm install
npm run build

# 3. Start with PM2
pm2 start npm --name "khatapro" -- start
pm2 save
pm2 startup
```

#### Nginx Reverse Proxy Configuration:

```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL with Certbot:
```bash
sudo certbot --nginx -d yourdomain.com
```

---

## 🔒 Security & Data Privacy

- **Row-Level User Isolation:** Each merchant's financial data is strictly separated by unique `user_id`.
- **At-Rest Token Encryption:** All Google OAuth refresh tokens are encrypted using AES-256-GCM before storage.
- **Zero Raw Card Storage:** All payment card details and banking passwords are never stored on local servers.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>Built with ❤️ for modern businesses and merchants everywhere.</sub>
</div>
