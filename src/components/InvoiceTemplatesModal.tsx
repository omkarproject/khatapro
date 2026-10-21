'use client';

import React, { useState } from 'react';
import { X, Check, Eye, Printer, Palette, Sparkles, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { INVOICE_TEMPLATES, InvoiceTemplateMeta, generateInvoiceHtml, InvoiceRenderData } from '@/lib/invoiceTemplates';

interface InvoiceTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceTemplatesModal: React.FC<InvoiceTemplatesModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, profile, settings, updateSettings, showToast } = useApp();

  const currentActiveTemplate = settings?.selectedInvoiceTemplate || 'template_minimal';
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(currentActiveTemplate);
  const [previewingTemplate, setPreviewingTemplate] = useState<InvoiceTemplateMeta | null>(null);

  if (!isOpen) return null;

  // Build sample data for preview using merchant's real info
  const sampleData: InvoiceRenderData = {
    merchant: {
      name: currentUser?.name || 'Store Owner',
      businessName: profile?.businessName || settings?.businessName || currentUser?.businessName || 'SmartKhata Super Store',
      address: profile?.businessAddress || settings?.businessAddress || '104 Commercial Complex, MG Road',
      phone: profile?.phone || currentUser?.phone || '+91 98765 43210',
      email: currentUser?.email || 'contact@smartkhata.pro',
      gst: profile?.businessGst || settings?.paymentSettings?.businessGst || '09AAAAA0000A1Z5',
    },
    customer: {
      name: 'Rahul Sharma',
      phone: '+91 98111 22233',
      address: 'Shop 12, Main Bazaar, Lucknow',
      businessName: 'Sharma General Traders',
    },
    txn: {
      id: 'txn_demo_98765',
      docNo: 'INV-98765',
      title: 'CREDIT SALES INVOICE & BILL',
      date: new Date().toISOString(),
      amount: 14500,
      amountWords: 'Fourteen Thousand Five Hundred Rupees Only',
      note: 'Wholesale Kirana Goods & Dairy Stock Supply',
      isGot: false,
      type: 'credit',
      status: 'Active',
      currencySymbol: '₹',
    },
    payment: {
      upiId: settings?.paymentSettings?.upiId || 'merchant@okaxis',
      payeeName: profile?.businessName || settings?.businessName || 'SmartKhata Merchant',
      qrUrl:
        settings?.paymentSettings?.customQrUrl ||
        `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('upi://pay?pa=merchant@okaxis&pn=SmartKhata&am=14500')}`,
    },
  };

  const handleSetActive = (templateId: string) => {
    setSelectedTemplateId(templateId);
    updateSettings({ selectedInvoiceTemplate: templateId });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('skp_invoice_template', templateId);
      } catch {}
    }
    if (showToast) {
      const tmpl = INVOICE_TEMPLATES.find((x) => x.id === templateId);
      showToast(`Active Invoice Template set to "${tmpl?.name || templateId}"!`, 'success');
    }
  };

  const handlePrintTest = (templateId: string) => {
    const html = generateInvoiceHtml(templateId, sampleData);

    const oldFrame = document.getElementById('smartkhata-test-print-frame');
    if (oldFrame) oldFrame.remove();

    const printFrame = document.createElement('iframe');
    printFrame.id = 'smartkhata-test-print-frame';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Invoice & Bill Templates Studio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase">
                  10 Styles
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                10 modern & stylish formats mein se koi ek select karein. Sabhi bills aur receipts ussi template mein banenge.
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

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INVOICE_TEMPLATES.map((tmpl) => {
              const isActive = (settings?.selectedInvoiceTemplate || 'template_minimal') === tmpl.id;

              return (
                <div
                  key={tmpl.id}
                  className={`rounded-2xl border p-4.5 transition-all flex flex-col justify-between relative group ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-500/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  {/* Top Bar with Badge & Category */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md"
                        style={{
                          background: `${tmpl.accentColor}18`,
                          color: tmpl.accentColor,
                        }}
                      >
                        {tmpl.category}
                      </span>

                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {tmpl.badge}
                      </span>
                    </div>

                    {/* Template Name & Color Dot */}
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ background: tmpl.accentColor }}
                      />
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {tmpl.name}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-1 mb-1">
                      {tmpl.tagline}
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {tmpl.description}
                    </p>
                  </div>

                  {/* Active Indicator or Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {isActive ? (
                      <div className="flex items-center justify-between bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3 py-2 rounded-xl text-xs font-black">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Active Default Template</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePrintTest(tmpl.id)}
                          className="text-[11px] font-bold underline hover:text-emerald-900 dark:hover:text-emerald-200 cursor-pointer"
                        >
                          Print Test
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetActive(tmpl.id)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Set as Default Template</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewingTemplate(tmpl)}
                        className="py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Live Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintTest(tmpl.id)}
                        className="py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Bill</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Selected Template: <strong className="text-slate-900 dark:text-white font-mono">
                {INVOICE_TEMPLATES.find((x) => x.id === (settings?.selectedInvoiceTemplate || 'template_minimal'))?.name || 'Modern Minimalist'}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>

      {/* FULL PREVIEW MODAL OVERLAY */}
      {previewingTemplate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-100/80">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">
                  Preview: {previewingTemplate.name} ({previewingTemplate.category})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSetActive(previewingTemplate.id);
                    setPreviewingTemplate(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Use This Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintTest(previewingTemplate.id)}
                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sample</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewingTemplate(null)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-200/50 p-4 flex justify-center">
              <iframe
                srcDoc={generateInvoiceHtml(previewingTemplate.id, sampleData)}
                title="Template Preview"
                className="w-full max-w-2xl min-h-[750px] bg-white rounded-xl shadow-lg border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
