'use client';

import React, { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PayRedirectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = searchParams?.get('id') || searchParams?.get('inv');
  const gw = searchParams?.get('gw');

  useEffect(() => {
    if (id) {
      router.replace(`/pay/${id}${gw ? `?gw=${gw}` : ''}`);
    }
  }, [id, gw, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center text-xs text-slate-500 font-medium animate-pulse">
        Loading payment portal...
      </div>
    </div>
  );
}
