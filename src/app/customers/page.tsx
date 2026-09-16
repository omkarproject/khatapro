'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri } from '@/lib/utils';
import { Customer } from '@/types';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Building,
  MapPin,
  Star,
  QrCode,
  Share2,
  Edit2,
  Trash2,
  ShieldCheck,
  CreditCard,
  X,
  FileText,
  BookOpen
} from 'lucide-react';

export default function CustomersPage() {
  const {
    customers,
    saveCustomer,
    deleteCustomer,
    openCollectModal,
    transactions,
    settings,
    addToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBusiness, setFormBusiness] = useState('');
  const [formGst, setFormGst] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('150000');
  const [formCategory, setFormCategory] = useState<'VIP' | 'Regular' | 'Wholesale' | 'Retail'>('Regular');
  const [formRating, setFormRating] = useState('5');
  const [formNotes, setFormNotes] = useState('');

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.businessName && c.businessName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [customers, searchTerm, selectedCategory]);

  const openAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormBusiness('');
    setFormGst('');
    setFormAddress('');
    setFormCity('');
    setFormCreditLimit('100000');
    setFormCategory('Regular');
    setFormRating('5');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormBusiness(c.businessName || '');
    setFormGst(c.gstNumber || '');
    setFormAddress(c.address || '');
    setFormCity(c.city || '');
    setFormCreditLimit(c.creditLimit.toString());
    setFormCategory(c.category);
    setFormRating(c.rating.toString());
    setFormNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('Validation Error', 'Customer name is required.', 'error');
      return;
    }

    const customerData: Customer = {
      id: editingId || `cust_${Date.now()}`,
      name: formName.trim(),
      phone: formPhone.trim() || '+91 98000 00000',
      email: formEmail.trim(),
      businessName: formBusiness.trim(),
      gstNumber: formGst.trim(),
      address: formAddress.trim(),
      city: formCity.trim(),
      creditLimit: parseFloat(formCreditLimit) || 50000,
      outstandingBalance: editingId
        ? customers.find(c => c.id === editingId)?.outstandingBalance || 0
        : 0,
      category: formCategory,
      status: 'active',
      rating: parseInt(formRating) || 5,
      notes: formNotes.trim(),
      createdAt: editingId
        ? customers.find(c => c.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
    };

    saveCustomer(customerData);
    setIsModalOpen(false);
  };

  // Active customer transactions
  const activeCustomerTxns = useMemo(() => {
    if (!activeCustomer) return [];
    return transactions.filter(t => t.customerId === activeCustomer.id);
  }, [transactions, activeCustomer]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Customer Relationship Management (CRM)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            360-degree customer profiling, credit risk scoring, purchase history, and direct collections
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, company, or phone number..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'VIP', 'Wholesale', 'Regular', 'Retail'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map((cust) => {
          const creditUtilization = cust.creditLimit > 0
            ? Math.min(100, Math.round((Math.max(0, cust.outstandingBalance) / cust.creditLimit) * 100))
            : 0;

          return (
            <div
              key={cust.id}
              className="glass-card p-5 space-y-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl fintech-gradient-primary text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                      {cust.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {cust.name}
                      </h3>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{cust.businessName || 'Individual Client'}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    cust.category === 'VIP' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                    cust.category === 'Wholesale' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {cust.category}
                  </span>
                </div>

                {/* Contact & GST info */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cust.phone}</span>
                  </div>
                  {cust.gstNumber && (
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>GST: {cust.gstNumber}</span>
                    </div>
                  )}
                  {cust.city && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cust.city}, {cust.state || 'India'}</span>
                    </div>
                  )}
                </div>

                {/* Financial Balance & Credit Utilization */}
                <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Outstanding Balance</span>
                    <span className={`font-mono font-bold ${
                      cust.outstandingBalance > 0 ? 'text-rose-600' :
                      cust.outstandingBalance < 0 ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {formatINR(Math.abs(cust.outstandingBalance))}
                      <span className="text-[10px] ml-1 uppercase">
                        {cust.outstandingBalance > 0 ? 'Due' : cust.outstandingBalance < 0 ? 'Advance' : 'Nil'}
                      </span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Credit Used: {creditUtilization}%</span>
                      <span>Limit: {formatINR(cust.creditLimit)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          creditUtilization > 80 ? 'bg-rose-500' : creditUtilization > 50 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${creditUtilization}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveCustomer(cust)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    360° Profile
                  </button>
                  <span className="text-slate-300">•</span>
                  <Link
                    href={`/khata?id=${cust.id}`}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Khata Ledger →
                  </Link>
                </div>

                <div className="flex items-center gap-1.5">
                  {cust.outstandingBalance > 0 && (
                    <button
                      onClick={() =>
                        openCollectModal({
                          customerId: cust.id,
                          customerName: cust.name,
                          customerPhone: cust.phone,
                          amount: cust.outstandingBalance,
                          note: `Collection for ${cust.name}`,
                        })
                      }
                      className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 transition-colors"
                      title="Collect UPI"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(cust)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${cust.name}?`)) {
                        deleteCustomer(cust.id);
                      }
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 360° Customer Profile Drawer Modal */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl fintech-gradient-primary text-white font-black flex items-center justify-center text-lg">
                  {activeCustomer.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeCustomer.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {activeCustomer.businessName} • Member since {formatDate(activeCustomer.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Outstanding</div>
                <div className="text-base font-extrabold font-mono text-rose-600 mt-1">
                  {formatINR(activeCustomer.outstandingBalance)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Credit Limit</div>
                <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                  {formatINR(activeCustomer.creditLimit)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Rating Score</div>
                <div className="text-base font-extrabold text-amber-500 mt-1 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {activeCustomer.rating}.0 / 5.0
                </div>
              </div>
            </div>

            {/* Customer Notes */}
            {activeCustomer.notes && (
              <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
                <span className="font-bold">Merchant Notes: </span>
                {activeCustomer.notes}
              </div>
            )}

            {/* Transaction History for Customer */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Recent Customer Ledger Transactions ({activeCustomerTxns.length})
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {activeCustomerTxns.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{t.category}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(t.date)} • {t.paymentMode.toUpperCase()}</div>
                    </div>
                    <div className={`font-mono font-bold ${t.type === 'credit' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {t.type === 'credit' ? '+' : '-'}{formatINR(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5">
              <Link
                href={`/khata?id=${activeCustomer.id}`}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" /> Open Khata Ledger
              </Link>

              {activeCustomer.outstandingBalance > 0 && (
                <button
                  onClick={() => {
                    const c = activeCustomer;
                    setActiveCustomer(null);
                    openCollectModal({
                      customerId: c.id,
                      customerName: c.name,
                      customerPhone: c.phone,
                      amount: c.outstandingBalance,
                      note: `Collection for ${c.name}`,
                    });
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" /> Collect Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Customer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {editingId ? 'Edit Customer Profile' : 'Add New Customer Profile'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. ramesh@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Business / Firm Name
                  </label>
                  <input
                    type="text"
                    value={formBusiness}
                    onChange={(e) => setFormBusiness(e.target.value)}
                    placeholder="e.g. Chandra Electronics"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    GSTIN (Tax ID)
                  </label>
                  <input
                    type="text"
                    value={formGst}
                    onChange={(e) => setFormGst(e.target.value)}
                    placeholder="e.g. 27AABCS1429B1Z8"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="VIP">VIP</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Regular">Regular</option>
                    <option value="Retail">Retail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Relationship Rating
                  </label>
                  <select
                    value={formRating}
                    onChange={(e) => setFormRating(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                    <option value="4">⭐⭐⭐⭐ (4 - Very Good)</option>
                    <option value="3">⭐⭐⭐ (3 - Average)</option>
                    <option value="2">⭐⭐ (2 - Delayed Payments)</option>
                    <option value="1">⭐ (1 - High Risk)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Address & City
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Street address, Market area, City"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Special instructions or terms..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20"
                >
                  {editingId ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
