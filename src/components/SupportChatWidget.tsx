'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { SupportTicket, SupportMessage } from '@/types';
import {
  MessageSquare,
  Headphones,
  LifeBuoy,
  X,
  Send,
  Paperclip,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  Search,
  ArrowLeft,
  User,
  Shield,
  Loader2,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export default function SupportChatWidget() {
  const { currentUser, addToast, t, settings } = useApp();
  const pathname = usePathname();
  const isDashboard = pathname === '/' || pathname === '';
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');
  const [ticketSearch, setTicketSearch] = useState('');

  // Listen for programmatic open requests (e.g. from Dashboard Support Card)
  useEffect(() => {
    const handleOpenSupport = (e: any) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (e?.detail?.ticketId) {
        setActiveTicketId(e.detail.ticketId);
      }
    };
    window.addEventListener('open_support_chat', handleOpenSupport);
    return () => window.removeEventListener('open_support_chat', handleOpenSupport);
  }, []);

  // New ticket state (Merchant)
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<'General' | 'Billing' | 'Technical' | 'Account'>('General');
  const [newInitialMsg, setNewInitialMsg] = useState('');
  const [newTicketImage, setNewTicketImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chat message input state
  const [messageText, setMessageText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Image full view preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newTicketFileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isAdmin = Boolean(
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.email === 'anantyadav8924@gmail.com'
  );

  // Fetch tickets
  const fetchTickets = async (silent = false) => {
    if (!currentUser) return;
    try {
      const url = `/api/support/tickets?userId=${encodeURIComponent(currentUser.id)}&isAdmin=${isAdmin}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.tickets)) {
        setTickets((prev) => {
          // Check for new incoming messages to notify
          if (silent && prev.length > 0) {
            data.tickets.forEach((newT: SupportTicket) => {
              const oldT = prev.find((p) => p.id === newT.id);
              if (oldT) {
                const oldMsgCount = oldT.messages?.length || 0;
                const newMsgCount = newT.messages?.length || 0;
                if (newMsgCount > oldMsgCount) {
                  const lastMsg = newT.messages[newMsgCount - 1];
                  if (isAdmin && lastMsg.senderRole === 'merchant') {
                    addToast('Support Ticket Alert', `New message from ${lastMsg.senderName}: "${lastMsg.text.substring(0, 40)}..."`, 'info');
                  } else if (!isAdmin && lastMsg.senderRole === 'admin') {
                    addToast('Support Team Replied', `Admin: "${lastMsg.text.substring(0, 40)}..."`, 'success');
                  }
                }
              } else if (isAdmin) {
                addToast('New Support Ticket Opened', `${newT.userName}: ${newT.subject}`, 'warning');
              }
            });
          }
          return data.tickets;
        });
      }
    } catch (e) {
      console.warn('Failed to load support tickets:', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
      const interval = setInterval(() => fetchTickets(true), 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser, isAdmin]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTicketId) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicketId, tickets]);

  if (!currentUser) return null;

  const activeTicket = tickets.find((t) => t.id === activeTicketId) || null;

  // Calculate unread count
  const unreadCount = tickets.reduce((acc, t) => {
    if (isAdmin && t.unreadByAdmin) return acc + 1;
    if (!isAdmin && t.unreadByMerchant) return acc + 1;
    return acc;
  }, 0);

  // Handle Image Selection
  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>, isNewTicket = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast('Invalid Image', 'Please upload a valid image file (PNG, JPG, WEBP).', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          // Compress image to ensure smooth upload
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 800;
            let width = img.width;
            let height = img.height;
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
            const compressed = canvas.toDataURL('image/jpeg', 0.82);

            if (isNewTicket) {
              setNewTicketImage(compressed);
            } else {
              setAttachedImage(compressed);
            }
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Create new ticket (Merchant)
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) {
      addToast('Subject Required', 'Please provide a short title for your issue.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_ticket',
          userId: currentUser.id,
          userName: currentUser.name || currentUser.businessName || 'Merchant',
          userEmail: currentUser.email || '',
          userPhone: currentUser.phone || '',
          subject: newSubject.trim(),
          category: newCategory,
          initialMessage: newInitialMsg.trim(),
          attachments: newTicketImage ? [newTicketImage] : [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not create ticket');

      addToast('Support Ticket Created! 🎫', 'Admin team ko ticket mil gayi hai. Aapko jald reply milega.', 'success');
      setNewSubject('');
      setNewInitialMsg('');
      setNewTicketImage(null);
      setIsCreatingTicket(false);
      await fetchTickets();
      if (data.ticket?.id) {
        setActiveTicketId(data.ticket.id);
      }
    } catch (err: any) {
      addToast('Ticket Error', err.message || 'Failed to submit ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send message in existing ticket
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !attachedImage) return;
    if (!activeTicket) return;

    setIsSendingMessage(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_message',
          ticketId: activeTicket.id,
          senderId: currentUser.id,
          senderName: isAdmin ? 'Admin Support Desk' : (currentUser.name || 'Merchant'),
          senderRole: isAdmin ? 'admin' : 'merchant',
          text: messageText.trim() || (attachedImage ? '📷 [Attached Screenshot / Image]' : ''),
          attachments: attachedImage ? [attachedImage] : [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send message');

      setMessageText('');
      setAttachedImage(null);
      await fetchTickets();
    } catch (err: any) {
      addToast('Send Failed', err.message || 'Could not send message', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Update status (Admin)
  const handleUpdateStatus = async (ticketId: string, nextStatus: 'open' | 'in_progress' | 'closed') => {
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Ticket Updated', `Status changed to ${nextStatus.replace('_', ' ').toUpperCase()}`, 'info');
        fetchTickets();
      }
    } catch (err) {}
  };

  // Mark ticket as read when opened
  const handleOpenTicketThread = async (ticket: SupportTicket) => {
    setActiveTicketId(ticket.id);
    if ((isAdmin && ticket.unreadByAdmin) || (!isAdmin && ticket.unreadByMerchant)) {
      try {
        await fetch('/api/support/tickets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticket.id,
            markReadBy: isAdmin ? 'admin' : 'merchant',
          }),
        });
        fetchTickets();
      } catch (err) {}
    }
  };

  return (
    <>
      {/* 1. FLOATING ACTION BUTTON (Restricted to Dashboard Only) */}
      {!isOpen && isDashboard && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-3 px-4 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title={t('supportDesk', '24/7 Live Support & Helpdesk')}
        >
          <div className="relative">
            <Headphones className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-600 animate-pulse" />
          </div>

          <span className="text-xs font-black tracking-wide hidden sm:inline">
            {isAdmin ? t('supportDesk', 'Support Desk') : t('liveSupport', 'Live Support')}
          </span>

          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* 2. CHAT POPUP WINDOW */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col ${
            isMinimized
              ? 'bottom-6 right-6 w-72 rounded-2xl h-14'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[420px] max-w-[440px] h-[86vh] sm:h-[580px] max-h-[620px] rounded-3xl'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeTicket && !isMinimized ? (
                <button
                  type="button"
                  onClick={() => setActiveTicketId(null)}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                  title="Back to Tickets"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <LifeBuoy className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-black truncate">
                    {activeTicket ? activeTicket.subject : t('supportDesk', 'SmartKhata 24/7 Support')}
                  </h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
                <div className="text-[10px] text-indigo-100 flex items-center gap-1">
                  <span>{isAdmin ? t('adminHelpdeskMode', 'Admin Helpdesk Mode') : t('instantMerchantCare', 'Instant Merchant Care')}</span>
                  <span>&bull;</span>
                  <span className="font-mono text-emerald-300 font-bold">{t('online', 'Online')}</span>
                </div>
              </div>
            </div>

            {/* Header controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* If minimized, hide body */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950/40">
              {/* VIEW 1: ACTIVE TICKET CHAT THREAD */}
              {activeTicket ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Ticket Sub-Bar (Status & Actions) */}
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                        {activeTicket.ticketNo}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400">
                        {activeTicket.category}
                      </span>
                    </div>

                    {/* Admin Status Switcher / Merchant Status Badge */}
                    {isAdmin ? (
                      <select
                        value={activeTicket.status}
                        onChange={(e) => handleUpdateStatus(activeTicket.id, e.target.value as any)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        <option value="open">🟢 Open</option>
                        <option value="in_progress">🟡 In Progress</option>
                        <option value="closed">⚪ Closed</option>
                      </select>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          activeTicket.status === 'open'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : activeTicket.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {activeTicket.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {/* Messages Stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Welcome notice */}
                    <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-center space-y-1">
                      <p className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                        {settings.websiteName || 'SmartKhata'} {(settings.websiteBadgeText !== undefined ? settings.websiteBadgeText : 'PRO')} Support Assistant
                      </p>
                      <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400">
                        Aap problem ki screenshots aur details yaha bhej sakte hain. Our admin team monitors all tickets.
                      </p>
                    </div>

                    {activeTicket.messages?.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      const isAdminMsg = msg.senderRole === 'admin';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[10px] font-bold text-slate-500">
                              {msg.senderName}
                            </span>
                            {isAdminMsg && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                                Staff
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs space-y-2 shadow-xs ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-none'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap font-medium">
                              {msg.text}
                            </p>

                            {/* Attachments preview */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {msg.attachments.map((imgUrl, i) => (
                                  <div
                                    key={i}
                                    onClick={() => setPreviewImage(imgUrl)}
                                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-white/20 max-w-[200px]"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt="Attachment"
                                      className="w-full max-h-36 object-cover rounded-xl hover:scale-105 transition-transform"
                                    />
                                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                                      View 🔍
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2"
                  >
                    {/* Attached image preview pill */}
                    {attachedImage && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="flex items-center gap-2">
                          <img
                            src={attachedImage}
                            alt="Attach preview"
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Screenshot attached
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedImage(null)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={(e) => handleSelectImage(e, false)}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                        title={t('attachFile', 'Attach Screenshot / Image')}
                      >
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                      </button>

                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder={t('typeMessage', 'Type your message or query...')}
                        className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />

                      <button
                        type="submit"
                        disabled={isSendingMessage || (!messageText.trim() && !attachedImage)}
                        className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-md shadow-indigo-600/30 shrink-0"
                        title={t('sendMessage', 'Send Message')}
                      >
                        {isSendingMessage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : isCreatingTicket ? (
                /* VIEW 2: CREATE NEW TICKET FORM */
                <form
                  onSubmit={handleCreateTicket}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      {t('createNewTicket', 'Create Support Ticket')}
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsCreatingTicket(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                    >
                      {t('cancel', 'Cancel')}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {t('subject', 'Subject / Problem Title *')}
                    </label>
                    <input
                      type="text"
                      required
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g. Drive sync error, UPI QR issue, Ledger mismatch"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {t('category', 'Issue Category')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['General', 'Billing', 'Technical', 'Account'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            newCategory === cat
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {t('description', 'Detailed Description *')}
                    </label>
                    <textarea
                      rows={3}
                      value={newInitialMsg}
                      onChange={(e) => setNewInitialMsg(e.target.value)}
                      placeholder={t('description', 'Describe what happened or what error you are seeing...')}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  {/* Attachment */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {t('attachFile', 'Attach Error Screenshot / Photo (Optional)')}
                    </label>
                    <input
                      type="file"
                      ref={newTicketFileInputRef}
                      accept="image/*"
                      onChange={(e) => handleSelectImage(e, true)}
                      className="hidden"
                    />

                    {newTicketImage ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 w-36 h-28">
                        <img
                          src={newTicketImage}
                          alt="Ticket preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setNewTicketImage(null)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => newTicketFileInputRef.current?.click()}
                        className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl flex items-center justify-center gap-2 text-xs text-slate-500 font-bold transition-all cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        <span>{t('attachFile', 'Click to attach screenshot')}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('loading', 'Submitting Ticket...')}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{t('sendMessage', 'Submit Ticket to Admin')}</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* VIEW 3: TICKETS LIST (ADMIN DESK OR MERCHANT HISTORY) */
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Top Toolbar */}
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shrink-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t('searchTickets', 'Search tickets by subject, user, ticket #...')}
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    {/* Filter pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      {(['all', 'open', 'in_progress', 'closed'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setTicketFilter(f)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                            ticketFilter === f
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {f === 'all' ? t('allTickets', 'All') : f === 'open' ? t('open', 'Open') : f === 'in_progress' ? t('inProgress', 'In Progress') : t('closed', 'Closed')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List of Tickets */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {(() => {
                      const q = ticketSearch.trim().toLowerCase();
                      const filtered = tickets.filter((t) => {
                        if (ticketFilter !== 'all' && t.status !== ticketFilter) return false;
                        if (!q) return true;
                        return (
                          t.subject.toLowerCase().includes(q) ||
                          t.ticketNo.toLowerCase().includes(q) ||
                          t.userName.toLowerCase().includes(q) ||
                          t.category.toLowerCase().includes(q)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-8 text-center space-y-2">
                            <LifeBuoy className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {t('noTickets', 'No tickets found')}
                            </h5>
                            <p className="text-[11px] text-slate-400">
                              {!isAdmin
                                ? 'Need help? Click below to chat directly with admin.'
                                : 'No open support tickets at the moment.'}
                            </p>
                          </div>
                        );
                      }

                      return filtered.map((t) => {
                        const hasUnread = (isAdmin && t.unreadByAdmin) || (!isAdmin && t.unreadByMerchant);
                        const lastMsg = t.messages?.[t.messages.length - 1];

                        return (
                          <div
                            key={t.id}
                            onClick={() => handleOpenTicketThread(t)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                              hasUnread
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 shadow-sm'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                  {t.ticketNo}
                                </span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {t.subject}
                                </span>
                              </div>

                              <span
                                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                  t.status === 'open'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : t.status === 'in_progress'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {t.status === 'open' ? 'Open' : t.status === 'in_progress' ? 'In Progress' : 'Closed'}
                              </span>
                            </div>

                            {/* Snippet */}
                            {lastMsg && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {lastMsg.senderName}:
                                </span>{' '}
                                {lastMsg.text}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                              <span>
                                {isAdmin ? `Merchant: ${t.userName}` : `Category: ${t.category}`}
                              </span>
                              <span>{new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Merchant: Start New Ticket Button */}
                  {!isAdmin && (
                    <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsCreatingTicket(true)}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t('createNewTicket', 'Start New Support Request')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-transparent">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Full Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
