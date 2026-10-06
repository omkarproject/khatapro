'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BackupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings?tab=backup');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        Redirecting to Settings &rarr; Cloud Backup...
      </p>
    </div>
  );
}
