'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';

export default function BackupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings?tab=backup');
  }, [router]);

  return (
    <Loading
      variant="initializing"
      title="Initializing..."
      subtitle="Connecting to Cloud Backup"
      minHeight="min-h-[50vh]"
    />
  );
}
