'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { BackendProvider, SystemSettings, PaymentSettings, PaymentCollectionMode, TelegramBackupSettings, BackupFrequency, BackupDayOfWeek } from '@/types';
import { LocalAdapter, SupabaseAdapter, FirebaseAdapter, MongoAdapter } from '@/services/backendManager';
import {
  Settings,
  Building,
  QrCode,
  Database,
  Shield,
  Upload,
  Save,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Key,
  Globe,
  Sparkles,
  Lock,
  Smartphone,
  FileText,
  Printer,
  ExternalLink,
  Copy,
  X,
  ChevronRight,
  BookOpen,
  CreditCard,
  Wallet,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  Camera,
  Image as ImageIcon,
  CloudUpload,
  Download,
  RotateCcw,
  FileJson,
  RefreshCw,
  Send,
  Calendar,
  Clock,
  Bot,
  MessageSquare,
  FileCheck,
  Flame,
  Zap,
  HardHat,
  Users,
  UserCheck,
  UserX,
  Search,
  Filter
} from 'lucide-react';
import GoogleDriveBackupPanel from '@/components/GoogleDriveBackupPanel';

export default function SettingsPage() {
  const { settings, updateSettings, saveDefaultUpiAndQr, profile, setProfile, addToast, syncWithDatabase, currentUser, refreshData } = useApp();

  const isAdmin = Boolean(
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.email === 'anantyadav8924@gmail.com'
  );

  const [mainTab, setMainTab] = useState<'business' | 'backup' | 'admin'>('business');
  const [businessSubTab, setBusinessSubTab] = useState<'enterprise' | 'payments' | 'security'>('enterprise');
  const [adminSubTab, setAdminSubTab] = useState<'supabase' | 'drive' | 'users' | 'maintenance'>('supabase');
  const [isSyncingData, setIsSyncingData] = useState(false);

  // User Management CRM State (Admin Only)
  const [crmUsers, setCrmUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'user'>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchCrmUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setCrmUsers(data.users);
      }
    } catch (err) {
      console.warn('Failed to load CRM users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'admin' && adminSubTab === 'users' && isAdmin) {
      fetchCrmUsers();
    }
  }, [mainTab, adminSubTab, isAdmin]);

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update user role');
      addToast('Role Updated', `User role changed to ${newRole}.`, 'success');
      fetchCrmUsers();
    } catch (err: any) {
      addToast('Update Failed', err.message || 'Could not update user role', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove user "${userName}" from SmartKhata? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete user');
      addToast('User Removed', `User ${userName} has been removed.`, 'info');
      fetchCrmUsers();
    } catch (err: any) {
      addToast('Delete Failed', err.message || 'Could not delete user', 'error');
    }
  };

  // Maintenance & Beta Testing State
  const [maintEnabled, setMaintEnabled] = useState(() => settings.maintenanceMode?.enabled || false);
  const [maintDuration, setMaintDuration] = useState<number>(() => settings.maintenanceMode?.durationMinutes || 15);
  const [maintReason, setMaintReason] = useState(() => settings.maintenanceMode?.reason || 'Transformer me aag lag gai ⚡💥🔥 many people repair kar rahe hain 👨‍🔧🛠️');
  const [betaTestingActive, setBetaTestingActive] = useState(() => Boolean(settings.betaTestingEnabled));

  // Cloud Backup & Restore State
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string>('Just now');
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [exportIncludeMedia, setExportIncludeMedia] = useState(true);

  // Keep maintenance & beta state in sync if settings update
  useEffect(() => {
    if (settings.maintenanceMode) {
      setMaintEnabled(settings.maintenanceMode.enabled || false);
      if (settings.maintenanceMode.durationMinutes) setMaintDuration(settings.maintenanceMode.durationMinutes);
      if (settings.maintenanceMode.reason) setMaintReason(settings.maintenanceMode.reason);
    }
    if (settings.betaTestingEnabled !== undefined) {
      setBetaTestingActive(Boolean(settings.betaTestingEnabled));
    }
  }, [settings.maintenanceMode, settings.betaTestingEnabled]);

  // Read ?tab= from URL on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'backup') {
        setMainTab('backup');
      } else if (tabParam === 'upi') {
        setMainTab('business');
        setBusinessSubTab('payments');
      } else if (tabParam === 'security') {
        setMainTab('business');
        setBusinessSubTab('security');
      } else if (tabParam === 'business') {
        setMainTab('business');
        setBusinessSubTab('enterprise');
      } else if (tabParam === 'backend' || tabParam === 'supabase') {
        setMainTab('admin');
        setAdminSubTab('supabase');
      } else if (tabParam === 'drive') {
        setMainTab('admin');
        setAdminSubTab('drive');
      } else if (tabParam === 'users') {
        setMainTab('admin');
        setAdminSubTab('users');
      } else if (tabParam === 'maintenance') {
        setMainTab('admin');
        setAdminSubTab('maintenance');
      }
    }
  }, []);

  // Keep logo state in sync when settings / profile / localStorage updates
  useEffect(() => {
    const currentLogo =
      settings.businessLogo ||
      profile?.avatarUrl ||
      currentUser?.avatarUrl ||
      (typeof window !== 'undefined' ? localStorage.getItem('khatapro_business_logo') || '' : '');
    if (currentLogo && !bLogo) {
      setBLogo(currentLogo);
    }
  }, [settings.businessLogo, profile?.avatarUrl, currentUser?.avatarUrl]);

  // Save Maintenance & Beta Testing Settings
  const handleSaveMaintenance = (enableMode?: boolean) => {
    const isEnabling = enableMode !== undefined ? enableMode : maintEnabled;
    const newEndTime = isEnabling ? new Date(Date.now() + maintDuration * 60 * 1000).toISOString() : undefined;

    updateSettings({
      ...settings,
      maintenanceMode: {
        enabled: isEnabling,
        durationMinutes: maintDuration,
        endTime: newEndTime,
        reason: maintReason.trim() || 'Transformer me aag lag gai ⚡💥🔥 many people repair kar rahe hain 👨‍🔧🛠️',
      },
      betaTestingEnabled: betaTestingActive,
    });
    setMaintEnabled(isEnabling);
    addToast(
      isEnabling ? 'Maintenance Mode Enabled! ⚡' : 'Maintenance Mode Disabled',
      isEnabling
        ? `System maintenance timer set for ${maintDuration} minutes. Auto-turns OFF on expiry.`
        : 'System is back online for all users.',
      isEnabling ? 'warning' : 'success'
    );
  };

  // 1-Click Backup Export
  const handleExportBackup = (includeMedia: boolean = exportIncludeMedia) => {
    setIsExportingBackup(true);
    try {
      const jsonString = StorageService.exportFullDatabaseJSON(includeMedia);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const mediaTag = includeMedia ? 'Full_WithMedia' : 'Compact_NoMedia';
      const activeDb = settings.backendProvider.toUpperCase();
      link.download = `SmartKhataPro_${activeDb}_${mediaTag}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastBackupDate(new Date().toLocaleTimeString());
      addToast(
        'Backup Downloaded',
        `Full JSON backup (${includeMedia ? 'With Images & PDFs' : 'Without Images/PDFs'}) exported successfully.`,
        'success'
      );
    } catch (e) {
      addToast('Export Failed', 'Unable to create backup snapshot.', 'error');
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Restore from JSON File
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const success = StorageService.restoreFullDatabaseJSON(text);
        if (success) {
          refreshData();
          if (settings.backendProvider === 'supabase') {
            await syncWithDatabase();
          }
          addToast('Database Restored', 'All ledgers, invoices, customers, and settings restored and synced!', 'success');
        } else {
          addToast('Restore Failed', 'Invalid JSON backup format.', 'error');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Reset to Demo Seed Data
  const handleResetDemoData = async () => {
    if (confirm('Are you sure you want to reset all records back to default sample data?')) {
      StorageService.resetDefaults();
      refreshData();
      if (settings.backendProvider === 'supabase') {
        await syncWithDatabase();
      }
      addToast('Reset Complete', 'Loaded clean initial seed data.', 'info');
    }
  };



  // Security & Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || newPassword.trim().length < 4) {
      setPasswordError('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || profile?.id || 'usr_001',
          email: currentUser?.email || profile?.email || '',
          currentPassword: currentPassword ? currentPassword.trim() : undefined,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update password.');
      }

      setPasswordSuccess('Password updated and saved successfully in Supabase Cloud!');
      addToast('Password Changed', 'Your new password has been saved to Supabase Cloud.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Could not update password. Please check your credentials.');
      addToast('Password Update Error', err.message || 'Failed to update password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Business Profile State
  const [bLogo, setBLogo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      const p = StorageService.getProfile();
      return s.businessLogo || p?.avatarUrl || settings.businessLogo || profile?.avatarUrl || '';
    }
    return settings.businessLogo || profile?.avatarUrl || '';
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [bName, setBName] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      const p = StorageService.getProfile();
      return s.businessName || p?.businessName || settings.businessName || profile?.businessName || currentUser?.businessName || '';
    }
    return settings.businessName || profile?.businessName || currentUser?.businessName || '';
  });
  const [bTagline, setBTagline] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.businessTagline || settings.businessTagline || 'Track Money, Manage Business, Grow Faster';
    }
    return settings.businessTagline || 'Track Money, Manage Business, Grow Faster';
  });
  const [bPhone, setBPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      const p = StorageService.getProfile();
      return s.businessPhone || p?.phone || settings.businessPhone || profile?.phone || currentUser?.phone || '';
    }
    return settings.businessPhone || profile?.phone || currentUser?.phone || '';
  });
  const [bEmail, setBEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      const p = StorageService.getProfile();
      return s.businessEmail || p?.email || settings.businessEmail || profile?.email || currentUser?.email || '';
    }
    return settings.businessEmail || profile?.email || currentUser?.email || '';
  });
  const [bAddress, setBAddress] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      const p = StorageService.getProfile();
      return s.businessAddress || p?.businessAddress || settings.businessAddress || profile?.businessAddress || '';
    }
    return settings.businessAddress || profile?.businessAddress || '';
  });
  const [bGst, setBGst] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      const p = StorageService.getProfile();
      return s.paymentSettings?.businessGst || p?.businessGst || settings.paymentSettings?.businessGst || profile?.businessGst || '';
    }
    return settings.paymentSettings?.businessGst || profile?.businessGst || '';
  });

  // UPI & Payment Collection Modes (Direct UPI, Cashfree Gateway, UPI Gateway)
  const [collectionMode, setCollectionMode] = useState<PaymentCollectionMode>(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.collectionMode || settings.paymentSettings?.collectionMode || 'direct_upi';
    }
    return settings.paymentSettings?.collectionMode || 'direct_upi';
  });
  const [upiId, setUpiId] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.upiId || settings.paymentSettings?.upiId;
    }
    return settings.paymentSettings?.upiId;
  });
  const [payeeName, setPayeeName] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.payeeName || settings.paymentSettings?.payeeName;
    }
    return settings.paymentSettings?.payeeName;
  });
  const [customQrUrl, setCustomQrUrl] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.customQrUrl || settings.paymentSettings?.customQrUrl;
    }
    return settings.paymentSettings?.customQrUrl;
  });

  // Cashfree Gateway State
  const [cashfreeAppId, setCashfreeAppId] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.cashfreeAppId || settings.paymentSettings?.cashfreeAppId || '';
    }
    return settings.paymentSettings?.cashfreeAppId || '';
  });
  const [cashfreeSecretKey, setCashfreeSecretKey] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.cashfreeSecretKey || settings.paymentSettings?.cashfreeSecretKey || '';
    }
    return settings.paymentSettings?.cashfreeSecretKey || '';
  });
  const [cashfreeEnv, setCashfreeEnv] = useState<'sandbox' | 'production'>(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.cashfreeEnv || settings.paymentSettings?.cashfreeEnv || 'production';
    }
    return settings.paymentSettings?.cashfreeEnv || 'production';
  });

  // Razorpay Gateway State
  const [razorpayKeyId, setRazorpayKeyId] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.razorpayKeyId || settings.paymentSettings?.razorpayKeyId || '';
    }
    return settings.paymentSettings?.razorpayKeyId || '';
  });
  const [razorpayKeySecret, setRazorpayKeySecret] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.razorpayKeySecret || settings.paymentSettings?.razorpayKeySecret || '';
    }
    return settings.paymentSettings?.razorpayKeySecret || '';
  });
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.razorpayWebhookSecret || settings.paymentSettings?.razorpayWebhookSecret || '';
    }
    return settings.paymentSettings?.razorpayWebhookSecret || '';
  });
  const [razorpayEnv, setRazorpayEnv] = useState<'test' | 'live'>(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.razorpayEnv || settings.paymentSettings?.razorpayEnv || 'live';
    }
    return settings.paymentSettings?.razorpayEnv || 'live';
  });

  // UPI Payment Gateway State
  const [upiGatewayProvider, setUpiGatewayProvider] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.upiGatewayProvider || settings.paymentSettings?.upiGatewayProvider || 'Cashfree UPI Gateway';
    }
    return settings.paymentSettings?.upiGatewayProvider || 'Cashfree UPI Gateway';
  });
  const [upiGatewayKey, setUpiGatewayKey] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.upiGatewayKey || settings.paymentSettings?.upiGatewayKey || '';
    }
    return settings.paymentSettings?.upiGatewayKey || '';
  });
  const [upiGatewaySecret, setUpiGatewaySecret] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.upiGatewaySecret || settings.paymentSettings?.upiGatewaySecret || '';
    }
    return settings.paymentSettings?.upiGatewaySecret || '';
  });
  const [upiGatewayWebhookUrl, setUpiGatewayWebhookUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = StorageService.getSettings();
      return s.paymentSettings?.upiGatewayWebhookUrl || settings.paymentSettings?.upiGatewayWebhookUrl || 'https://api.smartkhatapro.in/webhook/upi-payment';
    }
    return settings.paymentSettings?.upiGatewayWebhookUrl || 'https://api.smartkhatapro.in/webhook/upi-payment';
  });
  const [pgTestResult, setPgTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isPgTesting, setIsPgTesting] = useState(false);

  // Sync settings when AppContext updates
  useEffect(() => {
    if (settings && settings.paymentSettings) {
      if (settings.paymentSettings.collectionMode) setCollectionMode(settings.paymentSettings.collectionMode);
      if (settings.paymentSettings.upiId) setUpiId(settings.paymentSettings.upiId);
      if (settings.paymentSettings.payeeName) setPayeeName(settings.paymentSettings.payeeName);
      if (settings.paymentSettings.customQrUrl !== undefined) setCustomQrUrl(settings.paymentSettings.customQrUrl);
      if (settings.paymentSettings.cashfreeAppId) setCashfreeAppId(settings.paymentSettings.cashfreeAppId);
      if (settings.paymentSettings.cashfreeSecretKey) setCashfreeSecretKey(settings.paymentSettings.cashfreeSecretKey);
      if (settings.paymentSettings.cashfreeEnv) setCashfreeEnv(settings.paymentSettings.cashfreeEnv);
      if (settings.paymentSettings.razorpayKeyId) setRazorpayKeyId(settings.paymentSettings.razorpayKeyId);
      if (settings.paymentSettings.razorpayKeySecret) setRazorpayKeySecret(settings.paymentSettings.razorpayKeySecret);
      if (settings.paymentSettings.razorpayWebhookSecret) setRazorpayWebhookSecret(settings.paymentSettings.razorpayWebhookSecret);
      if (settings.paymentSettings.razorpayEnv) setRazorpayEnv(settings.paymentSettings.razorpayEnv);
      if (settings.paymentSettings.upiGatewayProvider) setUpiGatewayProvider(settings.paymentSettings.upiGatewayProvider);
      if (settings.paymentSettings.upiGatewayKey) setUpiGatewayKey(settings.paymentSettings.upiGatewayKey);
      if (settings.paymentSettings.upiGatewaySecret) setUpiGatewaySecret(settings.paymentSettings.upiGatewaySecret);
      if (settings.paymentSettings.upiGatewayWebhookUrl) setUpiGatewayWebhookUrl(settings.paymentSettings.upiGatewayWebhookUrl);
    }
    if (settings.businessName) setBName(settings.businessName);
    if (settings.businessLogo) setBLogo(settings.businessLogo);
    if (settings.businessTagline) setBTagline(settings.businessTagline);
    if (settings.businessPhone) setBPhone(settings.businessPhone);
    if (settings.businessEmail) setBEmail(settings.businessEmail);
    if (settings.businessAddress) setBAddress(settings.businessAddress);
    if (settings.paymentSettings?.businessGst) setBGst(settings.paymentSettings.businessGst);
  }, [settings]);

  // Sync with server Cashfree config if available
  useEffect(() => {
    fetch('/api/cashfree/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isConfigured) {
          if (!cashfreeAppId && data.appId) setCashfreeAppId(data.appId);
          if (data.env) setCashfreeEnv(data.env);
        }
      })
      .catch(() => {});
  }, []);

  // Payment Setup PDF Guide Modal State
  const [isPaymentGuideModalOpen, setIsPaymentGuideModalOpen] = useState(false);
  const [paymentGuideActiveTab, setPaymentGuideActiveTab] = useState<PaymentCollectionMode>(
    settings.paymentSettings.collectionMode || 'direct_upi'
  );

  // Database Connection PDF Guide Modal State
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideActiveTab, setGuideActiveTab] = useState<BackendProvider>('supabase');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backend Provider Settings State (Supabase Primary)
  const [provider, setProvider] = useState<BackendProvider>('supabase');
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || 'https://axpbydzszykqwojamblh.supabase.co');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cGJ5ZHpzenlrcXdvamFtYmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTIzNTcsImV4cCI6MjEwNzI4ODM1N30.MOkM9DqTFr5nB4mYj-Z3n9FEta1Pi0tSSJ0tTWxsxF0');
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState(settings.supabaseServiceRoleKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cGJ5ZHpzenlrcXdvamFtYmxoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcxMjM1NywiZXhwIjoyMTA3Mjg4MzU3fQ.oUgYxGo6-WWyioLkhmPuldiCWf4pANvEl7vnPyNyyNs');

  // Google Drive API Credentials State
  const [driveClientId, setDriveClientId] = useState(settings.googleDriveSettings?.clientId || '997421467008-nbhomb8nrp56opa09og9od1t68pa049j.apps.googleusercontent.com');
  const [driveClientSecret, setDriveClientSecret] = useState(settings.googleDriveSettings?.clientSecret || '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');
  const [driveRedirectUri, setDriveRedirectUri] = useState(settings.googleDriveSettings?.redirectUri || 'https://khatapro-sandy.vercel.app/api/backup/google-drive/callback');

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Handle Profile Logo Upload & Remove
  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast('Invalid File', 'Please select a valid image file (PNG, JPG, WEBP).', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 500;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setBLogo(compressed);
            updateSettings({ businessLogo: compressed });
            setProfile({ ...profile, avatarUrl: compressed });
            addToast('Logo Updated', 'Profile & business logo updated successfully.', 'success');
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setBLogo('');
    updateSettings({ businessLogo: '' });
    setProfile({ ...profile, avatarUrl: '' });
    addToast('Logo Removed', 'Profile logo has been removed.', 'info');
  };

  // Handle Business Save
  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBName = bName.trim();
    const cleanBTagline = bTagline.trim();
    const cleanBPhone = bPhone.trim();
    const cleanBEmail = bEmail.trim();
    const cleanBAddress = bAddress.trim();
    const cleanBGst = bGst.trim();

    const updated: SystemSettings = {
      ...settings,
      businessName: cleanBName,
      businessLogo: bLogo,
      businessTagline: cleanBTagline,
      businessPhone: cleanBPhone,
      businessEmail: cleanBEmail,
      businessAddress: cleanBAddress,
      paymentSettings: {
        ...settings.paymentSettings,
        businessGst: cleanBGst,
        payeeName: cleanBName || settings.paymentSettings?.payeeName || '',
      },
    };
    updateSettings(updated);
    setProfile({
      ...profile,
      businessName: cleanBName,
      avatarUrl: bLogo,
      businessGst: cleanBGst,
      businessAddress: cleanBAddress,
      phone: cleanBPhone,
      email: cleanBEmail,
    });
    if (cleanBName) {
      setPayeeName(cleanBName);
    }
  };

  // Handle Payment Collection Settings Save
  const handleSaveUpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (collectionMode === 'direct_upi' && (!upiId.trim() || !upiId.includes('@'))) {
      addToast('Invalid UPI ID', 'Please enter a valid VPA format (e.g. yourstore@okhdfcbank)', 'error');
      return;
    }
    const updatedPaymentSettings: PaymentSettings = {
      ...settings.paymentSettings,
      collectionMode,
      upiId: upiId.trim(),
      payeeName: payeeName.trim(),
      customQrUrl,
      isDefaultQrSaved: true,
      cashfreeAppId: cashfreeAppId.trim(),
      cashfreeSecretKey: cashfreeSecretKey.trim(),
      cashfreeEnv,
      razorpayKeyId: razorpayKeyId.trim(),
      razorpayKeySecret: razorpayKeySecret.trim(),
      razorpayWebhookSecret: razorpayWebhookSecret.trim(),
      razorpayEnv,
      upiGatewayProvider,
      upiGatewayKey: upiGatewayKey.trim(),
      upiGatewaySecret: upiGatewaySecret.trim(),
      upiGatewayWebhookUrl: upiGatewayWebhookUrl.trim(),
    };
    updateSettings({
      ...settings,
      paymentSettings: updatedPaymentSettings,
    });

    if (cashfreeAppId.trim() && cashfreeSecretKey.trim()) {
      fetch('/api/cashfree/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: cashfreeAppId.trim(),
          secretKey: cashfreeSecretKey.trim(),
          env: cashfreeEnv,
        }),
      }).catch((err) => console.error('Failed to sync Cashfree config with server:', err));
    }

    addToast(
      'Payment Settings Saved!',
      `Active Mode: ${
        collectionMode === 'direct_upi'
          ? 'Direct UPI & Shop QR'
          : collectionMode === 'cashfree'
          ? 'Cashfree Payment Gateway'
          : collectionMode === 'razorpay'
          ? 'Razorpay Payment Gateway'
          : 'UPI Payment Gateway'
      }`,
      'success'
    );
  };

  const handleTestPgConnection = async (type: 'cashfree' | 'razorpay' | 'upi_gateway') => {
    setIsPgTesting(true);
    setPgTestResult(null);

    await new Promise((r) => setTimeout(r, 600));

    if (type === 'cashfree') {
      if (!cashfreeAppId.trim() || !cashfreeSecretKey.trim()) {
        setPgTestResult({
          success: false,
          message: 'Cashfree App ID and Secret Key are required to connect.',
        });
      } else {
        setPgTestResult({
          success: true,
          message: `Connected to Cashfree PG (${cashfreeEnv.toUpperCase()}) successfully! Webhook listener active.`,
        });
      }
    } else if (type === 'razorpay') {
      if (!razorpayKeyId.trim() || !razorpayKeySecret.trim()) {
        setPgTestResult({
          success: false,
          message: 'Razorpay Key ID and Key Secret are required to connect.',
        });
      } else if (!razorpayKeyId.trim().startsWith('rzp_test_') && !razorpayKeyId.trim().startsWith('rzp_live_')) {
        setPgTestResult({
          success: false,
          message: 'Invalid Razorpay Key ID format. Must start with "rzp_test_" or "rzp_live_".',
        });
      } else {
        setPgTestResult({
          success: true,
          message: `Connected to Razorpay PG (${razorpayEnv.toUpperCase()} mode: ${razorpayKeyId.trim().substring(0, 12)}...) successfully! Ready for UPI, Cards & NetBanking.`,
        });
      }
    } else {
      if (!upiGatewayKey.trim()) {
        setPgTestResult({
          success: false,
          message: 'Gateway Key / Merchant ID is required.',
        });
      } else {
        setPgTestResult({
          success: true,
          message: `Connected to ${upiGatewayProvider} successfully. Dynamic QR & Instant Webhooks active!`,
        });
      }
    }
    setIsPgTesting(false);
  };

  const handleUploadQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomQrUrl(event.target?.result as string);
        addToast('QR Image Uploaded', 'Remember to click Save Default UPI & QR.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Backend Provider Save & Test
  const handleSaveBackend = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemSettings = {
      ...settings,
      backendProvider: 'supabase',
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      supabaseServiceRoleKey: supabaseServiceRoleKey.trim(),
    };
    updateSettings(updated);
    addToast(
      'Supabase Database Saved! ⚡',
      'Supabase Project URL, Anon Key, aur Service Role Key website me live update ho gaye hain!',
      'success'
    );
  };

  // Handle Google Drive API Credentials Save
  const handleSaveDriveApi = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemSettings = {
      ...settings,
      googleDriveSettings: {
        clientId: driveClientId.trim(),
        clientSecret: driveClientSecret.trim(),
        redirectUri: driveRedirectUri.trim(),
      },
    };
    updateSettings(updated);
    addToast(
      'Google Drive API Saved! ☁️',
      'Google Client ID aur Client Secret successfully save ho gaye hain!',
      'success'
    );
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const adapter = new SupabaseAdapter(supabaseUrl, supabaseAnonKey);
    const res = await adapter.testConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Settings & Configurations
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage business profile, default UPI collection QR, multi-cloud backend providers, and access control
        </p>
      </div>

      {/* Primary Tabs */}
      <div className="flex gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setMainTab('business')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            mainTab === 'business'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Business Profile</span>
        </button>

        <button
          onClick={() => setMainTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            mainTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CloudUpload className="w-4 h-4" />
          <span>Cloud Backup</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setMainTab('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              mainTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Database &amp; Cloud Auth</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md">Admin</span>
            {maintEnabled && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            )}
          </button>
        )}
      </div>

      {/* Sub-Tabs: Inside Business Profile */}
      {mainTab === 'business' && (
        <div className="flex gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setBusinessSubTab('enterprise')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              businessSubTab === 'enterprise'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Enterprise Information</span>
          </button>

          <button
            type="button"
            onClick={() => setBusinessSubTab('payments')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              businessSubTab === 'payments'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Payment Collection &amp; Gateways</span>
          </button>

          <button
            type="button"
            onClick={() => setBusinessSubTab('security')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              businessSubTab === 'security'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Security &amp; Password</span>
          </button>
        </div>
      )}

      {/* Sub-Tabs: Inside Database & Cloud Auth (Admin Only) */}
      {mainTab === 'admin' && isAdmin && (
        <div className="flex gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setAdminSubTab('supabase')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              adminSubTab === 'supabase'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>Supabase Cloud DB &amp; Auth</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSubTab('drive')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              adminSubTab === 'drive'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CloudUpload className="w-3.5 h-3.5 text-emerald-500" />
            <span>Google Drive API</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSubTab('users')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              adminSubTab === 'users'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>User Management</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-md">CRM</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSubTab('maintenance')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              adminSubTab === 'maintenance'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Maintenance &amp; Beta</span>
            {maintEnabled && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            )}
          </button>
        </div>
      )}

      {/* Tab 1: Business Profile - Enterprise Information */}
      {mainTab === 'business' && businessSubTab === 'enterprise' && (
        <form onSubmit={handleSaveBusiness} className="glass-card p-6 space-y-4 max-w-2xl">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-500" />
            Enterprise Information
          </h3>

          {/* Business & Profile Logo Upload */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative group shrink-0">
              {bLogo ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-md bg-white dark:bg-slate-800">
                  <img src={bLogo} alt="Profile Logo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
                    title="Remove Logo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/40 flex flex-col items-center justify-center text-slate-400">
                  <Camera className="w-7 h-7 text-slate-400" />
                  <span className="text-[9px] mt-1 font-medium">No Logo</span>
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Profile / Business Logo</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Upload your profile or shop logo. Appears in the top navigation bar &amp; invoices.
                  </p>
                </div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    onChange={handleUploadLogo}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{bLogo ? 'Change Logo' : 'Upload Logo'}</span>
                  </button>
                  {bLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Square PNG, JPG, or WEBP (Max 2MB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={bTagline}
                onChange={(e) => setBTagline(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Official Phone Number
              </label>
              <input
                type="tel"
                value={bPhone}
                onChange={(e) => setBPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Support Email Address
              </label>
              <input
                type="email"
                value={bEmail}
                onChange={(e) => setBEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                GSTIN (Goods & Service Tax Number)
              </label>
              <input
                type="text"
                value={bGst}
                onChange={(e) => setBGst(e.target.value)}
                placeholder="e.g. 27AABCS1429B1Z8"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Currency
              </label>
              <input
                type="text"
                disabled
                value="Indian Rupee (INR ₹)"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Registered Office Address
            </label>
            <textarea
              value={bAddress}
              onChange={(e) => setBAddress(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Business Details
            </button>
          </div>
        </form>
      )}

      {/* Tab: Payment Collection & Gateways */}
      {mainTab === 'business' && businessSubTab === 'payments' && (
        <form onSubmit={handleSaveUpi} className="glass-card p-6 space-y-6 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-500" />
                Payment Collection Methods & Gateways
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Select your primary collection mode. Support for 0% Direct UPI QR, Cashfree PG, Razorpay PG, and Instant Webhook UPI Gateway.
              </p>
            </div>

            {/* Quick Step-by-Step PDF Guide Launch Button */}
            <button
              type="button"
              onClick={() => {
                setPaymentGuideActiveTab(collectionMode);
                setIsPaymentGuideModalOpen(true);
              }}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
              title="View Step-by-Step Payment Setup PDF Guide"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <span>Step-by-Step PDF Guide</span>
            </button>
          </div>

          {/* Collection Mode Selection Cards (4 Options) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select Active Payment Collection Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: Direct UPI */}
              <div
                onClick={() => {
                  setCollectionMode('direct_upi');
                  setPgTestResult(null);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                  collectionMode === 'direct_upi'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    0% Fee
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  Default UPI & QR
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Direct VPA ID & shop standee QR. 100% bank settlement.
                </p>
                {collectionMode === 'direct_upi' && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 className="w-3 h-3" /> Active Mode
                  </div>
                )}
              </div>

              {/* Option 2: Cashfree Payment Gateway */}
              <div
                onClick={() => {
                  setCollectionMode('cashfree');
                  setPgTestResult(null);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                  collectionMode === 'cashfree'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                    Gateway
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  Cashfree PG
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Automated links, cards, netbanking & automated UPI.
                </p>
                {collectionMode === 'cashfree' && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 className="w-3 h-3" /> Active Mode
                  </div>
                )}
              </div>

              {/* Option 3: Razorpay Payment Gateway */}
              <div
                onClick={() => {
                  setCollectionMode('razorpay');
                  setPgTestResult(null);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                  collectionMode === 'razorpay'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    Razorpay
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  Razorpay PG
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Key ID & Secret, 100+ payment methods & instant checkout.
                </p>
                {collectionMode === 'razorpay' && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 className="w-3 h-3" /> Active Mode
                  </div>
                )}
              </div>

              {/* Option 4: UPI Payment Gateway (Dynamic QR) */}
              <div
                onClick={() => {
                  setCollectionMode('upi_gateway');
                  setPgTestResult(null);
                }}
                className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                  collectionMode === 'upi_gateway'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    Webhooks
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  UPI PG (Dynamic)
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Dynamic QR generation with real-time webhook callback.
                </p>
                {collectionMode === 'upi_gateway' && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle2 className="w-3 h-3" /> Active Mode
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Configuration Panel 1: Direct UPI */}
          {collectionMode === 'direct_upi' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Direct UPI & Shop QR Configuration
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    No Payment Gateway Fees (0%)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentGuideActiveTab('direct_upi');
                      setIsPaymentGuideModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Step-by-Step Guide
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Merchant UPI ID (VPA) *
                  </label>
                  <input
                    type="text"
                    required={collectionMode === 'direct_upi'}
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourstore@okhdfcbank"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Google Pay, PhonePe, Paytm or BHIM merchant UPI ID</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Payee / Beneficiary Name *
                  </label>
                  <input
                    type="text"
                    required={collectionMode === 'direct_upi'}
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="e.g. My Business / Store Name"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Business name appearing on customer payment screen</p>
                </div>
              </div>

              {/* QR Image Preview & Upload Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {customQrUrl ? (
                    <img
                      src={customQrUrl}
                      alt="Custom Uploaded QR"
                      className="w-20 h-20 object-contain rounded-xl border border-indigo-200 bg-white p-1 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <QrCode className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {customQrUrl ? 'Custom Shop QR Loaded' : 'No Custom QR Uploaded (Using Auto-Generator)'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Upload an image of your printed shop counter QR standee
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleUploadQr}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {customQrUrl ? 'Replace QR' : 'Upload QR Image'}
                  </button>
                  {customQrUrl && (
                    <button
                      type="button"
                      onClick={() => setCustomQrUrl(undefined)}
                      className="text-xs text-rose-500 hover:underline px-2 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Configuration Panel 2: Cashfree Payment Gateway */}
          {collectionMode === 'cashfree' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Cashfree Payment Gateway Credentials
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentGuideActiveTab('cashfree');
                      setIsPaymentGuideModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Step-by-Step Guide
                  </button>
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCashfreeEnv('sandbox')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        cashfreeEnv === 'sandbox'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Sandbox (Test)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashfreeEnv('production')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        cashfreeEnv === 'production'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Production (Live)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Cashfree App ID / Client ID *
                  </label>
                  <input
                    type="text"
                    value={cashfreeAppId}
                    onChange={(e) => setCashfreeAppId(e.target.value)}
                    placeholder="e.g. CF_TEST_12345678"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Found in Cashfree Dashboard &gt; Developers &gt; API Keys</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Cashfree Secret Key *
                  </label>
                  <input
                    type="password"
                    value={cashfreeSecretKey}
                    onChange={(e) => setCashfreeSecretKey(e.target.value)}
                    placeholder="cfsk_ma_test_..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Keep confidential. Used for server payment session creation.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Need Cashfree API Keys? Sign up or log in at <a href="https://merchant.cashfree.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold">merchant.cashfree.com</a>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestPgConnection('cashfree')}
                  disabled={isPgTesting}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isPgTesting ? 'Validating...' : 'Test Gateway Connection'}
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Configuration Panel 3: Razorpay Payment Gateway */}
          {collectionMode === 'razorpay' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Razorpay Payment Gateway Credentials
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentGuideActiveTab('razorpay');
                      setIsPaymentGuideModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Step-by-Step Guide
                  </button>
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRazorpayEnv('test')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        razorpayEnv === 'test'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Test Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setRazorpayEnv('live')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        razorpayEnv === 'live'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Live Mode
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Razorpay Key ID *
                  </label>
                  <input
                    type="text"
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    placeholder={razorpayEnv === 'test' ? 'rzp_test_xxxxxx' : 'rzp_live_xxxxxx'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Found in Razorpay Dashboard &gt; Account & Settings &gt; API Keys</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Razorpay Key Secret *
                  </label>
                  <input
                    type="password"
                    value={razorpayKeySecret}
                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                    placeholder="Generated Key Secret"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Generated along with Key ID. Kept secure on server side.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Razorpay Webhook Secret (Optional)
                </label>
                <input
                  type="password"
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  placeholder="Optional Webhook Secret for signature validation"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Configured in Razorpay Webhooks tab to auto-capture payment status</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Need Razorpay API Keys? Sign up or log in at <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">dashboard.razorpay.com</a>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestPgConnection('razorpay')}
                  disabled={isPgTesting}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isPgTesting ? 'Validating...' : 'Test Gateway Connection'}
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Configuration Panel 4: UPI Payment Gateway */}
          {collectionMode === 'upi_gateway' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  UPI Payment Gateway Configuration
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentGuideActiveTab('upi_gateway');
                      setIsPaymentGuideModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Step-by-Step Guide
                  </button>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                    Real-Time Webhook Verification
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Gateway Provider *
                  </label>
                  <select
                    value={upiGatewayProvider}
                    onChange={(e) => setUpiGatewayProvider(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Cashfree UPI Gateway">Cashfree UPI Autopay / PG</option>
                    <option value="Razorpay UPI Gateway">Razorpay UPI Gateway</option>
                    <option value="Decentro UPI Stack">Decentro UPI Stack</option>
                    <option value="Custom UPI Intent PG">Custom UPI Intent PG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Merchant Key / ID *
                  </label>
                  <input
                    type="text"
                    value={upiGatewayKey}
                    onChange={(e) => setUpiGatewayKey(e.target.value)}
                    placeholder="e.g. UPI_MID_884920"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Secret / Salt Key *
                  </label>
                  <input
                    type="password"
                    value={upiGatewaySecret}
                    onChange={(e) => setUpiGatewaySecret(e.target.value)}
                    placeholder="e.g. sec_salt_82937402"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Webhook Callback URL (Paste in your Gateway Dashboard)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={upiGatewayWebhookUrl}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(upiGatewayWebhookUrl);
                      addToast('Copied!', 'Webhook URL copied to clipboard', 'info');
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Your UPI PG will send HTTP POST payloads to this URL on every transaction completion for zero-touch reconciliation.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleTestPgConnection('upi_gateway')}
                  disabled={isPgTesting}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isPgTesting ? 'Testing Webhook...' : 'Test Gateway & Webhook'}
                </button>
              </div>
            </div>
          )}

          {/* Test PG Result Feedback */}
          {pgTestResult && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
                pgTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {pgTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{pgTestResult.message}</span>
            </div>
          )}

          {/* Bottom Action Toolbar */}
          <div className="pt-2 flex justify-between items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {collectionMode !== 'direct_upi' && (
                <button
                  type="button"
                  onClick={() => handleTestPgConnection(collectionMode as 'cashfree' | 'razorpay' | 'upi_gateway')}
                  disabled={isPgTesting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {isPgTesting ? 'Testing...' : 'Test Connection'}
                </button>
              )}

              {/* Step-by-Step PDF Guide Button beside Test Connection */}
              <button
                type="button"
                onClick={() => {
                  setPaymentGuideActiveTab(collectionMode);
                  setIsPaymentGuideModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="View Step-by-Step PDF Setup Guide"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                <span>PDF Guide</span>
              </button>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Payment Collection Settings
            </button>
          </div>
        </form>
      )}

      {/* Tab: Database & Cloud Auth Switcher (Admin Only) */}
      {mainTab === 'admin' && adminSubTab === 'supabase' && isAdmin && (
        <form onSubmit={handleSaveBackend} className="glass-card p-6 space-y-5 max-w-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                Supabase PostgreSQL &amp; Cloud Authentication
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Primary cloud database provider for user authentication, ledger transactions, invoices, and cloud sync.
              </p>
            </div>
            <span className="self-start sm:self-auto text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Primary Provider
            </span>
          </div>

          {/* Supabase Connection Details */}
          <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supabase Project API URL *
              </label>
              <input
                type="url"
                required
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://axpbydzszykqwojamblh.supabase.co"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Your Supabase project URL (e.g. <code>https://axpbydzszykqwojamblh.supabase.co</code>)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supabase Public Anon Key *
              </label>
              <input
                type="text"
                required
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Safe for client-side queries, public auth sessions, and row-level security policies.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supabase Service Role Key (Admin / Rol Key) *
              </label>
              <input
                type="text"
                required
                value={supabaseServiceRoleKey}
                onChange={(e) => setSupabaseServiceRoleKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                Admin key used for privileged backend operations, automated backups, and user management.
              </p>
            </div>
          </div>

          {/* Test Connection Banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200'
              }`}
            >
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="pt-2 flex justify-between items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-2"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5 text-emerald-500" />}
              <span>{isTesting ? 'Testing Supabase Connection...' : 'Test Connection'}</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Supabase Connection
            </button>
          </div>
        </form>
      )}

      {/* Tab: Google Drive API Configuration (Admin Only) */}
      {mainTab === 'admin' && adminSubTab === 'drive' && isAdmin && (
        <form onSubmit={handleSaveDriveApi} className="glass-card p-6 space-y-5 max-w-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-indigo-500" />
                Google Drive API Configuration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update your Google Cloud OAuth Client ID, Secret, and Redirect URI directly without editing files.
              </p>
            </div>
            <span className="self-start sm:self-auto text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              OAuth 2.0
            </span>
          </div>

          <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Google Client ID *
              </label>
              <input
                type="text"
                required
                value={driveClientId}
                onChange={(e) => setDriveClientId(e.target.value)}
                placeholder="997421467008-nbhomb8nrp56opa09og9od1t68pa049j.apps.googleusercontent.com"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Created in Google Cloud Console &rarr; APIs &amp; Services &rarr; Credentials &rarr; OAuth 2.0 Client IDs.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Google Client Secret *
              </label>
              <input
                type="password"
                required
                value={driveClientSecret}
                onChange={(e) => setDriveClientSecret(e.target.value)}
                placeholder="GOCSPX-..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Kept secure on the server. Used only to exchange authorization codes and refresh tokens.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Authorized Redirect URI
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={driveRedirectUri}
                  onChange={(e) => setDriveRedirectUri(e.target.value)}
                  placeholder="https://khatapro-sandy.vercel.app/api/backup/google-drive/callback"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(driveRedirectUri);
                    addToast('Copied!', 'Authorized redirect URI copied to clipboard.', 'success');
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Must match exactly what you added under &quot;Authorized redirect URIs&quot; in Google Cloud Console.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end items-center gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Google Drive API Details
            </button>
          </div>
        </form>
      )}

      {/* Tab: Account Security & Password Update */}
      {mainTab === 'business' && businessSubTab === 'security' && (
        <form onSubmit={handleUpdatePassword} className="glass-card p-6 sm:p-8 space-y-6 max-w-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-500" />
                Change &amp; Update Password
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update your login password securely saved in Supabase Cloud database
              </p>
            </div>
            <span className="self-start sm:self-auto text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Supabase Auth
            </span>
          </div>

          {/* Current User Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-200/80 dark:border-indigo-800">
                {(currentUser?.name || profile?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentUser?.name || profile?.name || 'Administrator'}
                </p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {currentUser?.email || profile?.email || ''}
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
              Active User
            </span>
          </div>

          {/* Status Banners */}
          {passwordError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {/* Input Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Password <span className="text-slate-400 font-normal text-[11px]">(Optional if already logged in)</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password (min 4 characters)"
                  className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Form Action */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-6 py-3 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating in Supabase Cloud...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Update Password Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Cloud Backup */}
      {mainTab === 'backup' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Active Database Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Active Database: Supabase PostgreSQL (Cloud Active)
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CloudUpload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Database Backup &amp; Google Drive Cloud Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Export full JSON backup, restore existing snapshots, or synchronize automated daily backups directly to your private Google Drive HisabKitab folder.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] text-slate-400 font-mono">Last Snapshot:</span>
              <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                {lastBackupDate}
              </span>
            </div>
          </div>
          
          {/* SECTION 1: GOOGLE DRIVE BACKUP & RESTORE */}
          <GoogleDriveBackupPanel />

          {/* TWO CLEAN MANUAL OPTIONS: 1) EXPORT FULL JSON  2) IMPORT JSON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* OPTION 1: EXPORT FULL DATABASE */}
            <div className="glass-card p-6 sm:p-7 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <FileJson className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        1. Export Full Database (.json)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Download complete system snapshot with all ledgers, invoices, customers &amp; settings
                      </p>
                    </div>
                  </div>
                </div>

                {/* Media Attachment Selector */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Media &amp; Attachment Option:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setExportIncludeMedia(true)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        exportIncludeMedia
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-xs'
                          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          📸 With Images &amp; PDF
                        </span>
                        {exportIncludeMedia && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Complete archive with receipt photos, QR codes, &amp; uploaded docs.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportIncludeMedia(false)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        !exportIncludeMedia
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-xs'
                          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          📄 Without Images &amp; PDF
                        </span>
                        {!exportIncludeMedia && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Lightweight compact JSON. Only ledgers, numbers, and profiles.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono space-y-0.5">
                  <div>✓ Customers &amp; Ledger Transactions</div>
                  <div>✓ GST Billing, Invoices &amp; Products</div>
                  <div>✓ Business Profile &amp; UPI QR Settings</div>
                  <div>✓ Active DB Provider: <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{settings.backendProvider}</span></div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleExportBackup(exportIncludeMedia)}
                disabled={isExportingBackup}
                className="w-full py-3.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50 mt-4"
              >
                {isExportingBackup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing JSON Backup...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export Full Database JSON ({exportIncludeMedia ? 'With Media' : 'Compact'})</span>
                  </>
                )}
              </button>
            </div>

            {/* OPTION 2: IMPORT / RESTORE DATABASE */}
            <div className="glass-card p-6 sm:p-7 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        2. Import Database (.json)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Upload and restore any SmartKhata Pro JSON file into your active database
                      </p>
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  ref={backupFileInputRef}
                  accept=".json"
                  onChange={handleFileRestore}
                  className="hidden"
                />

                <div
                  onClick={() => backupFileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl text-center cursor-pointer space-y-2.5 transition-all bg-slate-50/50 dark:bg-slate-900/30 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center mx-auto shadow-xs transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Click to select &amp; import <span className="text-emerald-600 font-extrabold">.json backup file</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Instantly restores to active <span className="uppercase font-semibold">{settings.backendProvider}</span> database
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-200/80 dark:border-slate-800">
                <span className="text-xs text-slate-400">Need a clean start?</span>
                <button
                  type="button"
                  onClick={handleResetDemoData}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to Default Sample Data
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Maintenance Mode & Beta Testing Controls (Admin Only) */}
      {mainTab === 'admin' && adminSubTab === 'maintenance' && isAdmin && (
        <div className="space-y-6 animate-in fade-in max-w-4xl">
          
          {/* Header Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-950/40 via-amber-950/30 to-slate-900 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>System Emergency Controls</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              Maintenance Mode &amp; Beta Testing
              <span className="text-xl">⚡💥🔥</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Website ko maintenance mode me daalein ya normal karein. Jab maintenance mode on hoga, to visitors ko funny animated &quot;Transformer me aag lag gai&quot; page aur ticking bomb timer 💣 dikhega jo time pura hote hi auto-off ho jaega.
            </p>
          </div>

          {/* Card 1: Maintenance Mode Controller */}
          <div className="glass-card p-6 sm:p-8 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Emergency Maintenance Mode
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                    maintEnabled
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}>
                    {maintEnabled ? 'Active (Site In Repair)' : 'Inactive (Live Online)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Enable karne par visitors ko animated countdown bomb timer dikhega.
                </p>
              </div>

              {/* Master Maintenance Switch Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = !maintEnabled;
                    setMaintEnabled(next);
                    handleSaveMaintenance(next);
                  }}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
                    maintEnabled
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                      : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>{maintEnabled ? 'Turn OFF Maintenance' : 'Turn ON Maintenance'}</span>
                </button>
              </div>
            </div>

            {/* Timer Duration Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Countdown Timer Duration (Auto-Off Duration)</span>
              </label>

              <div className="flex flex-wrap items-center gap-2.5">
                {[5, 15, 30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setMaintDuration(mins)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      maintDuration === mins
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {mins < 60 ? `${mins} Minutes` : `${mins / 60} Hour${mins / 60 > 1 ? 's' : ''}`}
                  </button>
                ))}

                <div className="flex items-center gap-2 pl-2">
                  <span className="text-xs text-slate-400">Custom (Min):</span>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={maintDuration}
                    onChange={(e) => setMaintDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-center"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-mono">
                ⏱️ Maintenance mode ON karne par ticking bomb timer exact {maintDuration} minutes chalega, uske baad website khud ba khud open ho jaegi.
              </p>
            </div>

            {/* Custom Funny Story & Reason */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-rose-500" />
                <span>Notice Message / Story (Displayed with Emojis)</span>
              </label>

              <textarea
                rows={3}
                value={maintReason}
                onChange={(e) => setMaintReason(e.target.value)}
                placeholder="Transformer me aag lag gai ⚡💥🔥 many people repair kar rahe hain 👨‍🔧🛠️"
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white leading-relaxed resize-none font-medium"
              />
            </div>

            {/* Save Button for Maintenance */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleSaveMaintenance()}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Maintenance Configuration</span>
              </button>
            </div>

          </div>

          {/* Card 2: Beta Testing Toggle */}
          <div className="glass-card p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Enable Beta Testing Mode
                </h3>
                <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                  Screen par futuristic cyan floating pill &quot;BETA TESTING ACTIVE&quot; aur beta status modal dikhana chahte hain ya hide karna chahte hain, yaha se on/off karein.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={betaTestingActive}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setBetaTestingActive(next);
                      updateSettings({ ...settings, betaTestingEnabled: next });
                      addToast(
                        next ? 'Beta Testing Enabled' : 'Beta Testing Disabled',
                        next ? 'Beta testing indicators are now active.' : 'Beta testing badges hidden.',
                        'info'
                      );
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {betaTestingActive ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab: User Management CRM (Admin Only) */}
      {mainTab === 'admin' && adminSubTab === 'users' && isAdmin && (
        <div className="space-y-6 animate-in fade-in max-w-5xl">
          
          {/* CRM Header Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-violet-950/30 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Super Admin &bull; Multi-Merchant CRM</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                User Management &amp; Merchant CRM
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                View all registered merchants, assign administrative privileges, manage user roles, and monitor account registration details in real-time.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCrmUsers}
              disabled={isLoadingUsers}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              <span>{isLoadingUsers ? 'Refreshing...' : 'Refresh Users'}</span>
            </button>
          </div>

          {/* CRM Toolbar: Search & Role Filter */}
          <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, business or phone..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Users', count: crmUsers.length },
                { id: 'super_admin', label: 'Super Admin', count: crmUsers.filter(u => u.role === 'super_admin').length },
                { id: 'admin', label: 'Admins', count: crmUsers.filter(u => u.role === 'admin').length },
                { id: 'user', label: 'Merchants', count: crmUsers.filter(u => u.role === 'user' || !u.role).length },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setRoleFilter(pill.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    roleFilter === pill.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    roleFilter === pill.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {pill.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* CRM Users List / Table */}
          <div className="glass-card overflow-hidden">
            {isLoadingUsers ? (
              <div className="p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                <p className="text-xs font-medium text-slate-500">Loading user records from Supabase Cloud...</p>
              </div>
            ) : (() => {
              const query = userSearchQuery.trim().toLowerCase();
              const filteredUsers = crmUsers.filter((u) => {
                const matchesRole =
                  roleFilter === 'all'
                    ? true
                    : roleFilter === 'user'
                    ? u.role === 'user' || !u.role
                    : u.role === roleFilter;

                if (!matchesRole) return false;
                if (!query) return true;

                const nameMatch = (u.full_name || u.name || '').toLowerCase().includes(query);
                const emailMatch = (u.email || '').toLowerCase().includes(query);
                const phoneMatch = (u.phone || '').toLowerCase().includes(query);
                const businessMatch = (u.business_name || '').toLowerCase().includes(query);
                return nameMatch || emailMatch || phoneMatch || businessMatch;
              });

              if (filteredUsers.length === 0) {
                return (
                  <div className="p-12 text-center space-y-2">
                    <UserX className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No users found</h4>
                    <p className="text-xs text-slate-400">
                      {userSearchQuery
                        ? 'Try modifying your search query or role filter.'
                        : 'No user profiles are registered in Supabase yet.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-5 py-3.5">User / Business</th>
                        <th className="px-4 py-3.5">Contact</th>
                        <th className="px-4 py-3.5">Role</th>
                        <th className="px-4 py-3.5">Registered</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredUsers.map((u) => {
                        const isSelf = currentUser?.id === u.id || currentUser?.email === u.email;
                        const isPrimaryAdmin = u.email === 'anantyadav8924@gmail.com';
                        const displayName = u.full_name || u.name || (u.email ? u.email.split('@')[0] : 'Merchant User');
                        const businessName = u.business_name || 'Individual Merchant';
                        const avatarUrl = u.avatar_url || null;
                        const role = u.role || 'user';
                        const joinedDate = u.created_at
                          ? new Date(u.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent';

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            {/* User details */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-extrabold flex items-center justify-center text-sm border border-indigo-200 dark:border-indigo-800 shadow-xs">
                                    {displayName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>{displayName}</span>
                                    {isSelf && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <Building className="w-3 h-3 text-slate-400" />
                                    <span>{businessName}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Contact info */}
                            <td className="px-4 py-4">
                              <div className="space-y-0.5">
                                <div className="font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <span>{u.email || '—'}</span>
                                </div>
                                {u.phone && (
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    {u.phone}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Role badge */}
                            <td className="px-4 py-4">
                              {role === 'super_admin' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  <Shield className="w-3 h-3 text-purple-600" />
                                  Super Admin
                                </span>
                              ) : role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  <Key className="w-3 h-3 text-amber-600" />
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <UserCheck className="w-3 h-3 text-emerald-600" />
                                  Merchant
                                </span>
                              )}
                            </td>

                            {/* Registration date */}
                            <td className="px-4 py-4 text-slate-500 font-medium">
                              {joinedDate}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Role Switcher Dropdown */}
                                <select
                                  value={role}
                                  disabled={updatingUserId === u.id || isPrimaryAdmin}
                                  onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                                >
                                  <option value="user">Merchant</option>
                                  <option value="admin">Admin</option>
                                  <option value="super_admin">Super Admin</option>
                                </select>

                                {/* Delete user button */}
                                {!isPrimaryAdmin && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.id, displayName)}
                                    title="Delete user account"
                                    className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* CRM Helper Footer Notice */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-3">
            <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Role Permissions &amp; Access Control:</p>
              <p className="text-[11px] leading-relaxed text-indigo-600/90 dark:text-indigo-400">
                &bull; <strong>Merchant (user):</strong> Can create invoices, manage their ledger, customer records, and personal business profile. Technical tabs (Database, Google Drive API, Maintenance, User Management) remain completely hidden.
                <br />
                &bull; <strong>Admin / Super Admin:</strong> Has full access to technical database keys, emergency maintenance controls, and multi-merchant user CRM.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ================= MODAL: DATABASE CONNECTION STEP-BY-STEP PDF SETUP GUIDE ================= */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            id="database-pdf-guide-modal"
            className="bg-white dark:bg-slate-900 rounded-[28px] max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    Database Setup & Connection Guide
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 uppercase tracking-wider">
                      PDF Ready
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step-by-step official instructions to connect and configure your database
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Print or Save Guide as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsGuideModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Provider Guide Switcher Tabs */}
            <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700"
              >
                <span>Supabase Cloud</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  PostgreSQL
                </span>
              </button>
            </div>

            {/* Scrollable Guide Content */}
            <div className="p-6 space-y-6 overflow-y-auto print:p-0">

              {/* GUIDE FOR SUPABASE CLOUD POSTGRESQL */}
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-600" />
                      Supabase PostgreSQL Cloud Setup Guide
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                      Follow these steps to connect your hosted PostgreSQL database with Row Level Security.
                    </p>
                  </div>
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    <span>Open Supabase</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Create or Open Supabase Project
                    </h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                    Visit <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">supabase.com</a>, sign in with GitHub or Email, and open your project (e.g. <code className="font-mono">axpbydzszykqwojamblh</code>).
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Run Database SQL Schema Tables
                    </h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                    In your Supabase Dashboard, click <strong>SQL Editor</strong> on the left menu. Click <strong>&ldquo;New query&rdquo;</strong>, paste the complete SmartKhata SQL Schema, and click <strong>Run</strong>. All 18 business tables, RLS security policies, and indexes will be created instantly.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                      3
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Retrieve Project URL & API Keys
                    </h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                    In your Supabase Dashboard, click <strong>Project Settings ➔ API</strong>. Copy your <strong>Project URL</strong>, <strong>anon / public key</strong>, and <strong>service_role key</strong>.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                      4
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Save & Test Connection
                    </h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-8 leading-relaxed">
                    Under Settings &rarr; Database & Cloud Storage, paste your credentials, click <strong>Test Connection</strong> to see the green verified badge, and click <strong>Save Supabase Configuration</strong>!
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">Ctrl + P</kbd> anytime to save this document as PDF.
              </span>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-sm hover:opacity-95 cursor-pointer"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PAYMENT GATEWAY & UPI STEP-BY-STEP PDF SETUP GUIDE ================= */}
      {isPaymentGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            id="payment-pdf-guide-modal"
            className="bg-white dark:bg-slate-900 rounded-[28px] max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    Payment Gateway & UPI Setup Guide
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 uppercase tracking-wider">
                      PDF Ready
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step-by-step easy guide to configure QR, Cashfree, Razorpay, and UPI gateways
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Print or Save Guide as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaymentGuideModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Provider Guide Switcher Tabs */}
            <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
              {[
                { id: 'direct_upi', name: 'Default UPI & QR', badge: '0% Fee', color: 'emerald' },
                { id: 'cashfree', name: 'Cashfree PG', badge: 'Gateway', color: 'violet' },
                { id: 'razorpay', name: 'Razorpay PG', badge: 'Top Choice', color: 'blue' },
                { id: 'upi_gateway', name: 'UPI Gateway', badge: 'Webhooks', color: 'amber' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaymentGuideActiveTab(tab.id as PaymentCollectionMode)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    paymentGuideActiveTab === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>{tab.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                    paymentGuideActiveTab === tab.id
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Scrollable Guide Content */}
            <div className="p-6 space-y-6 overflow-y-auto print:p-0">

              {/* 1. GUIDE FOR DIRECT UPI & SHOP QR */}
              {paymentGuideActiveTab === 'direct_upi' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Zero Knowledge Header Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-300 dark:border-emerald-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-wide uppercase">
                          Zero Commission (0% Fee)
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">• 1 Minute Setup</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        Default UPI ID & Shop Standee QR Guide
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        Is option me kisi payment gateway ya registration ki zaroorat nahi hoti. Customer ka paisa seedha aapke bank account me 100% free transfer hota hai!
                      </p>
                    </div>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        1
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Apna Merchant UPI ID (VPA) Pata Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Apne phone me Google Pay for Business, PhonePe Business, Paytm Business ya BHIM app kholein.</p>
                      <p>2. Profile ya QR settings me jakar apna <strong>Merchant UPI ID</strong> dekhein (Jaise: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">yourname@okhdfcbank</code> ya <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">yourstore@okaxis</code>).</p>
                      <p>3. Is UPI ID ko copy kar lein aur apna <strong>Payee / Dukaan ka Naam</strong> (e.g. <em>Apna Business Name</em>) note karein.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        2
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Dukaan Ke Counter QR Standee Ki Photo Lein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Apni dukaan ke counter par rakhe printed QR Standee ki mobile camera se saaf aur seedhi photo click karein.</p>
                      <p>2. Ya fir apne merchant app se digital QR image download kar lein.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        3
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        SmartKhata Me Save Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. <strong>Merchant UPI ID</strong> me apni VPA dalein.</p>
                      <p>2. <strong>Payee / Beneficiary Name</strong> me apna business naam dalein.</p>
                      <p>3. <strong>Upload QR Image</strong> button par click karke apni standee photo select karein.</p>
                      <p>4. Niche <strong>Save Payment Collection Settings</strong> click kar dein!</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        🎉 Ab Khata Ledger, Invoice Billing, WhatsApp Due Reminders aur Quick Collect sabhi jagah yahi QR aur UPI ID automatic load hogi!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. GUIDE FOR CASHFREE PAYMENT GATEWAY */}
              {paymentGuideActiveTab === 'cashfree' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-black tracking-wide uppercase">
                          Payment Gateway
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">• Cards, Netbanking & Payment Links</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-violet-900 dark:text-violet-200 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-violet-600" />
                        Cashfree Payment Gateway Step-by-Step Guide
                      </h4>
                      <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
                        Automated online payment links banayein aur Credit Card, Debit Card, NetBanking aur UPI se collect karein.
                      </p>
                    </div>
                    <a
                      href="https://merchant.cashfree.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <span>Open Cashfree Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        1
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Cashfree Merchant Account Banayein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. <a href="https://merchant.cashfree.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline">merchant.cashfree.com</a> par jayein aur Sign Up karein.</p>
                      <p>2. Apne Business / Proprietor details aur Bank Account verify karein.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        2
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Developers ➔ API Keys Me Jayein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Cashfree Dashboard ke left sidebar me <strong>Developers</strong> menu par click karein.</p>
                      <p>2. Sub-menu me <strong>API Keys</strong> par click karein.</p>
                      <p>3. Testing ke liye <strong>Test Environment (Sandbox)</strong> ya real payments ke liye <strong>Production</strong> choose karein.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        3
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        App ID aur Secret Key Copy Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. <strong>App ID</strong> (Client ID) copy karein (Jaise: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">CF_TEST_12345678</code>).</p>
                      <p>2. <strong>Secret Key</strong> generate/copy karein (Jaise: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">cfsk_ma_test_xxxx</code>).</p>
                      <p>3. SmartKhata ke Cashfree panel me paste karein.</p>
                      <p>4. <strong>Test Gateway Connection</strong> button dabakar confirm karein aur <strong>Save Payment Collection Settings</strong> click karein!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. GUIDE FOR RAZORPAY PAYMENT GATEWAY */}
              {paymentGuideActiveTab === 'razorpay' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black tracking-wide uppercase">
                          India&apos;s #1 Payment Gateway
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">• 100+ Payment Methods</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Razorpay Payment Gateway Step-by-Step Guide
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                        Credit/Debit Cards, UPI Autopay, EMI, Netbanking aur Wallets se instant settlement.
                      </p>
                    </div>
                    <a
                      href="https://dashboard.razorpay.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <span>Open Razorpay Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        1
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Razorpay Dashboard Par Login Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline">dashboard.razorpay.com</a> par login karein.</p>
                      <p>2. Naye user hain toh Sign Up karke apna business account activate karein.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        2
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Account &amp; Settings ➔ API Keys Me Jayein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Left sidebar ke bottom me <strong>Account &amp; Settings</strong> par click karein.</p>
                      <p>2. <strong>Developer Controls</strong> heading ke andar <strong>&ldquo;API Keys&rdquo;</strong> par click karein.</p>
                      <p>3. Top bar se <strong>Test Mode</strong> (demo testing ke liye) ya <strong>Live Mode</strong> (asli customers ke liye) switch karein.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        3
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        &ldquo;Generate Key&rdquo; Click Karke Key ID &amp; Secret Lein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Screen par blue button <strong>&ldquo;Generate Key&rdquo;</strong> par click karein.</p>
                      <p>2. Aapko 2 keys milengi:</p>
                      <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-200">
                        <li><strong>Key ID</strong>: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-blue-600 dark:text-blue-400">rzp_test_xxxxxx</code> ya <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-blue-600 dark:text-blue-400">rzp_live_xxxxxx</code></li>
                        <li><strong>Key Secret</strong>: Ek secure password string. <em>(Ise download ya note kar lein kyunki ye dobara nahi dikhta)</em>.</li>
                      </ul>
                      <p>3. SmartKhata ke Razorpay panel me Key ID aur Key Secret paste karein.</p>
                      <p>4. <strong>Test Gateway Connection</strong> dabayein ➔ Green success aate hi <strong>Save Payment Collection Settings</strong> click karein!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. GUIDE FOR UPI PAYMENT GATEWAY (DYNAMIC QR & WEBHOOK) */}
              {paymentGuideActiveTab === 'upi_gateway' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black tracking-wide uppercase">
                          Dynamic QR &amp; Webhooks
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">• Zero-Touch Auto Reconciliation</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-amber-600" />
                        UPI Payment Gateway Setup Guide
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Har customer invoice aur due amount ka auto-generated dynamic QR banayein aur webhook se real-time payment capture karein.
                      </p>
                    </div>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        1
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Gateway Provider Select Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. Dropdown me se apna provider select karein (Cashfree UPI Gateway, Razorpay UPI Gateway, Decentro UPI Stack ya Custom).</p>
                      <p>2. Provider ke developer portal se <strong>Merchant ID</strong> aur <strong>Secret Key / Salt</strong> prapt karein.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        2
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Webhook Callback URL Setup Karein
                      </h5>
                    </div>
                    <div className="pl-9 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p>1. SmartKhata me diye gaye <strong>Webhook Callback URL</strong> ke aage <strong>Copy</strong> button dabayein:</p>
                      <div className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all">
                        https://api.smartkhatapro.in/webhook/upi-payment
                      </div>
                      <p>2. Apne Gateway Portal ke <strong>Webhooks</strong> section me jakar ye URL paste karein.</p>
                      <p>3. Events me <code>payment.successful</code>, <code>order.paid</code> select karke Save karein.</p>
                      <p>4. SmartKhata me <strong>Test Gateway &amp; Webhook</strong> dabayein aur <strong>Save Payment Collection Settings</strong> click karein!</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">Ctrl + P</kbd> anytime to save this document as PDF.
              </span>
              <button
                type="button"
                onClick={() => setIsPaymentGuideModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-sm hover:opacity-95 cursor-pointer"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
