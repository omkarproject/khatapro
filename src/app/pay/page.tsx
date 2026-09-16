'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PayRedirectContent() {
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#070B14]">
      <div className="text-center text-xs text-slate-400 font-medium animate-pulse">
        Loading payment portal...
      </div>
    </div>
  );
}

export default function PayRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#070B14]">
        <div className="text-center text-xs text-slate-400 font-medium animate-pulse">
          Loading payment portal...
        </div>
      </div>
    }>
      <PayRedirectContent />
    </Suspense>
  );
}
