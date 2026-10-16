'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Loading from '@/components/Loading';

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
    <Loading
      variant="initializing"
      title="Initializing..."
      subtitle="Connecting to Payment Portal"
      fullScreen
    />
  );
}

export default function PayRedirectPage() {
  return (
    <Suspense fallback={
      <Loading
        variant="initializing"
        title="Initializing..."
        subtitle="Connecting to Payment Portal"
        fullScreen
      />
    }>
      <PayRedirectContent />
    </Suspense>
  );
}
