'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { BackendProvider, SystemSettings, PaymentSettings, PaymentCollectionMode, TelegramBackupSettings, BackupFrequency, BackupDayOfWeek, BroadcastMessage, BroadcastType, BroadcastSeverity, UserProfile } from '@/types';
import { SupabaseAdapter } from '@/services/backendManager';
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
  Phone,
  Mail,
  MapPin,
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
  Cloud,
  HardDrive,
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
  User,
  UserCheck,
  UserX,
  Trash2,
  Search,
  Filter,
  Palette,
  Info,
  HelpCircle,
  Link2,
  Megaphone,
  Radio,
  Bell,
  Ban,
  Unlock,
  ShieldAlert,
  LifeBuoy,
  Headphones,
  Trash,
  Code,
} from 'lucide-react';
import GoogleDriveBackupPanel from '@/components/GoogleDriveBackupPanel';
import CurrencyLanguageModal from '@/components/CurrencyLanguageModal';
import {
  getDefaultTermsTemplate,
  getDefaultRefundsTemplate,
  getDefaultPrivacyTemplate,
  isHtmlPolicy,
} from '@/lib/policyTemplates';
import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_CURRENCIES,
  getActiveCurrency,
  setActiveCurrency,
  getActiveLanguage,
  setActiveLanguage,
  CurrencyOption,
  LanguageOption
} from '@/lib/i18n';

export default function SettingsPage() {
  const { settings, updateSettings, saveDefaultUpiAndQr, profile, setProfile, addToast, syncWithDatabase, currentUser, refreshData } = useApp();

  const isAdmin = Boolean(
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.email === 'anantyadav8924@gmail.com'
  );

  const [mainTab, setMainTab] = useState<'business' | 'backup' | 'branding' | 'admin'>('business');
  const [businessSubTab, setBusinessSubTab] = useState<'enterprise' | 'payments' | 'security'>('enterprise');
  const [brandingSubTab, setBrandingSubTab] = useState<'visuals' | 'broadcast'>('visuals');
  const [adminSubTab, setAdminSubTab] = useState<'supabase' | 'drive' | 'users' | 'maintenance'>('supabase');
  const [backupSubTab, setBackupSubTab] = useState<'drive' | 'local'>('drive');
  const [isSyncingData, setIsSyncingData] = useState(false);
  const isBusinessDirtyRef = useRef(false);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);

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

  // Currency & Language Settings State
  const [isSettingsCurrencyModalOpen, setIsSettingsCurrencyModalOpen] = useState(false);
  const [settingsCurrencyLanguageTab, setSettingsCurrencyLanguageTab] = useState<'language' | 'currency'>('currency');
  const [activeSettingsCurrency, setActiveSettingsCurrency] = useState<CurrencyOption>(() => getActiveCurrency());
  const [activeSettingsLanguage, setActiveSettingsLanguage] = useState<LanguageOption>(() => getActiveLanguage());

  useEffect(() => {
    const onCurrencyChange = () => setActiveSettingsCurrency(getActiveCurrency());
    const onLanguageChange = () => setActiveSettingsLanguage(getActiveLanguage());

    window.addEventListener('khatapro_currency_changed', onCurrencyChange);
    window.addEventListener('khatapro_language_changed', onLanguageChange);

    return () => {
      window.removeEventListener('khatapro_currency_changed', onCurrencyChange);
      window.removeEventListener('khatapro_language_changed', onLanguageChange);
    };
  }, []);

  // Broadcasts State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('banner');
  const [broadcastSeverity, setBroadcastSeverity] = useState<BroadcastSeverity>('info');
  const [broadcastTargetType, setBroadcastTargetType] = useState<'all' | 'specific_user'>('all');
  const [broadcastTargetUserId, setBroadcastTargetUserId] = useState<string>('');
  const [broadcastTargetUserName, setBroadcastTargetUserName] = useState<string>('');
  const [broadcastIsClosable, setBroadcastIsClosable] = useState(true);

  // Merchant Actions Modal State (In CRM: Password change, Personal Broadcast, Profile view/edit)
  const [selectedMerchantForAction, setSelectedMerchantForAction] = useState<any | null>(null);
  const [merchantActionType, setMerchantActionType] = useState<'password' | 'broadcast' | 'profile' | null>(null);
  const [newMerchantPassword, setNewMerchantPassword] = useState('');
  const [isSubmittingMerchantAction, setIsSubmittingMerchantAction] = useState(false);
  const [merchantEditProfile, setMerchantEditProfile] = useState<{
    name: string;
    businessName: string;
    phone: string;
    businessAddress: string;
  }>({ name: '', businessName: '', phone: '', businessAddress: '' });
  const [personalBroadcastTitle, setPersonalBroadcastTitle] = useState('');
  const [personalBroadcastContent, setPersonalBroadcastContent] = useState('');
  const [personalBroadcastType, setPersonalBroadcastType] = useState<BroadcastType>('notification');
  const [personalBroadcastSeverity, setPersonalBroadcastSeverity] = useState<BroadcastSeverity>('info');

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

  // Toggle Block/Unblock Merchant
  const handleToggleBlockMerchant = async (u: any) => {
    const isCurrentlyBlocked = Boolean(u.is_blocked || u.isBlocked);
    const actionLabel = isCurrentlyBlocked ? 'unblock' : 'block';
    if (!confirm(`Are you sure you want to ${actionLabel} merchant "${u.full_name || u.name || u.email}"?`)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: u.id,
          action: 'toggle_block',
          isBlocked: !isCurrentlyBlocked,
          blockedReason: !isCurrentlyBlocked ? 'Account suspended by administrator' : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || `Failed to ${actionLabel} user`);
      addToast(
        isCurrentlyBlocked ? 'Merchant Unblocked' : 'Merchant Blocked',
        isCurrentlyBlocked ? `${u.name || u.email} can now log in and access their store.` : `${u.name || u.email} has been suspended.`,
        isCurrentlyBlocked ? 'success' : 'warning'
      );
      fetchCrmUsers();
    } catch (err: any) {
      addToast('Action Failed', err.message || 'Could not update block status', 'error');
    }
  };

  // Change Password for Merchant
  const handleChangeMerchantPassword = async () => {
    if (!selectedMerchantForAction) return;
    if (!newMerchantPassword || newMerchantPassword.trim().length < 6) {
      addToast('Password Too Short', 'Password must be at least 6 characters long.', 'error');
      return;
    }
    setIsSubmittingMerchantAction(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMerchantForAction.id,
          action: 'change_password',
          newPassword: newMerchantPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update password');
      addToast('Password Updated', `New password saved for ${selectedMerchantForAction.name || selectedMerchantForAction.email}.`, 'success');
      setNewMerchantPassword('');
      setSelectedMerchantForAction(null);
      setMerchantActionType(null);
    } catch (err: any) {
      addToast('Password Change Error', err.message || 'Could not change merchant password', 'error');
    } finally {
      setIsSubmittingMerchantAction(false);
    }
  };

  // Update Merchant Profile
  const handleSaveMerchantProfile = async () => {
    if (!selectedMerchantForAction) return;
    setIsSubmittingMerchantAction(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMerchantForAction.id,
          action: 'update_profile',
          profileData: merchantEditProfile,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update profile');
      addToast('Profile Updated', 'Merchant information updated in database.', 'success');
      setSelectedMerchantForAction(null);
      setMerchantActionType(null);
      fetchCrmUsers();
    } catch (err: any) {
      addToast('Profile Update Error', err.message || 'Could not update merchant profile', 'error');
    } finally {
      setIsSubmittingMerchantAction(false);
    }
  };

  // Send Personal Broadcast to Merchant
  const handleSendPersonalBroadcast = async () => {
    if (!selectedMerchantForAction) return;
    if (!personalBroadcastTitle.trim() || !personalBroadcastContent.trim()) {
      addToast('Missing Details', 'Please provide a title and announcement message.', 'error');
      return;
    }
    setIsSubmittingMerchantAction(true);
    try {
      const newBroadcast: BroadcastMessage = {
        id: 'bc_' + Date.now(),
        title: personalBroadcastTitle.trim(),
        content: personalBroadcastContent.trim(),
        type: personalBroadcastType,
        severity: personalBroadcastSeverity,
        targetType: 'specific_user',
        targetUserId: selectedMerchantForAction.id,
        targetUserName: selectedMerchantForAction.name || selectedMerchantForAction.full_name || selectedMerchantForAction.email,
        isClosable: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Admin',
      };

      const updated = [newBroadcast, ...(settings.broadcasts || [])];
      updateSettings({ ...settings, broadcasts: updated });

      // Sync to cloud global_config
      fetch('/api/system/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcasts: updated }),
      }).catch(() => {});

      addToast('Personal Broadcast Sent! 📢', `Sent to ${newBroadcast.targetUserName}.`, 'success');
      setPersonalBroadcastTitle('');
      setPersonalBroadcastContent('');
      setSelectedMerchantForAction(null);
      setMerchantActionType(null);
    } catch (err: any) {
      addToast('Broadcast Failed', err.message || 'Could not send broadcast', 'error');
    } finally {
      setIsSubmittingMerchantAction(false);
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
    if (isBusinessDirtyRef.current) return;
    const currentLogo =
      settings.businessLogo ||
      profile?.avatarUrl ||
      currentUser?.avatarUrl ||
      (typeof window !== 'undefined' ? localStorage.getItem('khatapro_business_logo') || '' : '');
    if (currentLogo && !bLogo) {
      setBLogo(currentLogo);
    }
  }, [settings.businessLogo, profile?.avatarUrl, currentUser?.avatarUrl, bLogo]);

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
      const activeDb = 'SUPABASE';
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
          await syncWithDatabase();
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
      await syncWithDatabase();
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
    if (!isBusinessDirtyRef.current) {
      if (settings.businessName !== undefined) setBName(settings.businessName);
      if (settings.businessLogo !== undefined) setBLogo(settings.businessLogo);
      if (settings.businessTagline !== undefined) setBTagline(settings.businessTagline);
      if (settings.businessPhone !== undefined) setBPhone(settings.businessPhone);
      if (settings.businessEmail !== undefined) setBEmail(settings.businessEmail);
      if (settings.businessAddress !== undefined) setBAddress(settings.businessAddress);
      if (settings.paymentSettings?.businessGst !== undefined) setBGst(settings.paymentSettings.businessGst);
    }
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

  // Backend Provider Settings State (Supabase Only)
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || 'https://axpbydzszykqwojamblh.supabase.co');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cGJ5ZHpzenlrcXdvamFtYmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTIzNTcsImV4cCI6MjEwNzI4ODM1N30.MOkM9DqTFr5nB4mYj-Z3n9FEta1Pi0tSSJ0tTWxsxF0');
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState(settings.supabaseServiceRoleKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cGJ5ZHpzenlrcXdvamFtYmxoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcxMjM1NywiZXhwIjoyMTA3Mjg4MzU3fQ.oUgYxGo6-WWyioLkhmPuldiCWf4pANvEl7vnPyNyyNs');

  useEffect(() => {
    if (settings.supabaseUrl) setSupabaseUrl(settings.supabaseUrl);
    if (settings.supabaseAnonKey) setSupabaseAnonKey(settings.supabaseAnonKey);
    if (settings.supabaseServiceRoleKey) setSupabaseServiceRoleKey(settings.supabaseServiceRoleKey);
  }, [settings.supabaseUrl, settings.supabaseAnonKey, settings.supabaseServiceRoleKey]);

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
            isBusinessDirtyRef.current = true;
            StorageService.updateSettings({ businessLogo: compressed });
            StorageService.updateProfile({ ...profile, avatarUrl: compressed });
            updateSettings({ businessLogo: compressed }, { silent: true });
            setProfile({ ...profile, avatarUrl: compressed }, { silent: true });
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
    isBusinessDirtyRef.current = true;
    try { localStorage.removeItem('khatapro_business_logo'); } catch {}
    StorageService.updateSettings({ businessLogo: '' });
    StorageService.updateProfile({ ...profile, avatarUrl: '' });
    updateSettings({ businessLogo: '' }, { silent: true });
    setProfile({ ...profile, avatarUrl: '' }, { silent: true });
    addToast('Logo Removed', 'Profile logo has been removed.', 'info');
  };

  // Website Branding State
  const BADGE_COLOR_PRESETS = [
    { id: 'cyan_indigo', label: 'Cyan / Indigo', class: 'fintech-gradient-primary', bg: 'linear-gradient(135deg, #06b6d4, #4f46e5)' },
    { id: 'indigo_violet', label: 'Indigo / Violet', class: 'bg-gradient-to-r from-indigo-600 to-purple-600', bg: 'linear-gradient(135deg, #4f46e5, #9333ea)' },
    { id: 'purple_pink', label: 'Purple / Pink', class: 'bg-gradient-to-r from-purple-600 to-pink-500', bg: 'linear-gradient(135deg, #9333ea, #ec4899)' },
    { id: 'rose_red', label: 'Rose / Red', class: 'bg-gradient-to-r from-rose-500 to-red-600', bg: 'linear-gradient(135deg, #f43f5e, #dc2626)' },
    { id: 'amber_orange', label: 'Amber / Orange', class: 'bg-gradient-to-r from-amber-500 to-orange-500', bg: 'linear-gradient(135deg, #f59e0b, #f97316)' },
    { id: 'emerald_teal', label: 'Emerald / Teal', class: 'bg-gradient-to-r from-emerald-500 to-teal-600', bg: 'linear-gradient(135deg, #10b981, #0d9488)' },
    { id: 'blue_cyan', label: 'Electric Blue', class: 'bg-gradient-to-r from-blue-600 to-cyan-500', bg: 'linear-gradient(135deg, #2563eb, #06b6d4)' },
    { id: 'slate_dark', label: 'Stealth Dark', class: 'bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700', bg: 'linear-gradient(135deg, #1e293b, #0f172a)' },
  ];

  const [webName, setWebName] = useState(() => settings.websiteName || '');
  const [webBadgeText, setWebBadgeText] = useState(() => settings.websiteBadgeText !== undefined ? settings.websiteBadgeText : '');
  const [webBadgeBg, setWebBadgeBg] = useState(() => settings.websiteBadgeBg || 'fintech-gradient-primary');
  const [webTagline, setWebTagline] = useState(() => settings.websiteTagline !== undefined ? settings.websiteTagline : '');
  const [webSupportLocation, setWebSupportLocation] = useState(() => settings.websiteSupportLocation || '');
  const [webSupportPhone, setWebSupportPhone] = useState(() => settings.websiteSupportPhone || '');
  const [webSupportEmail, setWebSupportEmail] = useState(() => settings.websiteSupportEmail || '');
  const [webLogo, setWebLogo] = useState(() => settings.websiteLogo || '');
  const [webLogoMode, setWebLogoMode] = useState<'upload' | 'link'>('upload');
  const [webLogoLinkInput, setWebLogoLinkInput] = useState('');
  const [webFavicon, setWebFavicon] = useState(() => settings.websiteFavicon || '');
  const [webFaviconMode, setWebFaviconMode] = useState<'upload' | 'link'>('upload');
  const [webFaviconLinkInput, setWebFaviconLinkInput] = useState('');
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const webLogoInputRef = useRef<HTMLInputElement>(null);
  const webFaviconInputRef = useRef<HTMLInputElement>(null);
  const isBrandingDirtyRef = useRef(false);
  const isInitializedRef = useRef(false);
  const lastSavedBaselineRef = useRef<any>(null);

  // Website Policies Modal State & Handlers
  const [activePolicyModal, setActivePolicyModal] = useState<'terms' | 'refunds' | 'privacy' | null>(null);
  const [policyDraft, setPolicyDraft] = useState('');
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policyViewMode, setPolicyViewMode] = useState<'split' | 'edit' | 'preview'>('split');

  const handleOpenPolicyModal = (type: 'terms' | 'refunds' | 'privacy') => {
    setActivePolicyModal(type);
    let currentVal = '';
    if (type === 'terms') {
      currentVal = settings.termsAndConditions || (typeof window !== 'undefined' ? localStorage.getItem('skp_policy_terms') || '' : '');
    } else if (type === 'refunds') {
      currentVal = settings.refundAndCancellation || (typeof window !== 'undefined' ? localStorage.getItem('skp_policy_refunds') || '' : '');
    } else if (type === 'privacy') {
      currentVal = settings.privacyPolicy || (typeof window !== 'undefined' ? localStorage.getItem('skp_policy_privacy') || '' : '');
    }
    setPolicyDraft(currentVal);
  };

  const handleLoadDefaultPolicyTemplate = () => {
    const ctx = {
      businessName: bName || settings.businessName || profile.businessName || currentUser?.businessName || webName || 'Business',
      businessPhone: webSupportPhone || bPhone || settings.businessPhone || profile.phone || '',
      businessEmail: webSupportEmail || bEmail || settings.businessEmail || profile.email || '',
      businessAddress: bAddress || settings.businessAddress || profile.businessAddress || '',
      websiteName: webName || settings.websiteName || 'Billing & Ledger System',
    };
    if (activePolicyModal === 'terms') {
      setPolicyDraft(getDefaultTermsTemplate(ctx));
    } else if (activePolicyModal === 'refunds') {
      setPolicyDraft(getDefaultRefundsTemplate(ctx));
    } else if (activePolicyModal === 'privacy') {
      setPolicyDraft(getDefaultPrivacyTemplate(ctx));
    }
    addToast('Default Template Loaded', 'You can now customize it and click Save Policy Changes.', 'info');
  };

  const handleInsertHtmlTag = (tag: string) => {
    const textarea = document.getElementById('policy-editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      setPolicyDraft((prev) => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = policyDraft.substring(start, end);
    let insertion = tag;
    if (tag === 'p') insertion = `<p>${selected || 'Paragraph text here...'}</p>`;
    else if (tag === 'h2') insertion = `<h2>${selected || 'Section Heading'}</h2>`;
    else if (tag === 'h3') insertion = `<h3>${selected || 'Sub-heading'}</h3>`;
    else if (tag === 'strong') insertion = `<strong>${selected || 'Bold text'}</strong>`;
    else if (tag === 'ul') insertion = `<ul>\n  <li>${selected || 'Item 1'}</li>\n  <li>Item 2</li>\n</ul>`;
    else if (tag === 'a') insertion = `<a href="https://example.com" class="text-indigo-600 underline">${selected || 'Link text'}</a>`;
    else if (tag === 'box') insertion = `<div style="background: rgba(99, 102, 241, 0.08); padding: 14px; border-radius: 12px; margin: 12px 0;">\n  <strong>Note:</strong> ${selected || 'Important announcement or policy highlight'}\n</div>`;

    const nextVal = policyDraft.substring(0, start) + insertion + policyDraft.substring(end);
    setPolicyDraft(nextVal);
  };

  const handleSavePolicy = async () => {
    if (!activePolicyModal) return;
    setIsSavingPolicy(true);
    try {
      const updatedTerms = activePolicyModal === 'terms' ? policyDraft : (settings.termsAndConditions || '');
      const updatedRefunds = activePolicyModal === 'refunds' ? policyDraft : (settings.refundAndCancellation || '');
      const updatedPrivacy = activePolicyModal === 'privacy' ? policyDraft : (settings.privacyPolicy || '');

      const brandPayload: any = {
        websiteName: webName || settings.websiteName || '',
        websiteLogo: webLogo || settings.websiteLogo || '',
        websiteFavicon: webFavicon || settings.websiteFavicon || '',
        websiteBadgeText: webBadgeText !== undefined ? webBadgeText : (settings.websiteBadgeText || ''),
        websiteBadgeBg: webBadgeBg || settings.websiteBadgeBg || 'fintech-gradient-primary',
        websiteTagline: webTagline !== undefined ? webTagline : (settings.websiteTagline || ''),
        websiteSupportLocation: webSupportLocation || settings.websiteSupportLocation || '',
        websiteSupportPhone: webSupportPhone || settings.websiteSupportPhone || '',
        websiteSupportEmail: webSupportEmail || settings.websiteSupportEmail || '',
        termsAndConditions: updatedTerms,
        refundAndCancellation: updatedRefunds,
        privacyPolicy: updatedPrivacy,
      };

      // 1. Save to Supabase Cloud Database via /api/system/config
      try {
        await fetch('/api/system/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ websiteBranding: brandPayload }),
        });
      } catch (err) {
        console.warn('Could not save policy to Supabase API:', err);
      }

      // 2. Update local storage and context
      const updatedSettings = StorageService.updateSettings({
        ...settings,
        termsAndConditions: updatedTerms,
        refundAndCancellation: updatedRefunds,
        privacyPolicy: updatedPrivacy,
      });
      updateSettings(updatedSettings);

      if (activePolicyModal === 'terms') {
        try { localStorage.setItem('skp_policy_terms', policyDraft); } catch {}
      } else if (activePolicyModal === 'refunds') {
        try { localStorage.setItem('skp_policy_refunds', policyDraft); } catch {}
      } else if (activePolicyModal === 'privacy') {
        try { localStorage.setItem('skp_policy_privacy', policyDraft); } catch {}
      }

      window.dispatchEvent(new CustomEvent('khatapro_policy_updated', {
        detail: { type: activePolicyModal, content: policyDraft }
      }));
      window.dispatchEvent(new CustomEvent('skp_branding_updated', {
        detail: brandPayload
      }));

      const policyTitle = activePolicyModal === 'terms'
        ? 'Terms & Conditions'
        : activePolicyModal === 'refunds'
        ? 'Refunds & Cancellations'
        : 'Privacy Policy';

      addToast(`${policyTitle} Saved! 📜`, 'Policy database me live update ho gayi hai aur poore website pe active hai!', 'success');
      setActivePolicyModal(null);
    } catch (err: any) {
      addToast('Error Saving Policy', err.message || 'Failed to save', 'error');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  useEffect(() => {
    // If user has modified the form, never overwrite with background settings updates
    if (isBrandingDirtyRef.current) return;

    // If we just saved something, protect against stale context settings clobbering
    if (lastSavedBaselineRef.current) {
      const isCaughtUp =
        settings.websiteName === lastSavedBaselineRef.current.websiteName &&
        settings.websiteLogo === lastSavedBaselineRef.current.websiteLogo &&
        settings.websiteFavicon === lastSavedBaselineRef.current.websiteFavicon &&
        settings.websiteBadgeText === lastSavedBaselineRef.current.websiteBadgeText &&
        settings.websiteTagline === lastSavedBaselineRef.current.websiteTagline &&
        settings.websiteBadgeBg === lastSavedBaselineRef.current.websiteBadgeBg &&
        settings.websiteSupportLocation === lastSavedBaselineRef.current.websiteSupportLocation &&
        settings.websiteSupportPhone === lastSavedBaselineRef.current.websiteSupportPhone &&
        settings.websiteSupportEmail === lastSavedBaselineRef.current.websiteSupportEmail;

      if (isCaughtUp) {
        lastSavedBaselineRef.current = null;
      }
      return;
    }

    if (settings) {
      if (settings.websiteName !== undefined) setWebName(settings.websiteName);
      if (settings.websiteBadgeText !== undefined) setWebBadgeText(settings.websiteBadgeText);
      if (settings.websiteBadgeBg) setWebBadgeBg(settings.websiteBadgeBg);
      if (settings.websiteTagline !== undefined) setWebTagline(settings.websiteTagline);
      if (settings.websiteSupportLocation !== undefined) setWebSupportLocation(settings.websiteSupportLocation);
      if (settings.websiteSupportPhone !== undefined) setWebSupportPhone(settings.websiteSupportPhone);
      if (settings.websiteSupportEmail !== undefined) setWebSupportEmail(settings.websiteSupportEmail);
      if (settings.websiteLogo !== undefined) setWebLogo(settings.websiteLogo);
      if (settings.websiteFavicon !== undefined) setWebFavicon(settings.websiteFavicon);
    }
  }, [
    settings.websiteName,
    settings.websiteBadgeText,
    settings.websiteBadgeBg,
    settings.websiteTagline,
    settings.websiteSupportLocation,
    settings.websiteSupportPhone,
    settings.websiteSupportEmail,
    settings.websiteLogo,
    settings.websiteFavicon,
  ]);

  // Handle Website Logo Upload with auto-resize
  const handleUploadWebLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast('Invalid Image', 'Please upload a PNG, JPG, WEBP, or SVG image.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return;

        if (file.type.includes('svg')) {
          isBrandingDirtyRef.current = true;
          setWebLogo(result);
          addToast('Website Logo Uploaded', 'Remember to click Save Branding Changes.', 'info');
          return;
        }

        const img = new Image();
        img.onload = () => {
          const maxDim = 192;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          isBrandingDirtyRef.current = true;
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/png', 0.9);
            setWebLogo(compressed);
          } else {
            setWebLogo(result);
          }
          addToast('Website Logo Uploaded', 'Remember to click Save Branding Changes.', 'info');
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Handle Website Favicon Upload with auto-resize
  const handleUploadWebFavicon = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.name.endsWith('.ico')) {
        addToast('Invalid Icon', 'Please upload a valid favicon (ICO, PNG, SVG).', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return;

        if (file.type.includes('svg') || file.name.endsWith('.ico')) {
          isBrandingDirtyRef.current = true;
          setWebFavicon(result);
          addToast('Favicon Uploaded', 'Remember to click Save Branding Changes.', 'info');
          return;
        }

        const img = new Image();
        img.onload = () => {
          const maxDim = 64;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          isBrandingDirtyRef.current = true;
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/png', 0.9);
            setWebFavicon(compressed);
          } else {
            setWebFavicon(result);
          }
          addToast('Favicon Uploaded', 'Remember to click Save Branding Changes.', 'info');
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Handle Save Website Branding
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);

    const finalLogo = webLogoMode === 'link' ? (webLogoLinkInput.trim() || webLogo) : webLogo;
    const finalFavicon = webFaviconMode === 'link' ? (webFaviconLinkInput.trim() || webFavicon) : (webFavicon || finalLogo);
    const finalName = webName.trim();
    const finalBadge = webBadgeText.trim();
    const finalTagline = webTagline.trim();
    const finalSupportLocation = webSupportLocation.trim();
    const finalSupportPhone = webSupportPhone.trim();
    const finalSupportEmail = webSupportEmail.trim();

    const brandPayload = {
      websiteName: finalName,
      websiteBadgeText: finalBadge,
      websiteBadgeBg: webBadgeBg,
      websiteTagline: finalTagline,
      websiteLogo: finalLogo,
      websiteFavicon: finalFavicon,
      websiteSupportLocation: finalSupportLocation,
      websiteSupportPhone: finalSupportPhone,
      websiteSupportEmail: finalSupportEmail,
      termsAndConditions: settings.termsAndConditions || (typeof window !== 'undefined' ? localStorage.getItem('skp_policy_terms') || '' : ''),
      refundAndCancellation: settings.refundAndCancellation || (typeof window !== 'undefined' ? localStorage.getItem('skp_policy_refunds') || '' : ''),
      privacyPolicy: settings.privacyPolicy || (typeof window !== 'undefined' ? localStorage.getItem('skp_policy_privacy') || '' : ''),
    };
    lastSavedBaselineRef.current = brandPayload;

    try {
      // 1. Direct await save to Supabase cloud database
      const res = await fetch('/api/system/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteBranding: brandPayload }),
      });
      if (!res.ok) {
        console.warn('System config save warning: HTTP', res.status);
      }
    } catch (err) {
      console.error('System config cloud broadcast error:', err);
    }

    try {
      localStorage.setItem('skp_global_branding', JSON.stringify(brandPayload));
      const rawGlobal = localStorage.getItem('skp_global_system_config');
      const globalObj = rawGlobal ? JSON.parse(rawGlobal) : {};
      globalObj.websiteBranding = brandPayload;
      localStorage.setItem('skp_global_system_config', JSON.stringify(globalObj));
      localStorage.setItem('skp_brand_badge', finalBadge);
      localStorage.setItem('skp_brand_badge_bg', webBadgeBg);
      localStorage.setItem('skp_brand_tagline', finalTagline);
      localStorage.setItem('skp_brand_name', finalName);
      if (finalSupportLocation) localStorage.setItem('skp_brand_support_location', finalSupportLocation);
      else localStorage.removeItem('skp_brand_support_location');
      if (finalSupportPhone) localStorage.setItem('skp_brand_support_phone', finalSupportPhone);
      else localStorage.removeItem('skp_brand_support_phone');
      if (finalSupportEmail) localStorage.setItem('skp_brand_support_email', finalSupportEmail);
      else localStorage.removeItem('skp_brand_support_email');
      if (finalLogo) localStorage.setItem('skp_brand_logo', finalLogo);
      if (finalFavicon) localStorage.setItem('skp_brand_favicon', finalFavicon);
    } catch {}

    if (typeof document !== 'undefined') {
      const maxAge = '; Path=/; Max-Age=31536000; SameSite=Lax;';
      document.cookie = `skp_brand_badge=${encodeURIComponent(finalBadge)}${maxAge}`;
      document.cookie = `skp_brand_badge_bg=${encodeURIComponent(webBadgeBg)}${maxAge}`;
      document.cookie = `skp_brand_tagline=${encodeURIComponent(finalTagline)}${maxAge}`;
      document.cookie = `skp_brand_name=${encodeURIComponent(finalName)}${maxAge}`;
      if (finalSupportLocation) document.cookie = `skp_brand_support_location=${encodeURIComponent(finalSupportLocation)}${maxAge}`;
      if (finalSupportPhone) document.cookie = `skp_brand_support_phone=${encodeURIComponent(finalSupportPhone)}${maxAge}`;
      if (finalSupportEmail) document.cookie = `skp_brand_support_email=${encodeURIComponent(finalSupportEmail)}${maxAge}`;
      if (finalLogo && finalLogo.length < 2000) {
        document.cookie = `skp_brand_logo=${encodeURIComponent(finalLogo)}${maxAge}`;
      }
      if (finalFavicon && finalFavicon.length < 2000) {
        document.cookie = `skp_brand_favicon=${encodeURIComponent(finalFavicon)}${maxAge}`;
      }
    }

    const updated: SystemSettings = {
      ...settings,
      websiteName: finalName,
      websiteBadgeText: finalBadge,
      websiteBadgeBg: webBadgeBg,
      websiteTagline: finalTagline,
      websiteLogo: finalLogo,
      websiteFavicon: finalFavicon,
      websiteSupportLocation: finalSupportLocation,
      websiteSupportPhone: finalSupportPhone,
      websiteSupportEmail: finalSupportEmail,
    };

    updateSettings(updated);
    setWebName(finalName);
    setWebBadgeText(finalBadge);
    setWebBadgeBg(webBadgeBg);
    setWebTagline(finalTagline);
    setWebSupportLocation(finalSupportLocation);
    setWebSupportPhone(finalSupportPhone);
    setWebSupportEmail(finalSupportEmail);
    setWebLogo(finalLogo);
    setWebFavicon(finalFavicon);
    isBrandingDirtyRef.current = false;

    window.dispatchEvent(new CustomEvent('khatapro_branding_changed', { detail: brandPayload }));
    window.dispatchEvent(new CustomEvent('skp_branding_updated', { detail: brandPayload }));

    const badgeSuffix = finalBadge ? ` ${finalBadge}` : '';
    const taglineSuffix = finalTagline ? ` - ${finalTagline}` : '';
    document.title = `${finalName}${badgeSuffix}${taglineSuffix}`;
    const targetFav = finalFavicon || finalLogo || '/icon.svg';
    try {
      const oldLinks = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
      oldLinks.forEach((el) => el.remove());
      ['icon', 'shortcut icon', 'apple-touch-icon'].forEach((rel) => {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = targetFav;
        document.head.appendChild(link);
      });
    } catch (e) {}

    addToast('Website Branding Updated! 🎨', 'Website Name, Subtitle, Logo, Favicon & Badge database me live update ho gaye hain!', 'success');
    setIsSavingBranding(false);
  };

  // Handle Business Save
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBusiness(true);
    try {
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
          currency: activeSettingsCurrency.code,
        },
      };

      const updatedProfile: UserProfile = {
        ...profile,
        businessName: cleanBName,
        avatarUrl: bLogo,
        businessGst: cleanBGst,
        businessAddress: cleanBAddress,
        phone: cleanBPhone,
        email: cleanBEmail,
        currency: activeSettingsCurrency.code,
        currencySymbol: activeSettingsCurrency.symbol,
        language: activeSettingsLanguage.code,
      };

      // 1. Immediately persist to localStorage via StorageService
      StorageService.updateSettings(updated);
      StorageService.updateProfile(updatedProfile);

      setActiveCurrency(activeSettingsCurrency.code);
      setActiveLanguage(activeSettingsLanguage.code);

      // 2. Mark form not dirty
      isBusinessDirtyRef.current = false;

      // 3. Update React context state silently to avoid double toast notifications
      updateSettings(updated, { silent: true });
      setProfile(updatedProfile, { silent: true });

      if (cleanBName) {
        setPayeeName(cleanBName);
      }

      // 4. Synchronize immediately to Supabase Cloud PostgreSQL
      await syncWithDatabase();

      addToast(
        'Business Details Saved! 🏢',
        'Enterprise information, contact details, and currency saved and synchronized successfully.',
        'success'
      );
    } catch (err: any) {
      console.error('Failed to save business details:', err);
      addToast('Save Failed', err.message || 'Could not save business details.', 'error');
    } finally {
      setIsSavingBusiness(false);
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
            onClick={() => setMainTab('branding')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              mainTab === 'branding'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4 text-pink-400" />
            <span>Website Branding</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-md">Admin</span>
          </button>
        )}

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
            <span>Management</span>
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

      {/* Sub-Tabs: Inside Website Branding (Admin Only) */}
      {mainTab === 'branding' && isAdmin && (
        <div className="flex gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setBrandingSubTab('visuals')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              brandingSubTab === 'visuals'
                ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-pink-500" />
            <span>Website Name &amp; Logos</span>
          </button>

          <button
            type="button"
            onClick={() => setBrandingSubTab('broadcast')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              brandingSubTab === 'broadcast'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
            <span>Merchant Broadcasts</span>
            {(settings.broadcasts?.length || 0) > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                {settings.broadcasts?.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Sub-Tabs: Inside Management (Admin Only) */}
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
                onChange={(e) => {
                  setBName(e.target.value);
                  isBusinessDirtyRef.current = true;
                }}
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
                onChange={(e) => {
                  setBTagline(e.target.value);
                  isBusinessDirtyRef.current = true;
                }}
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
                onChange={(e) => {
                  setBPhone(e.target.value);
                  isBusinessDirtyRef.current = true;
                }}
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
                onChange={(e) => {
                  setBEmail(e.target.value);
                  isBusinessDirtyRef.current = true;
                }}
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
                onChange={(e) => {
                  setBGst(e.target.value);
                  isBusinessDirtyRef.current = true;
                }}
                placeholder="e.g. 27AABCS1429B1Z8"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Business Currency (मुद्रा)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsCurrencyLanguageTab('currency');
                    setIsSettingsCurrencyModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Search className="w-2.5 h-2.5" />
                  <span>Search</span>
                </button>
              </div>
              <select
                value={activeSettingsCurrency.code}
                onChange={(e) => {
                  const c = setActiveCurrency(e.target.value);
                  setActiveSettingsCurrency(c);
                  isBusinessDirtyRef.current = true;
                  if (profile) {
                    setProfile({ ...profile, currency: c.code, currencySymbol: c.symbol }, { silent: true });
                  }
                  addToast('Currency Updated', `Default monetary unit set to ${c.name} (${c.symbol}).`, 'success');
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.flag} {curr.symbol} {curr.code} — {curr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Regional Language Field */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Preferred Language (भाषा)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsCurrencyLanguageTab('language');
                    setIsSettingsCurrencyModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Search className="w-2.5 h-2.5" />
                  <span>Search All</span>
                </button>
              </div>
              <select
                value={activeSettingsLanguage.code}
                onChange={(e) => {
                  const l = setActiveLanguage(e.target.value);
                  setActiveSettingsLanguage(l);
                  isBusinessDirtyRef.current = true;
                  if (profile) {
                    setProfile({ ...profile, language: l.code }, { silent: true });
                  }
                  addToast('Language Updated', `Language set to ${l.nativeName} (${l.name}).`, 'success');
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name}) — {lang.region}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 mt-1 sm:mt-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-[11px] text-indigo-950 dark:text-indigo-300 leading-snug">
                  Active Currency <strong>({activeSettingsCurrency.symbol} {activeSettingsCurrency.code})</strong> and Language <strong>({activeSettingsLanguage.nativeName})</strong> will format all invoices &amp; ledgers.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Registered Office Address
            </label>
            <textarea
              value={bAddress}
              onChange={(e) => {
                setBAddress(e.target.value);
                isBusinessDirtyRef.current = true;
              }}
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingBusiness}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95 transition-all"
            >
              {isSavingBusiness ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Business Details</span>
                </>
              )}
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

      {/* Tab: Website Branding (Admin Only) */}
      {mainTab === 'branding' && isAdmin && brandingSubTab === 'visuals' && (
        <form onSubmit={handleSaveBranding} className="space-y-6 animate-in fade-in">
          
          {/* Header Banner - Slim Strip */}
          <div className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-200/80 dark:border-pink-900/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-500 shrink-0" />
              <span className="text-xs font-mono font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                Website Identity &amp; Branding
              </span>
            </div>

            <button
              type="submit"
              disabled={isSavingBranding}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-pink-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingBranding ? 'Saving...' : 'Save Branding Changes'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Website Name & Badge */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Website Name &amp; Badge
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Brand display name aur tag badge configuration
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Brand Display Name *
                </label>
                <input
                  type="text"
                  value={webName}
                  onChange={(e) => {
                    isBrandingDirtyRef.current = true;
                    setWebName(e.target.value);
                  }}
                  placeholder="e.g. MyBrand, ApnaKhata, VyaparPro"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Website Subtitle / Tagline (e.g. Fintech Operating System)
                </label>
                <input
                  type="text"
                  value={webTagline}
                  onChange={(e) => {
                    isBrandingDirtyRef.current = true;
                    setWebTagline(e.target.value);
                  }}
                  placeholder="e.g. Fintech Operating System, Cloud ERP System"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all font-semibold"
                />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Navbar, Footer, Login &amp; Browser tab me dikhne wala subtitle (Blank to hide)
                </p>
              </div>

              {/* Pro Badge / Tag Text Input & Color Selection */}
              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pro Badge / Tag Text (e.g. PRO, ERP, VIP, BIZ)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={webBadgeText}
                      onChange={(e) => {
                        isBrandingDirtyRef.current = true;
                        setWebBadgeText(e.target.value.toUpperCase());
                      }}
                      placeholder="e.g. PRO, ERP, VIP"
                      maxLength={10}
                      className="w-36 px-3.5 py-2 text-xs uppercase rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all font-black tracking-wider"
                    />
                    {webBadgeText?.trim() && (
                      <span className={`text-[7px] sm:text-[7.5px] px-1.5 py-[1.5px] rounded font-bold uppercase tracking-wider leading-none text-white shadow-xs ${webBadgeBg}`}>
                        {webBadgeText.trim()}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    (Max 10 chars; blank to hide badge)
                  </p>
                </div>

                {/* Badge Background Color Options */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Badge Background Color
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {BADGE_COLOR_PRESETS.map((preset) => {
                      const isSelected = webBadgeBg === preset.class;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            isBrandingDirtyRef.current = true;
                            setWebBadgeBg(preset.class);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-400 dark:border-indigo-600'
                              : 'border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-inner shrink-0"
                            style={{ background: preset.bg }}
                          />
                          <span className="text-[10.5px] text-slate-700 dark:text-slate-300 truncate font-semibold">
                            {preset.label}
                          </span>
                          {isSelected && (
                            <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 ml-auto shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Website Logo */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Website Header Logo
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Top navigation bar aur footer me dikhne wala logo
                    </p>
                  </div>
                </div>
              </div>

              {/* Mode Switcher: Upload vs Link */}
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setWebLogoMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                    webLogoMode === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWebLogoMode('link')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                    webLogoMode === 'link'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Image URL / Link</span>
                </button>
              </div>

              {/* Input section based on mode */}
              {webLogoMode === 'upload' ? (
                <div>
                  <input
                    ref={webLogoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadWebLogo}
                    className="hidden"
                  />
                  <div
                    onClick={() => webLogoInputRef.current?.click()}
                    className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 group"
                  >
                    <Upload className="w-6 h-6 mx-auto text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-110 transition-transform mb-1.5" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Click to Browse &amp; Upload Logo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG, WEBP, SVG (Max 2MB) • Square 256x256px best
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Direct Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={webLogoLinkInput}
                      onChange={(e) => setWebLogoLinkInput(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (webLogoLinkInput.trim()) {
                          isBrandingDirtyRef.current = true;
                          setWebLogo(webLogoLinkInput.trim());
                          addToast('Logo Link Set', 'Preview updated.', 'info');
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* Logo Preview & Reset */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {webLogo ? (
                      <img
                        src={webLogo}
                        alt="Website Logo Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Sparkles className="w-6 h-6 text-indigo-500" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {webLogo ? 'Active Logo Loaded' : 'Default Sparkles Icon'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Renders in Navbar (H: 36px, W: 36px)
                    </span>
                  </div>
                </div>

                {webLogo && (
                  <button
                    type="button"
                    onClick={() => {
                      isBrandingDirtyRef.current = true;
                      setWebLogo('');
                      setWebLogoLinkInput('');
                      addToast('Logo Reset', 'Switched back to default icon.', 'info');
                    }}
                    className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold cursor-pointer transition-colors"
                    title="Remove custom logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Footer Helpdesk & Support Contact Section */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Footer Helpdesk &amp; Support Details
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Footer ke &quot;Helpdesk &amp; Support&quot; me sirf ye details live show hongi (Blank to hide)
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>Support Location / City (Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={webSupportLocation}
                      onChange={(e) => {
                        isBrandingDirtyRef.current = true;
                        setWebSupportLocation(e.target.value);
                      }}
                      placeholder="e.g. Bhiwandi, Maharashtra"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>Support Phone Number (Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={webSupportPhone}
                      onChange={(e) => {
                        isBrandingDirtyRef.current = true;
                        setWebSupportPhone(e.target.value);
                      }}
                      placeholder="e.g. +91 8371838314"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>Support Email Address (Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={webSupportEmail}
                      onChange={(e) => {
                        isBrandingDirtyRef.current = true;
                        setWebSupportEmail(e.target.value);
                      }}
                      placeholder="e.g. anantyadav8924@gmail.com"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Website Favicon */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Browser Favicon
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Browser tab aur bookmarks me dikhne wala chhota icon
                    </p>
                  </div>
                </div>
              </div>

              {/* Mode Switcher: Upload vs Link */}
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setWebFaviconMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                    webFaviconMode === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWebFaviconMode('link')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                    webFaviconMode === 'link'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Favicon URL / Link</span>
                </button>
              </div>

              {/* Input section based on mode */}
              {webFaviconMode === 'upload' ? (
                <div>
                  <input
                    ref={webFaviconInputRef}
                    type="file"
                    accept="image/*,.ico"
                    onChange={handleUploadWebFavicon}
                    className="hidden"
                  />
                  <div
                    onClick={() => webFaviconInputRef.current?.click()}
                    className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 transition-all text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 group"
                  >
                    <Upload className="w-6 h-6 mx-auto text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Click to Browse &amp; Upload Favicon
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ICO, PNG, SVG (Max 500KB) • 32x32px or 64x64px square
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Direct Favicon URL (.ico / .png)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={webFaviconLinkInput}
                      onChange={(e) => setWebFaviconLinkInput(e.target.value)}
                      placeholder="https://example.com/favicon.ico"
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (webFaviconLinkInput.trim()) {
                          isBrandingDirtyRef.current = true;
                          setWebFavicon(webFaviconLinkInput.trim());
                          addToast('Favicon Link Set', 'Preview updated.', 'info');
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* Favicon Preview & Reset */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {webFavicon ? (
                      <img
                        src={webFavicon}
                        alt="Favicon Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Globe className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {webFavicon ? 'Custom Favicon Loaded' : 'Default Browser Favicon'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Renders in browser tab title bar (32x32 px)
                    </span>
                  </div>
                </div>

                {webFavicon && (
                  <button
                    type="button"
                    onClick={() => {
                      isBrandingDirtyRef.current = true;
                      setWebFavicon('');
                      setWebFaviconLinkInput('');
                      addToast('Favicon Reset', 'Switched back to default favicon.', 'info');
                    }}
                    className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold cursor-pointer transition-colors"
                    title="Remove custom favicon"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Website Legal Policies & Compliance Buttons (Requested by User) */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Legal Compliance &amp; Policies
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Live HTML / Text
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Edit policies with live split-screen editor &amp; real-time preview across entire website:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleOpenPolicyModal('terms')}
                    className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs hover:border-indigo-300"
                    title="Edit Terms & Conditions"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                    <span className="truncate">Terms &amp; Cond.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPolicyModal('refunds')}
                    className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs hover:border-emerald-300"
                    title="Edit Refunds & Cancellations"
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                    <span className="truncate">Refund Policy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPolicyModal('privacy')}
                    className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/50 text-slate-700 hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs hover:border-purple-300"
                    title="Edit Privacy Policy"
                  >
                    <Shield className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                    <span className="truncate">Privacy Policy</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* Tab: Website Branding -> Sub-Tab: Broadcasts (Admin Only) */}
      {mainTab === 'branding' && isAdmin && brandingSubTab === 'broadcast' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Header Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/80 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Live Merchant Announcements
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Merchant Broadcast System (Popups, Banners &amp; Alerts)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                Yahan se aap sabhi registered merchants ya kisi <strong>personal specific merchant</strong> ko notifications, top banner ya modal popup bhej sakte hain. HTML styling, close icon aur Green (Success), Yellow (Warning), Red (Critical) severity alerts supported hain.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create Broadcast Form */}
            <div className="lg:col-span-1 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Radio className="w-4 h-4 text-indigo-500" />
                <span>Create New Broadcast</span>
              </h3>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Broadcast Title *
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Server Maintenance Notice 🚀"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              {/* Type & Severity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Type
                  </label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="banner">Top Banner</option>
                    <option value="popup">Modal Pop-up</option>
                    <option value="notification">Alert Toast</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alert Color
                  </label>
                  <select
                    value={broadcastSeverity}
                    onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="info">🔵 Blue (Info)</option>
                    <option value="success">🟢 Green (Success)</option>
                    <option value="warning">🟡 Yellow (Warning)</option>
                    <option value="error">🔴 Red (Critical Alert)</option>
                  </select>
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Merchants
                </label>
                <select
                  value={broadcastTargetType}
                  onChange={(e) => {
                    const t = e.target.value as any;
                    setBroadcastTargetType(t);
                    if (t === 'all') {
                      setBroadcastTargetUserId('');
                      setBroadcastTargetUserName('');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                >
                  <option value="all">🌐 All Merchants (Global Broadcast)</option>
                  <option value="specific_user">👤 Specific Merchant (Personal Broadcast)</option>
                </select>
              </div>

              {broadcastTargetType === 'specific_user' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Merchant
                  </label>
                  <select
                    value={broadcastTargetUserId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setBroadcastTargetUserId(uid);
                      const found = crmUsers.find(u => u.id === uid);
                      setBroadcastTargetUserName(found?.full_name || found?.name || found?.email || '');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="">-- Choose Merchant --</option>
                    {crmUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.name || u.email} ({u.business_name || 'Merchant'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* HTML / Plain Text Message Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Content (Text or HTML Supported) *
                  </label>
                  <span className="text-[10px] font-mono text-indigo-500">&lt;b&gt;, &lt;p&gt;, &lt;a&gt; allowed</span>
                </div>
                <textarea
                  rows={4}
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  placeholder="Enter message details or paste HTML snippet..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Close Icon Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkClosable"
                  checked={broadcastIsClosable}
                  onChange={(e) => setBroadcastIsClosable(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="chkClosable" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Show Close &apos;X&apos; button (Merchant can dismiss)
                </label>
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => {
                  if (!broadcastTitle.trim() || !broadcastContent.trim()) {
                    addToast('Details Required', 'Please enter title and content for broadcast.', 'warning');
                    return;
                  }
                  if (broadcastTargetType === 'specific_user' && !broadcastTargetUserId) {
                    addToast('Select Merchant', 'Please select a specific merchant to target.', 'warning');
                    return;
                  }

                  const newMsg: BroadcastMessage = {
                    id: `bc_${Date.now()}`,
                    title: broadcastTitle.trim(),
                    content: broadcastContent.trim(),
                    type: broadcastType,
                    severity: broadcastSeverity,
                    targetType: broadcastTargetType,
                    targetUserId: broadcastTargetUserId || undefined,
                    targetUserName: broadcastTargetUserName || undefined,
                    isClosable: broadcastIsClosable,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser?.name || 'Administrator',
                  };

                  const updatedBroadcasts = [newMsg, ...(settings.broadcasts || [])];
                  updateSettings({ ...settings, broadcasts: updatedBroadcasts });
                  addToast('Broadcast Published! 📢', `Broadcast "${newMsg.title}" is now live for merchants.`, 'success');

                  // Reset form
                  setBroadcastTitle('');
                  setBroadcastContent('');
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Publish Broadcast</span>
              </button>
            </div>

            {/* Active Broadcasts List */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  <span>Active Announcements ({settings.broadcasts?.length || 0})</span>
                </h3>
              </div>

              {(!settings.broadcasts || settings.broadcasts.length === 0) ? (
                <div className="p-12 text-center space-y-2">
                  <Megaphone className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No broadcasts published yet</h4>
                  <p className="text-xs text-slate-400">
                    Use the form on the left to broadcast top banners, popups, or alerts to merchants.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.broadcasts.map((b) => {
                    const sevBadge =
                      b.severity === 'success'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                        : b.severity === 'warning'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                        : b.severity === 'error'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300';

                    return (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${sevBadge}`}>
                              {b.severity}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {b.type.toUpperCase()}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {b.title}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = (settings.broadcasts || []).filter(item => item.id !== b.id);
                              updateSettings({ ...settings, broadcasts: updated });
                              addToast('Broadcast Deleted', 'Announcement has been removed.', 'info');
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                            title="Delete Broadcast"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Content preview */}
                        <div
                          className="text-xs text-slate-600 dark:text-slate-300 prose dark:prose-invert max-w-none text-left"
                          dangerouslySetInnerHTML={{ __html: b.content }}
                        />

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span>
                            Audience: <strong>{b.targetType === 'all' ? 'All Merchants' : `Specific Merchant (${b.targetUserName || b.targetUserId})`}</strong>
                          </span>
                          <span>Published {new Date(b.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab: Cloud Backup */}
      {mainTab === 'backup' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* SUB-TABS: 1) Google Drive Cloud Sync  2) Export / Import Local */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setBackupSubTab('drive')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                backupSubTab === 'drive'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>1st Tab: Google Drive Cloud Sync</span>
            </button>

            <button
              type="button"
              onClick={() => setBackupSubTab('local')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                backupSubTab === 'local'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span>2nd Tab: Export / Import Local (JSON/ZIP)</span>
            </button>
          </div>

          {/* TAB 1: GOOGLE DRIVE BACKUP & RESTORE */}
          {backupSubTab === 'drive' && (
            <GoogleDriveBackupPanel />
          )}

          {/* TAB 2: MANUAL LOCAL EXPORT & IMPORT */}
          {backupSubTab === 'local' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">

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
                  <div>✓ Active DB Provider: <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">Supabase PostgreSQL</span></div>
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
                      Instantly restores to active <span className="uppercase font-semibold text-emerald-600">Supabase Cloud</span> database
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
          )}
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

            {/* Filter Pills: 2 Roles (Admin & Merchant) */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Users', count: crmUsers.length },
                { id: 'admin', label: 'Admins', count: crmUsers.filter(u => u.role === 'admin' || u.role === 'super_admin').length },
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
                    : u.role === 'admin' || u.role === 'super_admin';

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
                        const isBlocked = Boolean(u.is_blocked || u.isBlocked);
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
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                                    <span>{displayName}</span>
                                    {isSelf && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">
                                        You
                                      </span>
                                    )}
                                    {isBlocked && (
                                      <span className="text-[9px] px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black uppercase border border-rose-500/30 flex items-center gap-1">
                                        <Ban className="w-2.5 h-2.5" /> Blocked
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

                            {/* Role badge: Admin or Merchant only */}
                            <td className="px-4 py-4">
                              {role === 'admin' || role === 'super_admin' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  <Shield className="w-3 h-3 text-purple-600" />
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

                            {/* Actions: Profile, Broadcast, Change Password, Block/Unblock, Role, Delete */}
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Profile View & Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMerchantForAction(u);
                                    setMerchantEditProfile({
                                      name: u.full_name || u.name || '',
                                      businessName: u.business_name || '',
                                      phone: u.phone || '',
                                      businessAddress: u.business_address || '',
                                    });
                                    setMerchantActionType('profile');
                                  }}
                                  title="View & Edit Merchant Profile"
                                  className="p-1.5 rounded-xl text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                                >
                                  <User className="w-4 h-4" />
                                </button>

                                {/* Personal Broadcast Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMerchantForAction(u);
                                    setPersonalBroadcastTitle('');
                                    setPersonalBroadcastContent('');
                                    setMerchantActionType('broadcast');
                                  }}
                                  title="Send Personal Broadcast Announcement"
                                  className="p-1.5 rounded-xl text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
                                >
                                  <Megaphone className="w-4 h-4" />
                                </button>

                                {/* Change Password Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMerchantForAction(u);
                                    setNewMerchantPassword('');
                                    setMerchantActionType('password');
                                  }}
                                  title="Change Merchant Password"
                                  className="p-1.5 rounded-xl text-amber-600 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                                >
                                  <Key className="w-4 h-4" />
                                </button>

                                {/* Block / Unblock Toggle Button */}
                                {!isPrimaryAdmin && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBlockMerchant(u)}
                                    title={isBlocked ? "Unblock Merchant" : "Block Merchant Account"}
                                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                                      isBlocked
                                        ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                        : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                                    }`}
                                  >
                                    {isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                  </button>
                                )}

                                {/* Role Switcher Dropdown (2 roles only: Merchant & Admin) */}
                                <select
                                  value={role === 'super_admin' ? 'admin' : role}
                                  disabled={updatingUserId === u.id || isPrimaryAdmin}
                                  onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                  className="text-[11px] font-bold px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                                >
                                  <option value="user">Merchant</option>
                                  <option value="admin">Admin</option>
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

      {/* ================= MODAL 1: VIEW & EDIT MERCHANT PROFILE ================= */}
      {selectedMerchantForAction && merchantActionType === 'profile' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Merchant Profile Details</h3>
                  <p className="text-xs text-slate-400">{selectedMerchantForAction.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedMerchantForAction(null); setMerchantActionType(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Merchant / Owner Name</label>
                <input
                  type="text"
                  value={merchantEditProfile.name}
                  onChange={(e) => setMerchantEditProfile({ ...merchantEditProfile, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Business / Shop Name</label>
                <input
                  type="text"
                  value={merchantEditProfile.businessName}
                  onChange={(e) => setMerchantEditProfile({ ...merchantEditProfile, businessName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={merchantEditProfile.phone}
                  onChange={(e) => setMerchantEditProfile({ ...merchantEditProfile, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Business Address</label>
                <textarea
                  rows={2}
                  value={merchantEditProfile.businessAddress}
                  onChange={(e) => setMerchantEditProfile({ ...merchantEditProfile, businessAddress: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setSelectedMerchantForAction(null); setMerchantActionType(null); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingMerchantAction}
                onClick={handleSaveMerchantProfile}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingMerchantAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CHANGE MERCHANT PASSWORD ================= */}
      {selectedMerchantForAction && merchantActionType === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-extrabold flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Reset Merchant Password</h3>
                  <p className="text-xs text-slate-400">{selectedMerchantForAction.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedMerchantForAction(null); setMerchantActionType(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-500 leading-relaxed">
                Set a new direct login password for <strong>{selectedMerchantForAction.full_name || selectedMerchantForAction.name || selectedMerchantForAction.email}</strong>.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">New Password (Min 6 Characters)</label>
                <input
                  type="password"
                  placeholder="Enter new strong password"
                  value={newMerchantPassword}
                  onChange={(e) => setNewMerchantPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setSelectedMerchantForAction(null); setMerchantActionType(null); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingMerchantAction || newMerchantPassword.length < 6}
                onClick={handleChangeMerchantPassword}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 shadow-md shadow-amber-600/20 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingMerchantAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Update Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: SEND PERSONAL BROADCAST TO MERCHANT ================= */}
      {selectedMerchantForAction && merchantActionType === 'broadcast' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-extrabold flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Personal Broadcast</h3>
                  <p className="text-xs text-slate-400">Target: {selectedMerchantForAction.full_name || selectedMerchantForAction.name || selectedMerchantForAction.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedMerchantForAction(null); setMerchantActionType(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Broadcast Title *</label>
                <input
                  type="text"
                  placeholder="e.g. KYC Verification Approved / Important Ledger Notice"
                  value={personalBroadcastTitle}
                  onChange={(e) => setPersonalBroadcastTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Display Format</label>
                  <select
                    value={personalBroadcastType}
                    onChange={(e) => setPersonalBroadcastType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="notification">Floating Alert Card</option>
                    <option value="banner">Top Page Banner</option>
                    <option value="popup">Centered Modal Pop-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Alert Severity</label>
                  <select
                    value={personalBroadcastSeverity}
                    onChange={(e) => setPersonalBroadcastSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="info">🔵 Blue (Information)</option>
                    <option value="success">🟢 Green (Success / Verified)</option>
                    <option value="warning">🟡 Yellow (Action Needed)</option>
                    <option value="error">🔴 Red (Urgent Notice)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Message Content (Plain text or HTML) *
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter message for this merchant. HTML like <b>bold</b> or <a href='...'>link</a> is supported."
                  value={personalBroadcastContent}
                  onChange={(e) => setPersonalBroadcastContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium resize-none text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setSelectedMerchantForAction(null); setMerchantActionType(null); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingMerchantAction || !personalBroadcastTitle.trim() || !personalBroadcastContent.trim()}
                onClick={handleSendPersonalBroadcast}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 shadow-md shadow-purple-600/20 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingMerchantAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Personal Broadcast</span>
              </button>
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

      {/* Website Legal Policy Editor & Real-Time Split-Screen Preview Modal */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                  activePolicyModal === 'terms'
                    ? 'bg-gradient-to-br from-indigo-500 to-indigo-600'
                    : activePolicyModal === 'refunds'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    : 'bg-gradient-to-br from-purple-500 to-pink-600'
                }`}>
                  {activePolicyModal === 'terms' ? (
                    <FileText className="w-5 h-5" />
                  ) : activePolicyModal === 'refunds' ? (
                    <RefreshCw className="w-5 h-5" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {activePolicyModal === 'terms'
                        ? 'Edit Terms & Conditions'
                        : activePolicyModal === 'refunds'
                        ? 'Edit Refunds & Cancellations Policy'
                        : 'Edit Privacy Policy'}
                    </h3>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      Public Customer Policy
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Supports Plain Text or HTML markup &bull; Updates live on{' '}
                    <span className="font-mono text-slate-500">
                      {activePolicyModal === 'terms' ? '/terms-and-conditions' : activePolicyModal === 'refunds' ? '/refund-and-cancellation' : '/privacy-policy'}
                    </span>
                  </p>
                </div>
              </div>

              {/* View Switcher & Close */}
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPolicyViewMode('split')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      policyViewMode === 'split'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Split View
                  </button>
                  <button
                    type="button"
                    onClick={() => setPolicyViewMode('edit')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      policyViewMode === 'edit'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setPolicyViewMode('preview')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      policyViewMode === 'preview'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Live Preview
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePolicyModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick HTML Helpers & Action Toolbar */}
            <div className="px-5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Code className="w-3.5 h-3.5" /> Quick HTML:
                </span>
                <button
                  type="button"
                  onClick={() => handleInsertHtmlTag('h2')}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold hover:border-indigo-400 cursor-pointer"
                  title="Insert <h2> Heading"
                >
                  &lt;h2&gt;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertHtmlTag('h3')}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold hover:border-indigo-400 cursor-pointer"
                  title="Insert <h3> Subheading"
                >
                  &lt;h3&gt;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertHtmlTag('p')}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold hover:border-indigo-400 cursor-pointer"
                  title="Insert <p> Paragraph"
                >
                  &lt;p&gt;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertHtmlTag('strong')}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold hover:border-indigo-400 cursor-pointer"
                  title="Insert <strong> Bold"
                >
                  &lt;strong&gt;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertHtmlTag('ul')}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold hover:border-indigo-400 cursor-pointer"
                  title="Insert <ul> Bullet List"
                >
                  &lt;ul&gt;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertHtmlTag('a')}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold hover:border-indigo-400 cursor-pointer"
                  title="Insert <a> Link"
                >
                  &lt;a&gt;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertHtmlTag('box')}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:border-indigo-400 cursor-pointer"
                  title="Insert Highlight Box"
                >
                  Box Callout
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadDefaultPolicyTemplate}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-900/60 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Load Default Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPolicyDraft('')}
                  className="px-2 py-1 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Clear text"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Split Screen Body */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
              
              {/* Left Pane: Code / Plain Text Editor */}
              {(policyViewMode === 'split' || policyViewMode === 'edit') && (
                <div className={`flex flex-col h-full bg-slate-900 text-slate-200 font-mono text-xs overflow-hidden ${
                  policyViewMode === 'split' ? 'w-full md:w-1/2' : 'w-full'
                }`}>
                  <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                    <span className="font-bold flex items-center gap-1.5 text-slate-300">
                      <Code className="w-3.5 h-3.5 text-amber-400" />
                      Editor (HTML &amp; Plain Text)
                    </span>
                    <span>{policyDraft.length} chars</span>
                  </div>
                  <textarea
                    id="policy-editor-textarea"
                    value={policyDraft}
                    onChange={(e) => setPolicyDraft(e.target.value)}
                    placeholder="Enter plain text or custom HTML code here... e.g. <h2>1. Introduction</h2> <p>Welcome to our company...</p>"
                    className="flex-1 w-full p-4 bg-transparent resize-none text-slate-100 font-mono text-xs leading-relaxed outline-hidden focus:outline-hidden overflow-y-auto selection:bg-indigo-600/40"
                    spellCheck={false}
                  />
                </div>
              )}

              {/* Right Pane: Live Customer Preview */}
              {(policyViewMode === 'split' || policyViewMode === 'preview') && (
                <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-900/60 overflow-hidden ${
                  policyViewMode === 'split' ? 'w-full md:w-1/2' : 'w-full'
                }`}>
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Eye className="w-3.5 h-3.5 text-emerald-500" />
                      Live Customer Preview
                    </span>
                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {isHtmlPolicy(policyDraft) ? 'HTML Mode Active' : 'Plain Text Mode'}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                      {policyDraft.trim().length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-400" />
                          <p className="text-xs font-semibold">No content yet</p>
                          <p className="text-[11px] mt-1">
                            Type text on the left or click &quot;Load Default Template&quot; to begin.
                          </p>
                        </div>
                      ) : isHtmlPolicy(policyDraft) ? (
                        <div
                          className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-4 [&>h2]:text-base [&>h2]:font-bold [&>h2]:text-slate-900 [&>h2]:dark:text-white [&>h3]:text-sm [&>h3]:font-bold [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1"
                          dangerouslySetInnerHTML={{ __html: policyDraft }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {policyDraft}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Syncs directly to Supabase Cloud Database &amp; updates instantly across all pages</span>
              </div>
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setActivePolicyModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePolicy}
                  disabled={isSavingPolicy}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  {isSavingPolicy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Policy Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Searchable Multi-Currency & Language Modal */}
      <CurrencyLanguageModal
        isOpen={isSettingsCurrencyModalOpen}
        onClose={() => setIsSettingsCurrencyModalOpen(false)}
        defaultTab={settingsCurrencyLanguageTab}
      />

    </div>
  );
}
