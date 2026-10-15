import React from 'react';

export default function Loading() {
  return (
    <div className="w-full space-y-6 animate-pulse p-2 sm:p-4">
      {/* Top Banner Skeleton */}
      <div className="h-24 sm:h-28 rounded-2xl bg-gradient-to-r from-slate-200 via-indigo-100/60 to-slate-200 dark:from-slate-800 dark:via-indigo-950/40 dark:to-slate-800" />

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 p-4 space-y-3">
            <div className="h-3 w-20 bg-slate-300 dark:bg-slate-700 rounded-md" />
            <div className="h-6 w-28 bg-slate-300 dark:bg-slate-700 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="h-80 sm:h-96 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs font-medium">Loading SmartKhata Module...</span>
        </div>
      </div>
    </div>
  );
}
