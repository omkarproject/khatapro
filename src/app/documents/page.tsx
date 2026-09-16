'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/utils';
import { DocumentItem } from '@/types';
import {
  FolderLock,
  Plus,
  Search,
  FileText,
  Download,
  Share2,
  Trash2,
  Eye,
  X,
  Upload,
  Sparkles,
  FileCheck
} from 'lucide-react';

export default function DocumentsPage() {
  const { documents, addDocument, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'invoice' | 'bill' | 'receipt' | 'contract' | 'identity' | 'tax'>('receipt');
  const [entityName, setEntityName] = useState('');

  const filteredDocuments = documents.filter(doc => {
    const matchSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.relatedEntityName && doc.relatedEntityName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Title required', 'Please provide a file title.', 'error');
      return;
    }

    const newDoc: DocumentItem = {
      id: `doc_${Date.now()}`,
      title: title.trim().endsWith('.pdf') ? title.trim() : `${title.trim()}.pdf`,
      category,
      fileUrl: '/docs/sample_document.pdf',
      fileType: 'PDF',
      fileSize: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
      relatedEntityName: entityName.trim() || 'General Business File',
      uploadedAt: new Date().toISOString(),
    };

    addDocument(newDoc);
    setIsUploadModalOpen(false);
    setTitle('');
    setEntityName('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderLock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Document Vault & Receipts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Securely organize supplier bills, signed contracts, GST registration papers, and expense vouchers
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Filter & Search */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by title or entity..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['all', 'contract', 'tax', 'receipt', 'invoice', 'bill', 'identity'].map((cat) => (
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

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDocuments.map((doc) => (
          <div
            key={doc.id}
            className="glass-card p-5 space-y-4 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {doc.category}
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {doc.relatedEntityName || 'Business Record'} • {doc.fileSize}
                </p>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">
                  Uploaded: {formatDate(doc.uploadedAt)}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setPreviewDoc(doc)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>

              <button
                onClick={() => addToast('Download Started', `Downloading ${doc.title}...`, 'info')}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs">
                  {previewDoc.title}
                </h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl fintech-gradient-primary text-white flex items-center justify-center mx-auto shadow-md">
                <FileText className="w-8 h-8" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {previewDoc.title}
              </div>
              <div className="text-xs text-slate-400">
                Category: <span className="uppercase font-semibold">{previewDoc.category}</span> • Size: {previewDoc.fileSize}
              </div>
              <div className="text-xs text-slate-400">
                Related Entity: {previewDoc.relatedEntityName}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  addToast('Download Complete', `${previewDoc.title} saved to disk.`, 'success');
                  setPreviewDoc(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                Upload Document to Vault
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Document Title / File Name *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Havells_Vendor_Contract_2025.pdf"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="receipt">Receipt / Bill</option>
                    <option value="invoice">Invoice</option>
                    <option value="contract">Contract</option>
                    <option value="tax">Tax / GST</option>
                    <option value="identity">Identity / KYC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Related Entity
                  </label>
                  <input
                    type="text"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="Customer or Supplier"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Upload Drop Area */}
              <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-2">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs text-slate-500">
                  Drag and drop PDF, JPG, PNG or <span className="text-indigo-600 font-bold">browse</span>
                </div>
                <div className="text-[10px] text-slate-400">Up to 25MB per file</div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
