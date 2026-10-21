'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  Sparkles,
  RefreshCw,
  Layers,
  Check,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  ShieldCheck,
  Upload,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  BUSINESS_CARD_TEMPLATES,
  BusinessCardData,
  generateBusinessCardPrintHtml,
} from '@/lib/businessCardTemplates';

interface BusinessCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessCardModal: React.FC<BusinessCardModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, profile, settings } = useApp();

  const [selectedTemplate, setSelectedTemplate] = useState<string>('card_royal_indigo');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [printMode, setPrintMode] = useState<'single' | 'sheet'>('single');

  const logoInputRef = useRef<HTMLInputElement>(null);

  // Default logo from user avatar, profile or settings
  const defaultLogo =
    currentUser?.avatarUrl ||
    profile?.avatarUrl ||
    settings?.businessLogo ||
    profile?.logo ||
    '';

  // Form details prefilled from current user / profile / settings
  const [formData, setFormData] = useState<BusinessCardData>(() => ({
    businessName: profile?.businessName || settings?.businessName || currentUser?.businessName || 'My Business',
    tagline: 'Wholesale & Retail Trading',
    ownerName: currentUser?.name || 'Store Owner',
    roleTitle: 'Proprietor / Director',
    phone: profile?.phone || currentUser?.phone || '+91 98000 00000',
    email: currentUser?.email || '',
    address: profile?.businessAddress || settings?.businessAddress || 'Main Market, City',
    gstin: profile?.businessGst || settings?.paymentSettings?.businessGst || '',
    upiId: settings?.paymentSettings?.upiId || '',
    qrUrl: settings?.paymentSettings?.customQrUrl || '',
    logoUrl: defaultLogo,
  }));

  if (!isOpen) return null;

  const currentTemplate =
    BUSINESS_CARD_TEMPLATES.find((t) => t.id === selectedTemplate) ||
    BUSINESS_CARD_TEMPLATES[0];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      if (b64) {
        setFormData((prev) => ({ ...prev, logoUrl: b64 }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePrint = () => {
    // Generate UPI QR code if missing
    let finalQr = formData.qrUrl;
    if (!finalQr && formData.upiId) {
      finalQr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${formData.upiId}&pn=${encodeURIComponent(formData.businessName)}`)}`;
    }

    const html = generateBusinessCardPrintHtml(
      selectedTemplate,
      { ...formData, qrUrl: finalQr },
      printMode
    );

    const oldFrame = document.getElementById('smartkhata-card-print-frame');
    if (oldFrame) oldFrame.remove();

    const printFrame = document.createElement('iframe');
    printFrame.id = 'smartkhata-card-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    }, 350);
  };

  const isDark = currentTemplate.theme !== 'white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Business / Visiting Card Studio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold uppercase">
                  Print Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apna professional visiting card design aur print karein customers ko dene ke liye
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Preview, Right Controls */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Live Interactive Preview */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center justify-between w-full max-w-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Live Card Preview
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveSide('front')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activeSide === 'front'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  Front Side
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSide('back')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activeSide === 'back'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  Back (UPI QR)
                </button>
              </div>
            </div>

            {/* 3D Realistic Business Card View */}
            <div
              className="w-full max-w-sm aspect-[1.75/1] rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all duration-300 border border-slate-200/40 dark:border-white/10 flex flex-col justify-between select-none"
              style={{ background: currentTemplate.bgGradient }}
            >
              {activeSide === 'front' ? (
                <>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {formData.logoUrl && (
                        <div
                          className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 shadow-md bg-white p-0.5"
                          style={{ borderColor: currentTemplate.accentColor }}
                        >
                          <img
                            src={formData.logoUrl}
                            alt="Logo"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <div className="space-y-0.5 min-w-0">
                        <h3
                          className="text-base font-black tracking-tight leading-tight truncate"
                          style={{ color: currentTemplate.textColor }}
                        >
                          {formData.businessName}
                        </h3>
                        <p
                          className="text-[9.5px] font-bold uppercase tracking-wider truncate"
                          style={{ color: currentTemplate.accentColor }}
                        >
                          {formData.tagline}
                        </p>
                      </div>
                    </div>

                    <span
                      className="px-2 py-0.5 rounded-md text-[8.5px] font-black tracking-widest uppercase shadow-xs shrink-0"
                      style={{
                        background: currentTemplate.accentColor,
                        color: isDark ? '#000000' : '#ffffff',
                      }}
                    >
                      VERIFIED
                    </span>
                  </div>

                  <div
                    className="pt-3 border-t flex items-end justify-between"
                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0' }}
                  >
                    <div>
                      <div
                        className="text-xs font-black"
                        style={{ color: currentTemplate.textColor }}
                      >
                        {formData.ownerName}
                      </div>
                      <div
                        className="text-[9.5px] font-medium"
                        style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}
                      >
                        {formData.roleTitle}
                      </div>
                    </div>

                    <div
                      className="text-[9.5px] space-y-0.5 text-right font-medium"
                      style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#475569' }}
                    >
                      <div className="font-bold flex items-center justify-end gap-1">
                        <span>📞</span> {formData.phone}
                      </div>
                      {formData.email && (
                        <div className="truncate max-w-[150px]">
                          <span>✉️</span> {formData.email}
                        </div>
                      )}
                      {formData.address && (
                        <div className="truncate max-w-[150px]">
                          <span>📍</span> {formData.address}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col justify-between items-center text-center">
                  <div>
                    {formData.logoUrl && (
                      <div
                        className="w-7 h-7 rounded-lg overflow-hidden mx-auto mb-1 border shadow-xs bg-white p-0.5"
                        style={{ borderColor: currentTemplate.accentColor }}
                      >
                        <img
                          src={formData.logoUrl}
                          alt="Logo"
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    )}
                    <div
                      className="text-[10px] font-black tracking-widest uppercase"
                      style={{ color: currentTemplate.accentColor }}
                    >
                      SCAN TO PAY VIA UPI
                    </div>
                    <div
                      className="text-xs font-black mt-0.5 truncate max-w-[240px]"
                      style={{ color: currentTemplate.textColor }}
                    >
                      {formData.businessName}
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-xl shadow-lg border border-white/20">
                    <img
                      src={
                        formData.qrUrl ||
                        `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${formData.upiId || 'merchant@upi'}&pn=${encodeURIComponent(formData.businessName)}`)}`
                      }
                      alt="UPI QR Code"
                      className="w-16 h-16 object-contain"
                    />
                  </div>

                  <div>
                    <div
                      className="text-[10px] font-mono font-bold"
                      style={{ color: currentTemplate.accentColor }}
                    >
                      UPI ID: {formData.upiId || 'merchant@upi'}
                    </div>
                    <div
                      className="text-[8.5px] mt-0.5"
                      style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}
                    >
                      GPay • PhonePe • Paytm • BHIM
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Template Selector Pills */}
            <div className="w-full max-w-sm space-y-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Card Design Templates:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {BUSINESS_CARD_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedTemplate === tmpl.id
                        ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div
                      className="w-full h-4 rounded-md mb-1.5"
                      style={{ background: tmpl.bgGradient }}
                    />
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {tmpl.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT: Customization Form & Print Mode */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Customize Card Details
              </h4>

              {/* Profile / Business Logo Selector */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-indigo-400 dark:border-indigo-600 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                      Profile / Business Logo
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {formData.logoUrl ? '✓ Logo active on card' : 'Visiting card par photo/logo jodein'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px] hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload</span>
                  </button>

                  {defaultLogo && formData.logoUrl !== defaultLogo && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: defaultLogo })}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10.5px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Use Account Profile Avatar"
                    >
                      Use Profile
                    </button>
                  )}

                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business / Store Name
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Store / Company Name"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tagline / Business Nature
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Traders & Merchants"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Owner / Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Your Name"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role / Designation
                  </label>
                  <input
                    type="text"
                    value={formData.roleTitle}
                    onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Proprietor"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="+91 98000 00000"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="contact@business.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shop / Office Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Shop No, Market, City, State"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.gstin || ''}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-semibold focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    UPI ID (for Back QR)
                  </label>
                  <input
                    type="text"
                    value={formData.upiId || ''}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="name@okaxis"
                  />
                </div>
              </div>
            </div>

            {/* Print Mode Selector */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Print Format:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrintMode('single')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    printMode === 'single'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="text-xs font-extrabold">Single Card (Front + Back)</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Standard 3.5" x 2" card size</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintMode('sheet')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    printMode === 'sheet'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="text-xs font-extrabold">A4 Sheet (8 Cards)</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Ready to print & cut on cardstock</div>
                </button>
              </div>
            </div>

            {/* Print Action Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Business Card Now ({printMode === 'single' ? 'Single 3.5" x 2"' : '8 Cards Sheet'})</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
