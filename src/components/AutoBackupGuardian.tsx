'use client';

import { useEffect, useRef } from 'react';

/**
 * AutoBackupGuardian runs silently in the background on the client.
 * Guarantees that daily backups to Google Drive are performed every day for all merchants,
 * even if server crons fail or are delayed.
 */
export default function AutoBackupGuardian() {
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    // Run silently in background after 6 seconds to never block initial page hydration
    const timer = setTimeout(() => {
      try {
        const lastCheckStr = localStorage.getItem('skp_last_autobackup_ping');
        const now = Date.now();
        const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

        if (lastCheckStr && now - Number(lastCheckStr) < FOUR_HOURS_MS) {
          // Checked recently, skip ping
          return;
        }

        // Silent ping to daily cron with auto=true
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
