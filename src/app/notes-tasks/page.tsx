'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/utils';
import { NoteItem, TaskItem, PasswordItem } from '@/types';
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
  Layers,
  ArrowRight
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
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'notes' | 'tasks' | 'passwords'>('notes');
  const [searchQuery, setSearchQuery] = useState('');

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

  // --- Task Modal & Quick Add State ---
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskItem['priority']>('medium');
  const [taskCategory, setTaskCategory] = useState('Business');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // --- Password Modal & Copy State ---
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [passAppName, setPassAppName] = useState('');
  const [passUsername, setPassUsername] = useState('');
  const [passPassword, setPassPassword] = useState('');
  const [passWebsiteUrl, setPassWebsiteUrl] = useState('');
  const [passNotes, setPassNotes] = useState('');
  const [passCategory, setPassCategory] = useState<PasswordItem['category']>('Banking');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<{ id: string; field: 'user' | 'pass' } | null>(null);

  // --- Copy Helper ---
  const handleCopyText = (id: string, text: string, field: 'user' | 'pass', label: string) => {
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
    setTaskPriority('medium');
    setTaskCategory('Business');
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskDueDate(task.dueDate || '');
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

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Merchant Productivity Workspace
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
              Notes, Tasks & Password Manager
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Rozmarra ke vyapar ke zaroori notes likhein, tasks track karein aur apne sabhi official passwords surakshit manage karein.
            </p>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2 text-xs">
              <NotebookPen className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">{notes.length} Notes</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2 text-xs">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold">{completedTasksCount}/{tasks.length} Done</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2 text-xs">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">{passwords.length} Vault Keys</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Main Tabs Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => { setActiveTab('notes'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                        {task.dueDate && (
                          <div
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold mt-2 px-2 py-0.5 rounded-md ${
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

    </div>
  );
}
