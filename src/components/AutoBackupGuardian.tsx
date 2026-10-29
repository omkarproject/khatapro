'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';

export interface AutoBackupStatus {
  id: string;
  userId: string;
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'postponed' | 'failed';
  date: string;
  progressPercent: number;
  processedMb: number;
  totalMb: number;
  stepText: string;
  error?: string;
  durationSeconds?: number;
  finalSizeMb?: number;
  filename?: string;
  timestamp: string;
}

/**
 * AutoBackupGuardian runs silently in the background on the client:
 * 1. Day's 1st Open Auto Backup: When the user opens the app (or logs in) for the first time in the day,
 *    it runs an automated cloud backup snapshot with real-time progress, file size (MB), elapsed time,
 *    and provides live [Cancel] and [Later] options inside Notifications & Alerts.
 * 2. Cancel: Cancels the backup for today.
 * 3. Later: Postpones the backup so it runs on the next app open.
 * 4. Completed: Displays total MB and time taken in Notifications & Alerts.
 * 5. Periodic Automated CronJob guarantee ping.
 */
export default function AutoBackupGuardian() {
  const { currentUser, addToast } = useApp();
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<any>(null);
  const isRunningRef = useRef(false);

  const broadcastStatus = (statusObj: AutoBackupStatus) => {
    try {
      localStorage.setItem('skp_live_backup_progress', JSON.stringify(statusObj));
    } catch {}
    window.dispatchEvent(new CustomEvent('khatapro_backup_progress', { detail: statusObj }));
  };

  const startDayFirstBackup = async (userId: string) => {
    if (isRunningRef.current) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const completedKey = `skp_daily_backup_completed_${userId}`;
    const cancelledKey = `skp_daily_backup_cancelled_${userId}`;
    const postponedKey = `skp_daily_backup_postponed_${userId}`;

    // 1. Check if user selected "Later" in this current browser session (will run on next open)
    if (sessionStorage.getItem(postponedKey) === 'true') {
      return;
    }

    // 2. Check if cancelled for today
    if (localStorage.getItem(cancelledKey) === todayStr) {
      return;
    }

    // 3. Pre-flight check: Verify Google Drive token validity with status API
    try {
      const statusRes = await fetch(`/api/backup/google-drive/status?userId=${encodeURIComponent(userId)}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (!statusData.isConnected || statusData.isExpired) {
          // Google Drive disconnected or token expired!
          localStorage.removeItem(completedKey);
          const errorMsg = statusData.error || (statusData.isExpired
            ? 'Google Drive OAuth token expired (invalid_grant). Reconnection required in Settings.'
            : 'Google Drive is not connected. Connect your Google account in Settings.');

          broadcastStatus({
            id: `bk_failed_${Date.now()}`,
            userId,
            status: 'failed',
            date: todayStr,
            progressPercent: 0,
            processedMb: 0,
            totalMb: 0,
            stepText: errorMsg,
            error: errorMsg,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
    } catch (checkErr) {
      console.warn('Could not verify Drive status before auto backup:', checkErr);
    }

    // 4. Check if already completed and verified today
    if (localStorage.getItem(completedKey) === todayStr) {
      return;
    }

    isRunningRef.current = true;

    // Estimate total backup size based on user's records
    const customersCount = StorageService.getCustomers()?.length || 0;
    const txnCount = StorageService.getTransactions()?.length || 0;
    const invoicesCount = StorageService.getInvoices()?.length || 0;
    const productsCount = StorageService.getProducts()?.length || 0;
    const expensesCount = StorageService.getExpenses()?.length || 0;
    const totalRecords = customersCount + txnCount + invoicesCount + productsCount + expensesCount;

    // Realistic baseline: ~1.45 MB + ~0.006 MB per record
    const estimatedTotalMb = Math.max(1.45, Number((1.35 + totalRecords * 0.006).toFixed(2)));

    const startTime = Date.now();
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    const initialStatus: AutoBackupStatus = {
      id: `bk_day_${Date.now()}`,
      userId,
      status: 'running',
      date: todayStr,
      progressPercent: 8,
      processedMb: Number((estimatedTotalMb * 0.08).toFixed(2)),
      totalMb: estimatedTotalMb,
      stepText: 'Reading ledger data & preparing snapshot...',
      timestamp: new Date().toISOString(),
    };

    broadcastStatus(initialStatus);

    let currentPercent = 8;
    const progressInterval = setInterval(() => {
      if (currentPercent < 92) {
        currentPercent += Math.floor(Math.random() * 8) + 4;
        if (currentPercent > 92) currentPercent = 92;

        let step = 'Reading ledger data & preparing snapshot...';
        if (currentPercent > 30 && currentPercent <= 65) {
          step = 'Packaging encrypted ZIP archive & SHA256 manifest...';
        } else if (currentPercent > 65) {
          step = 'Uploading snapshot to Google Drive & Cloud...';
        }

        const processed = Number(((estimatedTotalMb * currentPercent) / 100).toFixed(2));
        const durationSec = Number(((Date.now() - startTime) / 1000).toFixed(1));

        broadcastStatus({
          id: initialStatus.id,
          userId,
          status: 'running',
          date: todayStr,
          progressPercent: currentPercent,
          processedMb: processed,
          totalMb: estimatedTotalMb,
          stepText: step,
          durationSeconds: durationSec,
          timestamp: new Date().toISOString(),
        });
      }
    }, 400);

    progressIntervalRef.current = progressInterval;

    // Trigger backup API with strict post-upload recheck
    fetch(`/api/backup/google-drive/cron?force=true&auto=true&trigger=day_first_open&userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cronjob': '1',
      },
      signal: abortController.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        clearInterval(progressInterval);
        isRunningRef.current = false;
        activeAbortControllerRef.current = null;

        const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
        const finalSizeBytes = data.backup?.size || Math.round(estimatedTotalMb * 1024 * 1024);
        const finalSizeMb = Number((finalSizeBytes / (1024 * 1024)).toFixed(2));
        const filename = data.backup?.filename || `SmartKhata-Backup-${todayStr}.zip`;

        // Only mark completed IF backup actually succeeded and was physically verified in Google Drive!
        if (data.success && data.backup?.status === 'success' && data.backup?.verified) {
          localStorage.setItem(completedKey, todayStr);

          const completedStatus: AutoBackupStatus = {
            id: initialStatus.id,
            userId,
            status: 'completed',
            date: todayStr,
            progressPercent: 100,
            processedMb: finalSizeMb,
            totalMb: finalSizeMb,
            finalSizeMb,
            durationSeconds,
            filename,
            stepText: 'Auto Backup Completed',
            timestamp: new Date().toISOString(),
          };

          broadcastStatus(completedStatus);
          console.log(`🛡️ Day 1st Open Auto Backup Verified & Completed for ${userId} in ${durationSeconds}s (${finalSizeMb} MB).`);
        } else {
          // Backup failed or could not be verified in Google Drive
          localStorage.removeItem(completedKey);

          const errorMsg = data.message || data.backup?.error || 'Auto backup to Google Drive failed or could not be verified';
          const failedStatus: AutoBackupStatus = {
            id: initialStatus.id,
            userId,
            status: 'failed',
            date: todayStr,
            progressPercent: 0,
            processedMb: 0,
            totalMb: estimatedTotalMb,
            durationSeconds,
            stepText: errorMsg,
            error: errorMsg,
            timestamp: new Date().toISOString(),
          };

          broadcastStatus(failedStatus);
          addToast(
            'Auto Backup Failed',
            errorMsg,
            'error'
          );
        }
      })
      .catch((err) => {
        clearInterval(progressInterval);
        isRunningRef.current = false;
        activeAbortControllerRef.current = null;

        // If user aborted via Cancel or Later, it's handled by cancel/later listeners
        if (err.name === 'AbortError') {
          return;
        }

        localStorage.removeItem(completedKey);
        const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
        const errorMsg = err.message || 'Network error during auto backup';
        broadcastStatus({
          id: initialStatus.id,
          userId,
          status: 'failed',
          date: todayStr,
          progressPercent: 0,
          processedMb: 0,
          totalMb: estimatedTotalMb,
          durationSeconds,
          stepText: errorMsg,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        });
        addToast('Auto Backup Failed', errorMsg, 'error');
      });
  };

  // 1. Listen for user session, Day 1st Open triggers, and Retry Backup events
  useEffect(() => {
    if (!currentUser?.id) return;

    // Small delay (1.2s) after page mount/hydration so initial UI loads snappily
    const timer = setTimeout(() => {
      startDayFirstBackup(currentUser.id);
    }, 1200);

    const handleCheckDaily = (e: any) => {
      const uId = e.detail?.userId || currentUser?.id;
      if (uId) startDayFirstBackup(uId);
    };

    const handleRetryDaily = (e: any) => {
      const uId = e.detail?.userId || currentUser?.id;
      if (uId) {
        localStorage.removeItem(`skp_daily_backup_completed_${uId}`);
        sessionStorage.removeItem(`skp_daily_backup_postponed_${uId}`);
        localStorage.removeItem(`skp_daily_backup_cancelled_${uId}`);
        isRunningRef.current = false;
        startDayFirstBackup(uId);
      }
    };

    window.addEventListener('khatapro_check_daily_backup', handleCheckDaily);
    window.addEventListener('khatapro_retry_daily_backup', handleRetryDaily);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('khatapro_check_daily_backup', handleCheckDaily);
      window.removeEventListener('khatapro_retry_daily_backup', handleRetryDaily);
    };
  }, [currentUser?.id]);

  // 2. Listen for Cancel button from Notifications & Alerts
  useEffect(() => {
    const handleCancel = () => {
      if (!currentUser?.id) return;
      const todayStr = new Date().toISOString().split('T')[0];

      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      isRunningRef.current = false;

      // Mark cancelled for today so it will not run again today
      localStorage.setItem(`skp_daily_backup_cancelled_${currentUser.id}`, todayStr);

      const cancelStatus: AutoBackupStatus = {
        id: `bk_cancelled_${Date.now()}`,
        userId: currentUser.id,
        status: 'cancelled',
        date: todayStr,
        progressPercent: 0,
        processedMb: 0,
        totalMb: 0,
        stepText: "Today's auto backup cancelled by user.",
        timestamp: new Date().toISOString(),
      };

      try {
        localStorage.setItem('skp_live_backup_progress', JSON.stringify(cancelStatus));
      } catch {}
      window.dispatchEvent(new CustomEvent('khatapro_backup_progress', { detail: cancelStatus }));
    };

    window.addEventListener('khatapro_backup_cancel', handleCancel);
    return () => window.removeEventListener('khatapro_backup_cancel', handleCancel);
  }, [currentUser?.id]);

  // 3. Listen for Later button from Notifications & Alerts (postpones to next open)
  useEffect(() => {
    const handleLater = () => {
      if (!currentUser?.id) return;
      const todayStr = new Date().toISOString().split('T')[0];

      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      isRunningRef.current = false;

      // Store in sessionStorage only so on next open / reload / new tab it runs again!
      sessionStorage.setItem(`skp_daily_backup_postponed_${currentUser.id}`, 'true');

      const laterStatus: AutoBackupStatus = {
        id: `bk_later_${Date.now()}`,
        userId: currentUser.id,
        status: 'postponed',
        date: todayStr,
        progressPercent: 0,
        processedMb: 0,
        totalMb: 0,
        stepText: 'Auto backup postponed. Will run on next open.',
        timestamp: new Date().toISOString(),
      };

      try {
        localStorage.setItem('skp_live_backup_progress', JSON.stringify(laterStatus));
      } catch {}
      window.dispatchEvent(new CustomEvent('khatapro_backup_progress', { detail: laterStatus }));
    };

    window.addEventListener('khatapro_backup_later', handleLater);
    return () => window.removeEventListener('khatapro_backup_later', handleLater);
  }, [currentUser?.id]);

  // 4. Periodic automated CronJob ping (every 4 hours, silent background guarantee)
  useEffect(() => {
    const cronTimer = setTimeout(() => {
      try {
        const lastCheckStr = localStorage.getItem('skp_last_cronjob_ping');
        const now = Date.now();
        const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

        if (lastCheckStr && now - Number(lastCheckStr) < FOUR_HOURS_MS) {
          return;
        }

        fetch('/api/backup/google-drive/cron?auto=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cronjob': '1',
          },
          keepalive: true,
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success) {
              localStorage.setItem('skp_last_cronjob_ping', String(Date.now()));
              if (!data.skipped) {
                console.log('🛡️ Automated CronJob: Daily multi-merchant cloud backup completed.');
              }
            }
          })
          .catch(() => {});
      } catch {}
    }, 8000);

    return () => clearTimeout(cronTimer);
  }, []);

  return null;
}
