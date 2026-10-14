'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Cloud,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Upload,
  Info,
  X,
  ExternalLink,
  Loader2,
  Trash2,
  Calendar,
  Clock,
  ShieldCheck,
  FileArchive,
  ArrowRight,
  Database,
  RefreshCw,
  LogOut,
} from 'lucide-react';

interface BackupItem {
  id: string;
  drive_file_id?: string;
  filename: string;
  size_bytes?: number;
  record_counts?: any;
  status: string;
  created_at: string;
}

interface DiscoveredBackup {
  id: string;
  filename: string;
  sizeBytes: number;
  createdTime: string;
  businessName: string;
  backupTimestamp: string;
  recordCounts: any;
  manifestVersion: string;
}

export default function GoogleDriveBackupPanel() {
  const { currentUser, addToast, refreshData } = useApp();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const [isConnected, setIsConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [history, setHistory] = useState<BackupItem[]>([]);
  const [storageQuota, setStorageQuota] = useState<{
    usage: number;
    limit: number;
    usageInDrive: number;
    percentUsed: number;
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Multi-tenant protection
  const [totalMerchants, setTotalMerchants] = useState<number>(1);
  const [lastSystemBackupAt, setLastSystemBackupAt] = useState<string | null>(null);
  const [isBackingUpAll, setIsBackingUpAll] = useState(false);

  // Operations
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredBackups, setDiscoveredBackups] = useState<DiscoveredBackup[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<DiscoveredBackup | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');

  // Info Guide Modal
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Disconnect Confirmation Modal
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Format bytes to human readable string
  const formatStorageBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Fetch status on mount
  const checkStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const res = await fetch(`/api/backup/google-drive/status?userId=${currentUser?.id || ''}`);
      const json = await res.json();
      if (json.success) {
        setIsConnected(Boolean(json.isConnected));
        setIsConfigured(json.isConfigured !== false);
        setGoogleEmail(json.googleEmail);
        setLastBackupAt(json.lastBackupAt);
        setStorageQuota(json.storageQuota || null);
        setHistory(json.history ? json.history.slice(0, 1) : []);
        if (json.totalMerchantsProtected) setTotalMerchants(json.totalMerchantsProtected);
        if (json.lastSystemBackupAt) setLastSystemBackupAt(json.lastSystemBackupAt);
      }
    } catch (err) {
      console.warn('Failed to load Google Drive status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();

    // Check URL searchParams for status messages
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('gdrive_status') === 'connected') {
        addToast('Google Drive Connected! 🎉', 'Your private SmartKhata Pro folder is ready for backups & file attachments.', 'success');
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname + '?tab=backup');
        checkStatus();
      } else if (urlParams.get('gdrive_error')) {
        addToast('Connection Failed', `Google authorization error: ${urlParams.get('gdrive_error')}`, 'error');
        window.history.replaceState({}, '', window.location.pathname + '?tab=backup');
      }
    }
  }, [currentUser?.id]);

  // Connect Google Drive
  const handleConnect = () => {
    const userId = currentUser?.id || 'guest_user';
    window.location.href = `/api/backup/google-drive/auth?userId=${encodeURIComponent(userId)}`;
  };

  // Disconnect Google Drive
  const handleDisconnectConfirm = async () => {
    try {
      setIsDisconnecting(true);
      const res = await fetch('/api/backup/google-drive/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id }),
      });
      const json = await res.json();
      if (json.success) {
        setIsConnected(false);
        setGoogleEmail(null);
        setIsDisconnectModalOpen(false);
        addToast('Google Drive Disconnected', 'Account unlinked. Your existing backups in Google Drive remain safe.', 'info');
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      addToast('Disconnect Failed', err.message || 'Could not disconnect account', 'error');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Backup Now
  const handleBackupNow = async () => {
    try {
      setIsBackingUp(true);
      setBackupError(null);
      const res = await fetch('/api/backup/google-drive/backup-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Backup failed');
      }

      setLastBackupAt(json.timestamp);
      addToast(
        'Backup Snapshot Saved! ☁️',
        `${json.filename} (${(json.sizeBytes / 1024).toFixed(1)} KB) updated in SmartKhata Pro/Backups.`,
        'success'
      );
      checkStatus();
    } catch (err: any) {
      setBackupError(err.message || 'Upload to Google Drive failed.');
      addToast('Backup Failed', err.message || 'Could not upload backup archive.', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Backup All Merchants Now (Admin multi-tenant run)
  const handleBackupAllUsersNow = async () => {
    try {
      setIsBackingUpAll(true);
      setBackupError(null);
      const res = await fetch('/api/backup/google-drive/cron?force=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'All-users backup failed');
      }

      setLastBackupAt(json.timestamp);
      setLastSystemBackupAt(json.timestamp);
      addToast(
        'All Merchants Backed Up! ☁️',
        `Successfully backed up all ${json.merchantsCount || totalMerchants} users into their Google Drive folders.`,
        'success'
      );
      checkStatus();
    } catch (err: any) {
      setBackupError(err.message || 'All-merchants backup failed');
      addToast('Backup Failed', err.message || 'Could not complete multi-tenant backup.', 'error');
    } finally {
      setIsBackingUpAll(false);
    }
  };

  // Open Restore Discovery Modal
  const handleOpenRestoreModal = async () => {
    setIsRestoreModalOpen(true);
    setSelectedBackup(null);
    setRestoreConfirmText('');
    try {
      setIsDiscovering(true);
      const res = await fetch(`/api/backup/google-drive/discover?userId=${currentUser?.id || ''}`);
      const json = await res.json();
      if (json.success) {
        setDiscoveredBackups(json.backups || []);
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      addToast('Search Failed', err.message || 'Could not search Google Drive for backups', 'error');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!selectedBackup) return;
    try {
      setIsRestoring(true);
      const res = await fetch('/api/backup/google-drive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: selectedBackup.id,
          userId: currentUser?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Restore failed');
      }

      setIsRestoreModalOpen(false);
      addToast(
        '🎉 Restoration Complete!',
        `Restored data from "${selectedBackup.businessName}". All modules and records are now active.`,
        'success'
      );

      // Refresh in-memory and local context
      refreshData();
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      addToast('Restore Failed', err.message || 'Failed to restore backup from Drive.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0C1222] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-indigo-500/25 shadow-xl relative overflow-hidden mb-8">
      {/* Cyber Corner Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md">
            <svg className="w-6 h-6" viewBox="0 0 87.3 78" fill="none">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA" />
              <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 49.9 0 51.45 0 53h27.5l16.15-28z" fill="#00AC47" />
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.9 10.2 7.85 13.6z" fill="#EA4335" />
              <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2L43.65 25z" fill="#00832D" />
              <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2L59.8 53z" fill="#2684FC" />
              <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Google Drive Backup &amp; Restore
              </h3>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="p-1 rounded-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="View Setup & Recovery Guide"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatic daily backups &amp; 1-click restore from your private Google Drive (<code className="text-emerald-600 dark:text-emerald-400 font-mono">SmartKhata Pro/</code>)
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isLoadingStatus ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...
            </span>
          ) : isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Not Connected
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-6 space-y-6">
        {/* Multi-Tenant Automated Daily Backup Status */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-teal-500/10 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Automated Daily Cloud Backups
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Active (All Users)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily auto-backup runs automatically for all <strong>{totalMerchants} merchants</strong>. Isolated folders per merchant + master system archive.
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleBackupAllUsersNow}
              disabled={isBackingUpAll}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isBackingUpAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Backing Up All Users...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Backup All Merchants Now ({totalMerchants})</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Connected Details Bar */}
        {isConnected ? (
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">Account:</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{googleEmail || 'Connected'}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Last Backup: <strong>{lastBackupAt ? new Date(lastBackupAt).toLocaleString('en-IN') : 'None yet'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-500" />
                  Next Auto-Backup: <strong>Daily at 02:00 AM UTC</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleBackupNow}
                disabled={isBackingUp}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Backing Up...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Backup Now</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenRestoreModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Backup</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(true)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                title="Disconnect Google Drive"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Connect your Google Account
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                Authorize SmartKhata Pro to save encrypted daily backups in your private Google Drive (<code className="text-emerald-600 font-mono">SmartKhata Pro/</code>). You can restore all your data anytime, even if you delete your SmartKhata account.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConnect}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 10.03 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Connect Google Drive</span>
            </button>
          </div>
        )}

        {backupError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{backupError}</span>
          </div>
        )}

        {/* Google Drive Storage Quota Progress Bar */}
        {isConnected && storageQuota && (
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <HardDrive className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Google Drive Storage Quota</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-bold">
                  {storageQuota.percentUsed}% Used
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatStorageBytes(storageQuota.usage)}</span> of{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatStorageBytes(storageQuota.limit)}</span> Total
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800/80 h-3 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storageQuota.percentUsed > 90
                    ? 'bg-rose-500'
                    : storageQuota.percentUsed > 75
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${Math.max(2, Math.min(100, storageQuota.percentUsed))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>Free Drive Space: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{formatStorageBytes(Math.max(0, storageQuota.limit - storageQuota.usage))}</strong></span>
              <span>Total Drive Storage: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatStorageBytes(storageQuota.limit)}</strong></span>
            </div>
          </div>
        )}

        {/* Latest Backup Snapshot */}
        {isConnected && history.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Latest Cloud Backup Snapshot
                </h5>
                <p className="text-[11px] text-slate-400">
                  Auto-updated snapshot in <code className="text-emerald-600 font-mono">SmartKhata Pro/Backups/</code>
                </p>
              </div>
              <button
                type="button"
                onClick={checkStatus}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-mono">
                  <tr>
                    <th className="p-3 font-semibold">Date &amp; Time</th>
                    <th className="p-3 font-semibold">Archive File</th>
                    <th className="p-3 font-semibold">Size</th>
                    <th className="p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {history.slice(0, 1).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {new Date(item.created_at).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-slate-900 dark:text-white font-bold flex items-center gap-1.5">
                        <FileArchive className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate max-w-xs">{item.filename}</span>
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">
                        {item.size_bytes ? `${(item.size_bytes / 1024).toFixed(1)} KB` : '—'}
                      </td>
                      <td className="p-3">
                        {item.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Active Snapshot
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-500 font-bold">
                            <AlertTriangle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* RESTORE MODAL */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0A0F1D] border border-slate-200 dark:border-indigo-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Restore from Google Drive
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Discovered backup files in your private <code className="text-emerald-600 font-mono">SmartKhata Pro/Backups/</code> folder
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isDiscovering ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-xs font-mono">Searching Google Drive for SmartKhata backups...</p>
                </div>
              ) : discoveredBackups.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <HardDrive className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No backup archives discovered</p>
                  <p className="text-xs max-w-sm mx-auto text-slate-400">
                    Make sure you connected the Google account that contains your previous SmartKhata backups.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select a backup to preview and restore:
                  </p>
                  <div className="space-y-2">
                    {discoveredBackups.map((b) => {
                      const isSelected = selectedBackup?.id === b.id;
                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBackup(b)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                              : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {b.businessName || 'SmartKhata Backup'}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-bold">
                                  v{b.manifestVersion}
                                </span>
                              </div>
                              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                                {b.filename} • {(b.sizeBytes / 1024).toFixed(1)} KB
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Snapshot Date: {new Date(b.backupTimestamp || b.createdTime).toLocaleString('en-IN')}
                              </p>
                            </div>

                            <input
                              type="radio"
                              name="selected_backup"
                              checked={isSelected}
                              onChange={() => setSelectedBackup(b)}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1"
                            />
                          </div>

                          {/* Record counts preview if available */}
                          {isSelected && b.recordCounts && (
                            <div className="mt-3 pt-3 border-t border-indigo-200/50 dark:border-indigo-800/50 grid grid-cols-3 sm:grid-cols-4 gap-2 text-[11px]">
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <span className="block text-slate-400 text-[10px]">Customers</span>
                                <strong className="font-mono">{b.recordCounts.customers ?? 0}</strong>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <span className="block text-slate-400 text-[10px]">Ledgers</span>
                                <strong className="font-mono">{b.recordCounts.transactions ?? 0}</strong>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <span className="block text-slate-400 text-[10px]">Invoices</span>
                                <strong className="font-mono">{b.recordCounts.invoices ?? 0}</strong>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <span className="block text-slate-400 text-[10px]">Products</span>
                                <strong className="font-mono">{b.recordCounts.products ?? 0}</strong>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <span className="block text-slate-400 text-[10px]">Expenses</span>
                                <strong className="font-mono">{b.recordCounts.expenses ?? 0}</strong>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <span className="block text-slate-400 text-[10px]">Savings</span>
                                <strong className="font-mono">{b.recordCounts.savingsGoals ?? 0}</strong>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <span className="block text-slate-400 text-[10px]">Reminders</span>
                                <strong className="font-mono">{b.recordCounts.reminders ?? 0}</strong>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <span className="block text-slate-400 text-[10px]">Vault / Notes</span>
                                <strong className="font-mono">{(b.recordCounts.notes || 0) + (b.recordCounts.documents || 0)}</strong>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={!selectedBackup || isRestoring}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Restoring Ledger...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm &amp; Restore Workspace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INFO GUIDE MODAL */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-[#0A0F1D] border border-slate-200 dark:border-indigo-500/30 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Google Drive Backup &amp; Recovery Guide
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="space-y-1">
                <strong className="text-slate-900 dark:text-white block font-bold">1. How Connection Works:</strong>
                <p>
                  Clicking <strong>Connect Google Drive</strong> opens Google&apos;s official authorization window. Grant permission to create and manage files created by SmartKhata (<code className="text-emerald-600 font-mono">drive.file</code> scope). We never access any unrelated files in your Drive.
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-slate-900 dark:text-white block font-bold">2. Private Folder Hierarchy:</strong>
                <p>
                  SmartKhata Pro creates exactly 2 folders inside your personal Google Drive (<code className="text-emerald-600 font-mono">SmartKhata Pro/</code>):
                  <br />
                  <code className="text-emerald-600 font-mono">SmartKhata Pro/Backups/</code> — Latest daily backup ZIP archive &amp; manifest.json (auto-updated in-place)
                  <br />
                  <code className="text-emerald-600 font-mono">SmartKhata Pro/Files/</code> — User-attached bills, invoices, receipts, and CRM files
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-slate-900 dark:text-white block font-bold">3. Daily Automated Backups:</strong>
                <p>
                  Every night at 02:00 AM UTC, the server automatically captures a full snapshot of your ledger and uploads it directly to your Drive. You do not need to keep the browser or phone app open.
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-slate-900 dark:text-white block font-bold">4. Recovering After Account Deletion:</strong>
                <p>
                  If you delete your SmartKhata account, or switch phones, your Google Drive files are <strong>never deleted</strong>. You can simply create a fresh SmartKhata account, connect the <strong>same Google Drive account</strong>, click <strong>Restore Backup</strong>, and all your records will be restored into your new account with 1 click!
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCONNECT CONFIRMATION MODAL */}
      {isDisconnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0A0F1D] border border-slate-200 dark:border-indigo-500/30 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Disconnect Google Drive?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated daily backups will stop. Existing backup archives in your Google Drive will <strong>NOT</strong> be deleted and remain completely safe. You can reconnect anytime.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnectConfirm}
                disabled={isDisconnecting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
