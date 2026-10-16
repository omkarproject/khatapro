'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

/**
 * AutoBackupGuardian runs silently in the background on the client:
 * 1. Immediate Login Backup: Whenever a user logs in or an authenticated session is active,
 *    it backs up that specific user's complete data to Google Drive / Cloud.
 * 2. Periodic Daily Cron Guarantee: Guarantees daily backups are performed every day for all merchants,
 *    even if server crons fail or are delayed.
 */
export default function AutoBackupGuardian() {
  const { currentUser } = useApp();
  const cronExecutedRef = useRef(false);
  const lastBackedUpUserRef = useRef<string | null>(null);

  // 1. Instant User Backup on Login / Session Detection
  useEffect(() => {
    if (!currentUser?.id) return;
    if (lastBackedUpUserRef.current === currentUser.id) return;

    // Check session storage to avoid repeating in the exact same tab within 15 minutes
    const sessionKey = `skp_login_backup_${currentUser.id}`;
    const lastSessionBackup = sessionStorage.getItem(sessionKey);
    const FIFTEEN_MINS_MS = 15 * 60 * 1000;

    if (lastSessionBackup && Date.now() - Number(lastSessionBackup) < FIFTEEN_MINS_MS) {
      lastBackedUpUserRef.current = currentUser.id;
      return;
    }

    lastBackedUpUserRef.current = currentUser.id;

    // Trigger immediate backup 1.5s after login so UI renders smoothly first
    const loginBackupTimer = setTimeout(() => {
      fetch(`/api/backup/google-drive/cron?force=true&auto=true&trigger=login&userId=${encodeURIComponent(currentUser.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            sessionStorage.setItem(sessionKey, String(Date.now()));
            console.log(`🛡️ AutoBackupGuardian: Instant login backup completed for ${currentUser.name || currentUser.email}.`);
          }
        })
        .catch((err) => {
          console.warn('Login backup background ping error:', err);
        });
    }, 1500);

    return () => clearTimeout(loginBackupTimer);
  }, [currentUser?.id, currentUser?.name, currentUser?.email]);

  // 2. Periodic General Daily Cron Ping (every 4 hours)
  useEffect(() => {
    if (cronExecutedRef.current) return;
    cronExecutedRef.current = true;

    const timer = setTimeout(() => {
      try {
        const lastCheckStr = localStorage.getItem('skp_last_autobackup_ping');
        const now = Date.now();
        const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

        if (lastCheckStr && now - Number(lastCheckStr) < FOUR_HOURS_MS) {
          return;
        }

        fetch('/api/backup/google-drive/cron?auto=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success) {
              localStorage.setItem('skp_last_autobackup_ping', String(Date.now()));
              if (!data.skipped) {
                console.log('🛡️ AutoBackupGuardian: Daily automated cloud backup completed for all merchants.');
              }
            }
          })
          .catch((err) => {
            console.warn('AutoBackupGuardian ping skipped:', err);
          });
      } catch (err) {
        console.warn('AutoBackupGuardian error:', err);
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
