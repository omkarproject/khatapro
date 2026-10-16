'use client';

import React from 'react';
import Loading from '@/components/Loading';

export default function RootLoading() {
  return (
    <Loading
      variant="initializing"
      title="Initializing..."
      subtitle="Connecting"
      fullScreen
    />
  );
}
