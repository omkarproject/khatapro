'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/utils';
import { NoteItem, TaskItem, PasswordItem, AuthenticatorItem } from '@/types';
import { generateTotpToken, formatTotpCode, parseOtpAuthUri } from '@/lib/totp';
import {
  NotebookPen,
  CheckSquare,
  Lock,
  Plus,
  Search,
  Pin,
  Clock,
  Calendar,
  Trash2,
  Edit2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Filter,
  Sparkles,
  ChevronRight,
  X,
  Tag,
  KeyRound,
  Key,
  Layers,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Bell,
  Smartphone,
  Shield,
  RefreshCw,
  Fingerprint,
  Timer
} from 'lucide-react';

const NOTE_COLORS = [
  { id: 'amber', name: 'Amber Glow', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/40', text: 'text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
  { id: 'emerald', name: 'Emerald Mint', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/40', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { id: 'sky', name: 'Sky Breeze', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-800/40', text: 'text-sky-800 dark:text-sky-300', dot: 'bg-sky-500' },
  { id: 'indigo', name: 'Indigo Night', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800/40', text: 'text-indigo-800 dark:text-indigo-300', dot: 'bg-indigo-500' },
  { id: 'rose', name: 'Rose Sunset', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800/40', text: 'text-rose-800 dark:text-rose-300', dot: 'bg-rose-500' },
  { id: 'purple', name: 'Purple Royal', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800/40', text: 'text-purple-800 dark:text-purple-300', dot: 'bg-purple-500' },
];

export default function NotesAndTasksPage() {
  const {
    notes,
    saveNote,
    deleteNote,
    tasks,
    saveTask,
    toggleTask,
    deleteTask,
    passwords,
    savePassword,
    deletePassword,
    authenticators = [],
    saveAuthenticator,
    deleteAuthenticator,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'notes' | 'tasks' | 'passwords' | 'authenticator'>('notes');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Authenticator (2FA) State ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingAuthId, setEditingAuthId] = useState<string | null>(null);
  const [authIssuer, setAuthIssuer] = useState('');
  const [authAccountName, setAuthAccountName] = useState('');
  const [authSecret, setAuthSecret] = useState('');
  const [authCategory, setAuthCategory] = useState<AuthenticatorItem['category']>('Cloud & Dev');
  const [authNotes, setAuthNotes] = useState('');
  const [authCategoryFilter, setAuthCategoryFilter] = useState<string>('all');
  const [copiedAuthId, setCopiedAuthId] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // 30-Second Live Clock & Regenerate Animation State
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [justRegenerated, setJustRegenerated] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);
      setCurrentTimeSec(prev => {
        if (Math.floor(nowSec / 30) !== Math.floor(prev / 30)) {
          setJustRegenerated(true);
          setTimeout(() => setJustRegenerated(false), 900);
        }
        return nowSec;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const remainingSec = 30 - (currentTimeSec % 30);
  const progressPercent = (remainingSec / 30) * 100;

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // --- Note Modal State ---
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [noteReminderDate, setNoteReminderDate] = useState('');
  const [noteReminderTime, setNoteReminderTime] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteItem['category']>('General');
  const [noteColor, setNoteColor] = useState('amber');
  const [noteIsPinned, setNoteIsPinned] = useState(false);
  const [noteAttachedImage, setNoteAttachedImage] = useState<string | undefined>(undefined);
  const noteFileInputRef = React.useRef<HTMLInputElement>(null);

  // --- Task Modal & Quick Add State ---
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskReminderDate, setTaskReminderDate] = useState('');
  const [taskReminderTime, setTaskReminderTime] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskItem['priority']>('medium');
  const [taskCategory, setTaskCategory] = useState('Business');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // --- Password Modal & Copy State ---
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [passAppName, setPassAppName] = useState('');
  const [passUsername, setPassUsername] = useState('');
  const [passPassword, setPassPassword] = useState('');
  const [passRecoveryKey, setPassRecoveryKey] = useState('');
  const [passAttachedImage, setPassAttachedImage] = useState<string | undefined>(undefined);
  const [passWebsiteUrl, setPassWebsiteUrl] = useState('');
  const [passNotes, setPassNotes] = useState('');
  const [passCategory, setPassCategory] = useState<PasswordItem['category']>('Banking');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<{ id: string; field: 'user' | 'pass' | 'recovery' } | null>(null);
  const passFileInputRef = React.useRef<HTMLInputElement>(null);

  // Image upload handler helper
  const handleProcessImage = (file: File, callback: (base64: string) => void) => {
    if (file.size > 8 * 1024 * 1024) {
      addToast('File Too Large', 'Please upload an image smaller than 8MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      callback(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // --- Copy Helper ---
  const handleCopyText = (id: string, text: string, field: 'user' | 'pass' | 'recovery', label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField({ id, field });
    addToast('Copied to Clipboard', `${label} copied successfully!`, 'info');
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // --- Note Actions ---
  const openCreateNoteModal = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteDesc('');
    setNoteReminderDate('');
    setNoteReminderTime('');
    setNoteCategory('General');
    setNoteColor('amber');
    setNoteIsPinned(false);
    setNoteAttachedImage(undefined);
    setIsNoteModalOpen(true);
  };

  const openEditNoteModal = (note: NoteItem) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteDesc(note.description);
    setNoteReminderDate(note.reminderDate || '');
    setNoteReminderTime(note.reminderTime || '');
    setNoteCategory(note.category || 'General');
    setNoteColor(note.color || 'amber');
    setNoteIsPinned(Boolean(note.isPinned));
    setNoteAttachedImage(note.attachedImage);
    setIsNoteModalOpen(true);
  };

  const handleSaveNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      addToast('Title Required', 'Please enter note heading.', 'error');
      return;
    }

    const noteToSave: NoteItem = {
      id: editingNoteId || `note_${Date.now()}`,
      title: noteTitle.trim(),
      description: noteDesc.trim(),
      reminderDate: noteReminderDate || undefined,
      reminderTime: noteReminderTime || undefined,
      category: noteCategory,
      color: noteColor,
      isPinned: noteIsPinned,
      attachedImage: noteAttachedImage,
      createdAt: editingNoteId ? (notes.find(n => n.id === editingNoteId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveNote(noteToSave);
    setIsNoteModalOpen(false);
  };

  // --- Task Actions ---
  const openCreateTaskModal = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskDueDate('');
    setTaskReminderDate('');
    setTaskReminderTime('');
    setTaskPriority('medium');
    setTaskCategory('Business');
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskDueDate(task.dueDate || '');
    setTaskReminderDate(task.reminderDate || '');
    setTaskReminderTime(task.reminderTime || '');
    setTaskPriority(task.priority);
    setTaskCategory(task.category || 'Business');
    setIsTaskModalOpen(true);
  };

  const handleSaveTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      addToast('Title Required', 'Please enter task heading.', 'error');
      return;
    }

    const taskToSave: TaskItem = {
      id: editingTaskId || `task_${Date.now()}`,
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      isCompleted: editingTaskId ? (tasks.find(t => t.id === editingTaskId)?.isCompleted || false) : false,
      dueDate: taskDueDate || undefined,
      reminderDate: taskReminderDate || undefined,
      reminderTime: taskReminderTime || undefined,
      priority: taskPriority,
      category: taskCategory,
      createdAt: editingTaskId ? (tasks.find(t => t.id === editingTaskId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    saveTask(taskToSave);
    setIsTaskModalOpen(false);
  };

  // --- Password Actions ---
  const openCreatePasswordModal = () => {
    setEditingPasswordId(null);
    setPassAppName('');
    setPassUsername('');
    setPassPassword('');
    setPassRecoveryKey('');
    setPassAttachedImage(undefined);
    setPassWebsiteUrl('');
    setPassNotes('');
    setPassCategory('Banking');
    setIsPasswordModalOpen(true);
  };

  const openEditPasswordModal = (item: PasswordItem) => {
    setEditingPasswordId(item.id);
    setPassAppName(item.appName);
    setPassUsername(item.username);
    setPassPassword(item.password);
    setPassRecoveryKey(item.recoveryKey || '');
    setPassAttachedImage(item.attachedImage);
    setPassWebsiteUrl(item.websiteUrl || '');
    setPassNotes(item.notes || '');
    setPassCategory(item.category || 'Banking');
    setIsPasswordModalOpen(true);
  };

  const handleSavePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passAppName.trim()) {
      addToast('Name Required', 'Please enter web or app name.', 'error');
      return;
    }
    if (!passUsername.trim() || !passPassword.trim()) {
      addToast('Credentials Required', 'Username and password are required.', 'error');
      return;
    }

    const itemToSave: PasswordItem = {
      id: editingPasswordId || `pass_${Date.now()}`,
      appName: passAppName.trim(),
      username: passUsername.trim(),
      password: passPassword.trim(),
      recoveryKey: passRecoveryKey.trim() || undefined,
      attachedImage: passAttachedImage,
      websiteUrl: passWebsiteUrl.trim() || undefined,
      notes: passNotes.trim() || undefined,
      category: passCategory,
      createdAt: editingPasswordId ? (passwords.find(p => p.id === editingPasswordId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePassword(itemToSave);
    setIsPasswordModalOpen(false);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Filters ---
  const filteredNotes = useMemo(() => {
    return (notes || [])
      .filter(n => {
        const query = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(query) || n.description.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [notes, searchQuery]);

  const filteredTasks = useMemo(() => {
    return (tasks || []).filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchSearch) return false;
      if (taskFilter === 'pending') return !t.isCompleted;
      if (taskFilter === 'completed') return t.isCompleted;
      return true;
    });
  }, [tasks, searchQuery, taskFilter]);

  const completedTasksCount = useMemo(() => {
    return (tasks || []).filter(t => t.isCompleted).length;
  }, [tasks]);

  const filteredPasswords = useMemo(() => {
    return (passwords || []).filter(p => {
      const query = searchQuery.toLowerCase();
      return p.appName.toLowerCase().includes(query) ||
        p.username.toLowerCase().includes(query) ||
        (p.notes && p.notes.toLowerCase().includes(query));
    });
  }, [passwords, searchQuery]);

  // --- Authenticator Actions ---
  const openCreateAuthModal = () => {
    setEditingAuthId(null);
    setAuthIssuer('');
    setAuthAccountName('');
    setAuthSecret('');
    setAuthCategory('Cloud & Dev');
    setAuthNotes('');
    setIsAuthModalOpen(true);
  };

  const openEditAuthModal = (item: AuthenticatorItem) => {
    setEditingAuthId(item.id);
    setAuthIssuer(item.issuer);
    setAuthAccountName(item.accountName);
    setAuthSecret(item.secret);
    setAuthCategory(item.category || 'Cloud & Dev');
    setAuthNotes(item.notes || '');
    setIsAuthModalOpen(true);
  };

  const handleSecretInputChange = (val: string) => {
    if (val.trim().startsWith('otpauth://')) {
      const parsed = parseOtpAuthUri(val);
      setAuthSecret(parsed.secret);
      if (parsed.issuer && !authIssuer) setAuthIssuer(parsed.issuer);
      if (parsed.accountName && !authAccountName) setAuthAccountName(parsed.accountName);
      addToast('QR URI Detected', 'Secret key & account details auto-extracted!', 'info');
    } else {
      setAuthSecret(val.toUpperCase().replace(/\s+/g, ''));
    }
  };

  const handleSaveAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authIssuer.trim()) {
      addToast('Issuer Required', 'Please enter service or app name (e.g. Google, GitHub).', 'error');
      return;
    }
    if (!authSecret.trim()) {
      addToast('Secret Key Required', 'Please enter your 2FA Base32 secret key.', 'error');
      return;
    }

    const cleanSecret = authSecret.toUpperCase().replace(/[\s\-_]/g, '');
    const itemToSave: AuthenticatorItem = {
      id: editingAuthId || `auth_${Date.now()}`,
      issuer: authIssuer.trim(),
      accountName: authAccountName.trim() || 'Account',
      secret: cleanSecret,
      category: authCategory,
      notes: authNotes.trim() || undefined,
      createdAt: editingAuthId
        ? authenticators.find(a => a.id === editingAuthId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveAuthenticator(itemToSave);
    setIsAuthModalOpen(false);
  };

  const copyTotpCode = (item: AuthenticatorItem) => {
    const code = generateTotpToken(item.secret, currentTimeSec);
    if (!code || code === '------') {
      addToast('Invalid Secret', 'Could not generate 2FA token from this secret.', 'error');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedAuthId(item.id);
    setTimeout(() => setCopiedAuthId(null), 2000);
    addToast('2FA Code Copied', `${item.issuer} code (${formatTotpCode(code)}) copied to clipboard!`, 'success');
  };

  const toggleRevealSecret = (id: string) => {
    setRevealedSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getIssuerBrand = (issuer: string) => {
    const norm = issuer.toLowerCase().trim();
    if (norm.includes('google') || norm.includes('gmail')) {
      return {
        initials: 'G',
        gradient: 'from-rose-500 to-amber-500',
        ring: 'border-rose-500/30',
        tag: 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
      };
    }
    if (norm.includes('github')) {
      return {
        initials: 'GH',
        gradient: 'from-slate-700 to-slate-900',
        ring: 'border-slate-500/30',
        tag: 'bg-slate-500/10 text-slate-700 dark:text-slate-300'
      };
    }
    if (norm.includes('microsoft') || norm.includes('outlook') || norm.includes('azure')) {
      return {
        initials: 'MS',
        gradient: 'from-blue-600 to-cyan-500',
        ring: 'border-blue-500/30',
        tag: 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
      };
    }
    if (norm.includes('amazon') || norm.includes('aws')) {
      return {
        initials: 'AWS',
        gradient: 'from-amber-500 to-orange-600',
        ring: 'border-amber-500/30',
        tag: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      };
    }
    if (norm.includes('supabase')) {
      return {
        initials: 'SB',
        gradient: 'from-emerald-500 to-teal-700',
        ring: 'border-emerald-500/30',
        tag: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
      };
    }
    if (norm.includes('bank') || norm.includes('hdfc') || norm.includes('sbi') || norm.includes('icici') || norm.includes('axis')) {
      return {
        initials: 'BK',
        gradient: 'from-violet-600 to-indigo-700',
        ring: 'border-violet-500/30',
        tag: 'bg-violet-500/10 text-violet-500 dark:text-violet-400'
      };
    }
    if (norm.includes('binance') || norm.includes('crypto')) {
      return {
        initials: 'BN',
        gradient: 'from-yellow-500 to-amber-600',
        ring: 'border-yellow-500/30',
        tag: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
      };
    }
    return {
      initials: (issuer.slice(0, 2) || '2F').toUpperCase(),
      gradient: 'from-cyan-500 to-blue-600',
      ring: 'border-cyan-500/30',
      tag: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
    };
  };

  const filteredAuthenticators = useMemo(() => {
    return (authenticators || []).filter(a => {
      const query = searchQuery.toLowerCase();
      const matchSearch =
        a.issuer.toLowerCase().includes(query) ||
        a.accountName.toLowerCase().includes(query) ||
        (a.notes && a.notes.toLowerCase().includes(query));
      if (!matchSearch) return false;
      if (authCategoryFilter !== 'all') {
        return (a.category || 'Other') === authCategoryFilter;
      }
      return true;
    });
  }, [authenticators, searchQuery, authCategoryFilter]);

  return (
    <div className="space-y-6">
      
      {/* Header Banner - Slim Strip (Patli Patti) */}
      <div className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xs sm:text-sm font-black text-white tracking-wide">
              Notes, Tasks &amp; Password Manager
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              Productivity Workspace
            </span>
          </div>
        </div>

        {/* Quick Counter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-1.5 text-[11px]">
            <NotebookPen className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">{notes.length} Notes</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-1.5 text-[11px]">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">{completedTasksCount}/{tasks.length} Done</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-1.5 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold">{passwords.length} Vault Keys</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-cyan-500/40 flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-cyan-300">{authenticators.length} 2FA Keys</span>
          </div>
        </div>
      </div>

      {/* 4 Main Tabs Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex-wrap">
          <button
            type="button"
            onClick={() => { setActiveTab('notes'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <NotebookPen className="w-4 h-4" />
            <span>Notes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'notes' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
              {notes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('tasks'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Tasks</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'tasks' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
              {tasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('passwords'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'passwords'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Password Manager</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'passwords' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
              {passwords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('authenticator'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'authenticator'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Authenticator</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'authenticator' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
              {authenticators.length}
            </span>
          </button>
        </div>

        {/* Search & New Record Action */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search in ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {activeTab === 'notes' && (
            <button
              onClick={openCreateNoteModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/25 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Note</span>
            </button>
          )}

          {activeTab === 'tasks' && (
            <button
              onClick={openCreateTaskModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          )}

          {activeTab === 'passwords' && (
            <button
              onClick={openCreatePasswordModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Password</span>
            </button>
          )}

          {activeTab === 'authenticator' && (
            <button
              onClick={openCreateAuthModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/25 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add 2FA Account</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: NOTES VIEW                                              */}
      {/* ============================================================== */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="glass-card p-10 text-center space-y-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <NotebookPen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {searchQuery ? 'Koi matching note nahi mila' : 'Abhi tak koi note add nahi kiya'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Dukaan ke hisab-kitab, important reminders ya vyapar ke vicharon ko likhein aur Notifications & Alerts ke sath reminder set karein.
                </p>
              </div>
              <button
                onClick={openCreateNoteModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Pehla Note Likhein</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => {
                const colorConfig = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];
                const hasReminder = Boolean(note.reminderDate);
                const isOverdueReminder = hasReminder && note.reminderDate! <= new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={note.id}
                    className={`rounded-2xl p-4 border transition-all hover:shadow-lg relative flex flex-col justify-between group ${colorConfig.bg} ${colorConfig.border}`}
                  >
                    <div>
                      {/* Top Meta Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {note.isPinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs">
                              <Pin className="w-2.5 h-2.5" />
                              Pinned
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                            {note.category || 'General'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => openEditNoteModal(note)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Note"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Kya aap note "${note.title}" delete karna chahte hain?`)) {
                                deleteNote(note.id);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1.5 leading-snug">
                        {note.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">
                        {note.description}
                      </p>

                      {/* Attached Image Thumbnail */}
                      {note.attachedImage && (
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: note.attachedImage!, title: note.title })}
                            className="relative rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 group/img block w-full text-left cursor-pointer"
                          >
                            <img
                              src={note.attachedImage}
                              alt={note.title}
                              className="w-full h-32 object-cover transition-transform group-hover/img:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Image</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bottom Reminder & Timestamp Footer */}
                    <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                      {hasReminder ? (
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold font-mono ${
                            isOverdueReminder
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          }`}
                          title="Triggers alert in Notifications & Alerts"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(note.reminderDate!)} {note.reminderTime && `• ${note.reminderTime}`}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">
                          Created: {formatDate(note.createdAt.split('T')[0])}
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400">
                        {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: TASKS VIEW                                              */}
      {/* ============================================================== */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Tasks Progress & Filter Toolbar */}
          <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Task Progress: {completedTasksCount} of {tasks.length} Completed</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-48 sm:w-60 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTaskFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  taskFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('pending')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  taskFilter === 'pending'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Pending ({tasks.length - completedTasksCount})
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('completed')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  taskFilter === 'completed'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Completed ({completedTasksCount})
              </button>
            </div>
          </div>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="glass-card p-10 text-center space-y-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {searchQuery ? 'Koi matching task nahi mila' : 'Koi pending task nahi hai'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Apne roz ke to-do items add karein aur complete hone par tick karein.
                </p>
              </div>
              <button
                onClick={openCreateTaskModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Naya Task Add Karein</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((task) => {
                const isOverdue = task.dueDate && !task.isCompleted && task.dueDate < new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 group ${
                      task.isCompleted
                        ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/50 opacity-75'
                        : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-indigo-500/30'
                    }`}
                  >
                    {/* Checkbox and Text */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          task.isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white dark:bg-slate-800'
                        }`}
                        title={task.isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                      >
                        {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold transition-all ${
                              task.isCompleted
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </span>

                          {/* Priority Badge */}
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wider ${
                              task.priority === 'high'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/50'
                                : task.priority === 'medium'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {task.priority}
                          </span>

                          {task.category && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                              {task.category}
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p
                            className={`text-xs mt-1 leading-relaxed ${
                              task.isCompleted ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {task.description}
                          </p>
                        )}

                        {/* Due Date Indicator */}
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {task.dueDate && (
                            <div
                              className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                                isOverdue
                                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Due: {formatDate(task.dueDate)}</span>
                              {isOverdue && <span className="text-rose-600 dark:text-rose-400 font-extrabold">(Overdue)</span>}
                            </div>
                          )}

                          {task.reminderDate && (
                            <div
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60"
                              title="Alert in Notifications & Alerts"
                            >
                              <Bell className="w-3 h-3 text-amber-500" />
                              <span>Reminder: {formatDate(task.reminderDate)} {task.reminderTime && `• ${task.reminderTime}`}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEditTaskModal(task)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Kya aap task "${task.title}" delete karna chahte hain?`)) {
                            deleteTask(task.id);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PASSWORD MANAGER VIEW                                   */}
      {/* ============================================================== */}
      {activeTab === 'passwords' && (
        <div className="space-y-4">
          {/* Security Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="font-bold text-indigo-950 dark:text-indigo-200">
                  Private & Encrypted Local Vault
                </span>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400">
                  Aapke passwords aapke local device me surakshit hain. Username ya password pe click karke turant copy karein.
                </p>
              </div>
            </div>
          </div>

          {filteredPasswords.length === 0 ? (
            <div className="glass-card p-10 text-center space-y-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {searchQuery ? 'Koi matching password nahi mila' : 'Abhi koi credentials save nahi hain'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  GST Portal, Bank Netbanking, Amazon Business, ya Swiggy login details yahan save karein aur 1-click me copy karein.
                </p>
              </div>
              <button
                onClick={openCreatePasswordModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Login Credentials</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPasswords.map((item) => {
                const isPasswordVisible = Boolean(visiblePasswords[item.id]);
                const isUserCopied = copiedField?.id === item.id && copiedField.field === 'user';
                const isPassCopied = copiedField?.id === item.id && copiedField.field === 'pass';

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl glass-card border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                            {item.appName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {item.appName}
                            </h3>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                              {item.category || 'General'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {item.websiteUrl && (
                            <a
                              href={item.websiteUrl.startsWith('http') ? item.websiteUrl : `https://${item.websiteUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Visit Website"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditPasswordModal(item)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete credentials for ${item.appName}?`)) {
                                deletePassword(item.id);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Username Field with Click-To-Copy */}
                      <div className="space-y-1 mt-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Username / ID
                        </label>
                        <button
                          type="button"
                          onClick={() => handleCopyText(item.id, item.username, 'user', 'Username')}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-500/50 transition-all text-left cursor-pointer group/user"
                          title="Click to copy username"
                        >
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                            {item.username}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                            {isUserCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500 font-extrabold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 opacity-60 group-hover/user:opacity-100" />
                                <span className="opacity-0 group-hover/user:opacity-100 transition-opacity">Copy</span>
                              </>
                            )}
                          </span>
                        </button>
                      </div>

                      {/* Password Field with Click-To-Copy & Show/Hide Eye */}
                      <div className="space-y-1 mt-2.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Password
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyText(item.id, item.password, 'pass', 'Password')}
                            className="flex-1 flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-500/50 transition-all text-left cursor-pointer group/pass"
                            title="Click to copy password"
                          >
                            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                              {isPasswordVisible ? item.password : '••••••••••••'}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                              {isPassCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-extrabold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 opacity-60 group-hover/pass:opacity-100" />
                                  <span className="opacity-0 group-hover/pass:opacity-100 transition-opacity">Copy</span>
                                </>
                              )}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(item.id)}
                            className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                            title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Recovery Key with 1-click copy */}
                      {item.recoveryKey && (
                        <div className="space-y-1 mt-2.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Key className="w-3 h-3" />
                            <span>Recovery / Backup Key</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleCopyText(item.id, item.recoveryKey!, 'recovery', 'Recovery Key')}
                            className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 hover:border-amber-500 transition-all text-left cursor-pointer group/rec"
                            title="Click to copy recovery key"
                          >
                            <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200 truncate pr-2">
                              {item.recoveryKey}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                              {copiedField?.id === item.id && copiedField.field === 'recovery' ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-extrabold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 opacity-60 group-hover/rec:opacity-100" />
                                  <span className="opacity-0 group-hover/rec:opacity-100 transition-opacity">Copy</span>
                                </>
                              )}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Attached Backup Image / QR */}
                      {item.attachedImage && (
                        <div className="mt-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-indigo-500" />
                            <span>Attached 2FA / Backup Photo</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: item.attachedImage!, title: `${item.appName} - Backup Attachment` })}
                            className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group/passimg block w-full text-left cursor-pointer"
                          >
                            <img
                              src={item.attachedImage}
                              alt={`${item.appName} backup`}
                              className="w-full h-24 object-contain bg-slate-950/90"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/passimg:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Attachment</span>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* Notes / Hints if present */}
                      {item.notes && (
                        <div className="mt-2.5 p-2 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 italic">
                          💡 {item.notes}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                      <span>Updated: {formatDate(item.updatedAt?.split('T')[0] || item.createdAt.split('T')[0])}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">1-Click Copy Ready</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: AUTHENTICATOR (2FA) VIEW                                */}
      {/* ============================================================== */}
      {activeTab === 'authenticator' && (
        <div className="space-y-4">
          {/* Subheader: Category Filter Chips & Master 30s Countdown Clock */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {['all', 'Cloud & Dev', 'Banking & Crypto', 'Email & Social', 'Business', 'Other'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAuthCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    authCategoryFilter === cat
                      ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat === 'all' ? `All (${authenticators.length})` : cat}
                </button>
              ))}
            </div>

            {/* Master 30-Second Countdown Clock Banner */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white shrink-0 self-start sm:self-auto shadow-inner">
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg className="w-6 h-6 -rotate-90 transform">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="text-slate-800" fill="transparent" />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray={56.5}
                    strokeDashoffset={56.5 - (56.5 * remainingSec) / 30}
                    className={`transition-all duration-700 ${
                      remainingSec <= 5 ? 'text-rose-500' : remainingSec <= 10 ? 'text-amber-500' : 'text-cyan-400'
                    }`}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-[8px] font-mono font-black text-white">{remainingSec}</span>
              </div>
              <div className="text-[11px] font-mono flex items-center gap-1.5">
                <span className="text-slate-400">Regenerates in:</span>
                <span className={`font-black tracking-wider ${remainingSec <= 5 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
                  {remainingSec}s
                </span>
                <RefreshCw className={`w-3 h-3 text-slate-500 ${remainingSec <= 3 || justRegenerated ? 'animate-spin text-cyan-400' : ''}`} />
              </div>
            </div>
          </div>

          {/* Cards Grid or Empty State */}
          {filteredAuthenticators.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mx-auto border border-cyan-500/20">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {searchQuery || authCategoryFilter !== 'all'
                  ? 'Koi 2FA Account Match Nahi Hua'
                  : 'Abhi tak koi 2FA Authenticator Account nahi joda gaya'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Google, GitHub, Supabase, Amazon AWS ya Banking accounts ke 2FA Secret Key yahan surakshit save karein aur Authenticator app ki tarah live 30-second rotating security codes payein.
              </p>
              <button
                type="button"
                onClick={openCreateAuthModal}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/25 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Pehla 2FA Account Jodein</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAuthenticators.map((item) => {
                const brand = getIssuerBrand(item.issuer);
                const code = generateTotpToken(item.secret, currentTimeSec);
                const formattedCode = formatTotpCode(code);
                const isCopied = copiedAuthId === item.id;
                const isSecretVisible = revealedSecrets[item.id] || false;
                const isExpiring = remainingSec <= 5;

                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl p-5 bg-white dark:bg-slate-900 border transition-all duration-300 shadow-md flex flex-col justify-between gap-4 ${
                      isExpiring
                        ? 'border-rose-500/40 dark:border-rose-500/40 shadow-rose-500/5'
                        : justRegenerated
                        ? 'border-cyan-400/60 dark:border-cyan-400/60 shadow-cyan-500/20 ring-1 ring-cyan-400/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row: Brand Avatar, Issuer & Account, Actions */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Dynamic Brand Gradient Avatar */}
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${brand.gradient} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md tracking-wider`}
                        >
                          {brand.initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {item.issuer}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {item.accountName}
                          </p>
                        </div>
                      </div>

                      {/* Top Right: Category & Edit/Delete Menu */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${brand.tag}`}>
                          {item.category || 'Other'}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditAuthModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit 2FA Account"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete 2FA key for ${item.issuer}?`)) {
                              deleteAuthenticator(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Delete 2FA Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Central 2FA Code Box with Interactive Click-to-Copy */}
                    <div
                      onClick={() => copyTotpCode(item)}
                      className={`relative p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center cursor-pointer transition-all active:scale-[0.99] group overflow-hidden ${
                        isExpiring
                          ? 'border-rose-500/50 shadow-lg shadow-rose-950/30'
                          : justRegenerated
                          ? 'border-cyan-400/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/40'
                          : 'hover:border-slate-700'
                      }`}
                      title="Click to copy 6-digit code"
                    >
                      {/* Subtle Ambient Pulse Background Glow */}
                      <div
                        className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-all duration-700 ${
                          isExpiring
                            ? 'bg-rose-500/25'
                            : justRegenerated
                            ? 'bg-cyan-400/35'
                            : 'bg-cyan-500/10'
                        }`}
                      />

                      <div className="flex items-center justify-between px-2">
                        {/* 6-Digit Monospace Code */}
                        <div className="flex-1 text-left">
                          <span
                            className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-widest transition-all duration-300 block select-all ${
                              isExpiring
                                ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                : justRegenerated
                                ? 'text-cyan-200 scale-105 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]'
                                : 'text-cyan-400 dark:text-cyan-300'
                            }`}
                          >
                            {formattedCode}
                          </span>
                        </div>

                        {/* Circular 30s Countdown Ring Widget */}
                        <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                          <svg className="w-11 h-11 -rotate-90 transform">
                            <circle
                              cx="22"
                              cy="22"
                              r="17"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              className="text-slate-800"
                              fill="transparent"
                            />
                            <circle
                              cx="22"
                              cy="22"
                              r="17"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeDasharray={106.8}
                              strokeDashoffset={106.8 - (106.8 * remainingSec) / 30}
                              className={`transition-all duration-700 ${
                                isExpiring
                                  ? 'text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                                  : remainingSec <= 10
                                  ? 'text-amber-400'
                                  : 'text-cyan-400'
                              }`}
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <span
                            className={`absolute text-[11px] font-mono font-black ${
                              isExpiring ? 'text-rose-400 animate-pulse' : 'text-white'
                            }`}
                          >
                            {remainingSec}s
                          </span>
                        </div>
                      </div>

                      {/* Click-to-copy Status Label */}
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        {isCopied ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-bold animate-in fade-in">
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied to Clipboard!</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-400 group-hover:text-cyan-300 transition-colors">
                            <Copy className="w-3 h-3 text-cyan-400" />
                            <span>Click code to copy</span>
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-500">
                          {isExpiring ? 'Expiring soon...' : '30s TOTP'}
                        </span>
                      </div>
                    </div>

                    {/* Secret Key Row (Masked by default with toggle & copy) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <KeyRound className="w-3 h-3 text-cyan-500" />
                          <span>Secret Key:</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleRevealSecret(item.id)}
                            className="p-1 hover:text-cyan-500 transition-colors cursor-pointer"
                            title={isSecretVisible ? 'Hide Secret Key' : 'Reveal Secret Key'}
                          >
                            {isSecretVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                navigator.clipboard.writeText(item.secret);
                                addToast('Secret Copied', 'Base32 secret key copied.', 'info');
                              }
                            }}
                            className="p-1 hover:text-cyan-500 transition-colors cursor-pointer"
                            title="Copy Secret Key"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 truncate">
                        {isSecretVisible ? item.secret : `•••• •••• •••• ${item.secret.slice(-4)}`}
                      </div>

                      {/* Optional Note */}
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 italic truncate pt-0.5">
                          💡 {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ADD / EDIT NOTE MODAL                                 */}
      {/* ============================================================== */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <NotebookPen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {editingNoteId ? 'Edit Note' : 'Add New Note'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Heading, details aur reminder date set karein
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNoteSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              {/* Note Heading */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Note Heading / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GST Tax payment date, Customer bulk order note"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Note Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Note Description / Content *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Pura vivaran likhein..."
                  value={noteDesc}
                  onChange={(e) => setNoteDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white leading-relaxed resize-none"
                />
              </div>

              {/* Set Reminder Date & Time */}
              <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Set Reminder (Notifications & Alerts me aayega)</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Reminder Date
                    </label>
                    <input
                      type="date"
                      value={noteReminderDate}
                      onChange={(e) => setNoteReminderDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Reminder Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={noteReminderTime}
                      onChange={(e) => setNoteReminderTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Category & Pin Option */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="General">General</option>
                    <option value="Finance">Finance</option>
                    <option value="Customer">Customer</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={noteIsPinned}
                      onChange={(e) => setNoteIsPinned(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Pin note to top 📌</span>
                  </label>
                </div>
              </div>

              {/* Color Theme Palette */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Card Color Theme
                </label>
                <div className="flex items-center gap-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNoteColor(c.id)}
                      className={`w-7 h-7 rounded-full ${c.dot} transition-transform flex items-center justify-center cursor-pointer ${
                        noteColor === c.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    >
                      {noteColor === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attach Image (Receipts, Bill Photos, Reference) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Attach Image (Receipts, Bill Photos, Documents)
                </label>
                <input
                  type="file"
                  ref={noteFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessImage(file, (b64) => setNoteAttachedImage(b64));
                  }}
                />
                {noteAttachedImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                    <img src={noteAttachedImage} alt="Attachment" className="w-full h-36 object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNoteAttachedImage(undefined)}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                        title="Remove Image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => noteFileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:text-amber-600 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-amber-500" />
                    <span>Click to attach photo or receipt image</span>
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/25 transition-all cursor-pointer"
                >
                  {editingNoteId ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ADD / EDIT TASK MODAL                                 */}
      {/* ============================================================== */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {editingTaskId ? 'Edit Task' : 'Add New Task'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Heading, description aur complete checkbox ke liye
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTaskSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Task Heading / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call supplier for stock delivery, Verify GST return"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Task Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional details regarding the task..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white leading-relaxed resize-none"
                />
              </div>

              {/* Due Date & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              {/* Set Reminder Date & Time */}
              <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <Bell className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Set Reminder (Notifications &amp; Alerts me aayega)</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Reminder Date
                    </label>
                    <input
                      type="date"
                      value={taskReminderDate}
                      onChange={(e) => setTaskReminderDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Reminder Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={taskReminderTime}
                      onChange={(e) => setTaskReminderTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  {editingTaskId ? 'Update Task' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ADD / EDIT PASSWORD MODAL                             */}
      {/* ============================================================== */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {editingPasswordId ? 'Edit Credentials' : 'Add New Password Entry'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Web & app name, username, password aur security notes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePasswordSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              {/* Web & App Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Web & App Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GST Portal, HDFC Netbanking, IndiaMART, Amazon Business"
                  value={passAppName}
                  onChange={(e) => setPassAppName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Username / Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  User Name / Client ID / Email *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. merchant@company.com or 27AABCS1429B1Z"
                  value={passUsername}
                  onChange={(e) => setPassUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Password *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter secret password"
                  value={passPassword}
                  onChange={(e) => setPassPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Category & Website URL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={passCategory}
                    onChange={(e) => setPassCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="Banking">Banking</option>
                    <option value="Govt & Tax">Govt & Tax</option>
                    <option value="Business">Business</option>
                    <option value="Social">Social</option>
                    <option value="Utility">Utility</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Website URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://services.gst.gov.in"
                    value={passWebsiteUrl}
                    onChange={(e) => setPassWebsiteUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Security Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Notes (Security question, PIN hint, etc.)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Transaction PIN: 9876, Security answer: School name"
                  value={passNotes}
                  onChange={(e) => setPassNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 resize-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Recovery Key / 2FA Backup Seed Key */}
              <div>
                <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5" />
                  <span>Recovery Key / Backup Key / 2FA Seed (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABCD-EFGH-1234-5678 or 24-word backup mnemonic phrase"
                  value={passRecoveryKey}
                  onChange={(e) => setPassRecoveryKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Attach Image (2FA QR Screenshot, Backup Photo) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Attach Image (2FA QR Screenshot, Seed Key Photo)
                </label>
                <input
                  type="file"
                  ref={passFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessImage(file, (b64) => setPassAttachedImage(b64));
                  }}
                />
                {passAttachedImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                    <img src={passAttachedImage} alt="Backup Attachment" className="w-full h-36 object-contain bg-slate-950" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPassAttachedImage(undefined)}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                        title="Remove Image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => passFileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:text-indigo-600 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span>Click to attach 2FA QR screenshot or recovery photo</span>
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  {editingPasswordId ? 'Update Credentials' : 'Save to Password Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ADD / EDIT AUTHENTICATOR (2FA) MODAL                 */}
      {/* ============================================================== */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center border border-cyan-500/20">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {editingAuthId ? 'Edit 2FA Authenticator Account' : 'Add New 2FA Account'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Base32 Secret key ya otpauth QR URI daalein
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAuthSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              {/* Popular Issuer Quick Chips */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Popular Services (Quick Select)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { name: 'Google', cat: 'Email & Social' },
                    { name: 'GitHub', cat: 'Cloud & Dev' },
                    { name: 'Microsoft', cat: 'Cloud & Dev' },
                    { name: 'Supabase', cat: 'Cloud & Dev' },
                    { name: 'Amazon AWS', cat: 'Cloud & Dev' },
                    { name: 'Binance', cat: 'Banking & Crypto' },
                    { name: 'Netbanking', cat: 'Banking & Crypto' }
                  ].map(srv => (
                    <button
                      key={srv.name}
                      type="button"
                      onClick={() => {
                        setAuthIssuer(srv.name);
                        setAuthCategory(srv.cat as any);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                    >
                      +{srv.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service / Issuer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Service / App Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, GitHub, Supabase, Zerodha, HDFC Bank"
                  value={authIssuer}
                  onChange={(e) => setAuthIssuer(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Account / Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Account Identifier / Email (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. user@gmail.com, merchant_admin"
                  value={authAccountName}
                  onChange={(e) => setAuthAccountName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* 2FA Secret Key (or URI) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    2FA Secret Key (Base32) or otpauth:// URI *
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) handleSecretInputChange(text);
                        } catch {
                          // Clipboard read failed
                        }
                      }
                    }}
                    className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Paste from Clipboard
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. JBSWY3DPEHPK3PXP ya otpauth://totp/..."
                  value={authSecret}
                  onChange={(e) => handleSecretInputChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase tracking-wider"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tip: Agar aapke paas otpauth QR URI hai to yahan paste karein, secret key aur details auto-extract ho jayengi.
                </p>
              </div>

              {/* Live Preview Box inside Modal */}
              {authSecret.trim() && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/30 text-white space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Live 2FA Code Preview:</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Window: {remainingSec}s left
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <span className="font-mono text-2xl font-black text-cyan-300 tracking-widest">
                      {formatTotpCode(generateTotpToken(authSecret, currentTimeSec))}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      Algorithm Active ✓
                    </span>
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={authCategory}
                  onChange={(e) => setAuthCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                >
                  <option value="Cloud & Dev">Cloud &amp; Dev (Google, GitHub, Supabase, AWS)</option>
                  <option value="Banking & Crypto">Banking &amp; Crypto (Banks, Binance, Zerodha)</option>
                  <option value="Email & Social">Email &amp; Social (Gmail, Discord, Twitter)</option>
                  <option value="Business">Business (Shopify, Stripe, Internal CRM)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Registered with primary phone, backup emergency keys stored"
                  value={authNotes}
                  onChange={(e) => setAuthNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/25 transition-all cursor-pointer active:scale-95"
                >
                  {editingAuthId ? 'Update 2FA Account' : 'Save to Authenticator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlarged Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 text-white">
              <span className="text-xs font-bold truncate">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/40 max-h-[75vh] overflow-auto">
              <img src={previewImage.url} alt={previewImage.title} className="max-h-[70vh] w-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
