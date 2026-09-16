'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Search,
  Users,
  FileText,
  Package,
  ArrowRight,
  TrendingUp,
  CreditCard,
  X
} from 'lucide-react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const { customers, invoices, products, openCollectModal } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open triggered from parent or navbar
        }
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  const filteredCustomers = cleanQuery
    ? customers.filter(
        c =>
          c.name.toLowerCase().includes(cleanQuery) ||
          c.phone.includes(cleanQuery) ||
          (c.businessName && c.businessName.toLowerCase().includes(cleanQuery))
      ).slice(0, 4)
    : [];

  const filteredInvoices = cleanQuery
    ? invoices.filter(
        i =>
          i.invoiceNumber.toLowerCase().includes(cleanQuery) ||
          i.customerName.toLowerCase().includes(cleanQuery)
      ).slice(0, 4)
    : [];

  const filteredProducts = cleanQuery
    ? products.filter(
        p =>
          p.name.toLowerCase().includes(cleanQuery) ||
          p.sku.toLowerCase().includes(cleanQuery)
      ).slice(0, 4)
    : [];

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, invoices, products, or actions... (Esc to close)"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results / Navigation Suggestions */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Quick Actions */}
          {!cleanQuery && (
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                Quick Shortcuts
              </div>
              <button
                onClick={() => {
                  onClose();
                  openCollectModal();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  Quick UPI Payment Collection
                </span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">0% Fee</span>
              </button>
              <button
                onClick={() => handleNavigate('/khata')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Open Digital KhataBook
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavigate('/invoices')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-500" />
                  Create GST / Non-GST Invoice
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}

          {/* Customers */}
          {filteredCustomers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Customers
              </div>
              {filteredCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleNavigate(`/customers?id=${c.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-[11px] text-slate-400">{c.phone} • {c.businessName || 'Individual'}</div>
                  </div>
                  <div className={`font-mono font-semibold ${c.outstandingBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {c.outstandingBalance > 0 ? `Due: ₹${c.outstandingBalance.toLocaleString('en-IN')}` : 'Settled'}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Invoices */}
          {filteredInvoices.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Invoices
              </div>
              {filteredInvoices.map(i => (
                <button
                  key={i.id}
                  onClick={() => handleNavigate('/invoices')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 dark:text-white">{i.invoiceNumber}</div>
                    <div className="text-[11px] text-slate-400">{i.customerName} • {i.issueDate}</div>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    ₹{i.total.toLocaleString('en-IN')}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Products */}
          {filteredProducts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 flex items-center gap-1">
                <Package className="w-3 h-3" /> Inventory Products
              </div>
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleNavigate('/inventory')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-400">SKU: {p.sku} • Stock: {p.currentStock} {p.unit}</div>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    ₹{p.sellingPrice.toLocaleString('en-IN')}
                  </div>
                </button>
              ))}
            </div>
          )}

          {cleanQuery && filteredCustomers.length === 0 && filteredInvoices.length === 0 && filteredProducts.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
