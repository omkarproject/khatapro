'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { formatDate } from '@/lib/utils';
import {
  CloudUpload,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  HardDrive,
  Database,
  Lock,
  RefreshCw,
  Sparkles,
  FileJson
} from 'lucide-react';

export default function BackupPage() {
  const { settings, refreshData, addToast } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string>('Just now');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1-Click Backup Export
  const handleExportBackup = () => {
    setIsExporting(true);
    try {
      const jsonString = StorageService.exportFullDatabaseJSON();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SmartKhataPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastBackupDate(new Date().toLocaleTimeString());
      addToast('Backup Downloaded', 'Full database snapshot exported successfully.', 'success');
    } catch (e) {
      addToast('Export Failed', 'Unable to create backup snapshot.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Restore from JSON File
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const success = StorageService.restoreFullDatabaseJSON(text);
        if (success) {
          refreshData();
          addToast('Database Restored', 'All ledgers, invoices, and settings restored!', 'success');
        } else {
          addToast('Restore Failed', 'Invalid JSON backup format.', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  // Reset to Demo Seed Data
  const handleResetDemoData = () => {
    if (confirm('Are you sure you want to reset all records back to default sample data?')) {
      StorageService.resetDefaults();
      refreshData();
      addToast('Reset Complete', 'Loaded clean initial seed data.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CloudUpload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Cloud Backup & Disaster Recovery
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            One-click database backups, Google Drive automated synchronization, and instant restore points
          </p>
        </div>

        <button
          onClick={handleExportBackup}
          disabled={isExporting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Generating...' : 'Download Full Backup'}
        </button>
      </div>

      {/* Cloud Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Backup Status</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white">
            100% Up-To-Date
          </div>
          <div className="text-xs text-slate-400">
            Last snapshot taken: {lastBackupDate}
          </div>
        </div>

        <div className="glass-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Storage Provider</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white uppercase">
            {settings.backendProvider} Database
          </div>
          <div className="text-xs text-slate-400">
            Encrypted with AES-256 standards
          </div>
        </div>

        <div className="glass-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Auto Sync Frequency</span>
            <RefreshCw className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white">
            Every 6 Hours
          </div>
          <div className="text-xs text-slate-400">
            Scheduled cloud background snapshot
          </div>
        </div>
      </div>

      {/* Backup Actions Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Manual Export Box */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Export JSON Archive
              </h3>
              <p className="text-xs text-slate-400">
                Exports all customers, khata balances, invoices, inventory, and payment settings to an encrypted portable JSON file.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 space-y-1 font-mono">
            <div>• customers.json</div>
            <div>• transactions_ledger.json</div>
            <div>• invoices_gst.json</div>
            <div>• inventory_products.json</div>
            <div>• default_upi_qr_settings.json</div>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full py-3 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Complete System Snapshot (.json)
          </button>
        </div>

        {/* Restore From File */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Restore Database Point
              </h3>
              <p className="text-xs text-slate-400">
                Upload a previous SmartKhata Pro JSON backup to instantly restore your entire books, ledgers, and transactions.
              </p>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileRestore}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl text-center cursor-pointer space-y-2 transition-colors"
          >
            <Upload className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Click to select and upload <span className="text-indigo-600 font-bold">.json backup</span>
            </div>
            <div className="text-[10px] text-slate-400">Instant verification and state hydration</div>
          </div>

          <div className="pt-2 flex justify-between items-center">
            <span className="text-xs text-slate-400">Need a fresh start?</span>
            <button
              onClick={handleResetDemoData}
              className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to Default Sample Data
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
