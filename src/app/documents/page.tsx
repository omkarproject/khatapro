'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/utils';
import { DocumentItem } from '@/types';
import {
  FolderLock,
  Plus,
  Search,
  FileText,
  Download,
  Trash2,
  Eye,
  X,
  Upload,
  FileCheck,
  CheckCircle2
} from 'lucide-react';

export default function DocumentsPage() {
  const { documents, addDocument, deleteDocument, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'invoice' | 'bill' | 'receipt' | 'contract' | 'identity' | 'tax'>('receipt');
  const [entityName, setEntityName] = useState('');

  // File Upload & Drag-and-Drop State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [fileTypeStr, setFileTypeStr] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const resetUploadForm = () => {
    setTitle('');
    setEntityName('');
    setSelectedFile(null);
    setFileDataUrl(null);
    setFileSizeStr('');
    setFileTypeStr('');
    setCategory('receipt');
    setIsDragging(false);
  };

  const handleProcessFile = (file: File) => {
    // Validate file size (max 25MB)
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      addToast('File Too Large', 'Please select a file smaller than 25MB.', 'error');
      return;
    }

    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    const sizeFormatted = file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setSelectedFile(file);
    setFileSizeStr(sizeFormatted);
    setFileTypeStr(ext);

    // Auto-fill title if empty
    if (!title.trim()) {
      setTitle(file.name);
    }

    // Auto-detect category from file name if applicable
    const lowerName = file.name.toLowerCase();
    if (
      lowerName.includes('aadhar') ||
      lowerName.includes('pan') ||
      lowerName.includes('passport') ||
      lowerName.includes('voter') ||
      lowerName.includes('id') ||
      lowerName.includes('kyc')
    ) {
      setCategory('identity');
    } else if (lowerName.includes('tax') || lowerName.includes('gst') || lowerName.includes('itr')) {
      setCategory('tax');
    } else if (lowerName.includes('contract') || lowerName.includes('agreement')) {
      setCategory('contract');
    } else if (lowerName.includes('inv') || lowerName.includes('invoice')) {
      setCategory('invoice');
    } else if (lowerName.includes('bill')) {
      setCategory('bill');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFileDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Title Required', 'Please provide a file name or title.', 'error');
      return;
    }

    const finalTitle = title.trim();
    const finalUrl = fileDataUrl || '/docs/sample_document.pdf';
    const finalSize = fileSizeStr || '1.2 MB';
    const finalType = fileTypeStr || (finalTitle.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOC');

    const newDoc: DocumentItem = {
      id: `doc_${Date.now()}`,
      title: finalTitle,
      category,
      fileUrl: finalUrl,
      fileType: finalType,
      fileSize: finalSize,
      relatedEntityName: entityName.trim() || 'General Business File',
      uploadedAt: new Date().toISOString(),
    };

    addDocument(newDoc);
    setIsUploadModalOpen(false);
    resetUploadForm();
  };

  const handleDeleteDoc = (id: string, docTitle: string) => {
    if (confirm(`Are you sure you want to delete "${docTitle}" from your Document Vault?`)) {
      deleteDocument(id);
    }
  };

  const handleDownload = (doc: DocumentItem) => {
    if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Download Complete', `${doc.title} downloaded.`, 'success');
    } else {
      // Fallback text download for pre-existing mock documents
      const blob = new Blob([
        `SmartKhata Pro Vault Document\n\nTitle: ${doc.title}\nCategory: ${doc.category.toUpperCase()}\nRelated Entity: ${doc.relatedEntityName || 'N/A'}\nFile Size: ${doc.fileSize}\nUploaded At: ${doc.uploadedAt}\n`
      ], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.title.endsWith('.txt') || doc.title.endsWith('.pdf') ? doc.title : `${doc.title}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('Download Complete', `${doc.title} downloaded.`, 'success');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.relatedEntityName && doc.relatedEntityName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const categoriesList = ['all', 'contract', 'tax', 'receipt', 'invoice', 'bill', 'identity'];

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
            Securely organize supplier bills, signed contracts, GST registration papers, identity KYC, and expense vouchers
          </p>
        </div>

        <button
          onClick={() => {
            resetUploadForm();
            setIsUploadModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
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
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categoriesList.map((cat) => {
            const count = cat === 'all'
              ? documents.length
              : documents.filter(d => d.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Document Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto">
            <FolderLock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {searchTerm ? 'No documents match your search' : 'No documents in this category'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Securely upload bills, invoices, contracts, identity documents or tax receipts to your vault.
          </p>
          <button
            onClick={() => {
              resetUploadForm();
              setIsUploadModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary inline-flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="glass-card p-5 space-y-4 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  {/* Category Badge & Delete Icon Next to It */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                      {doc.category}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDoc(doc.id, doc.title);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                      title={`Delete ${doc.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={doc.title}>
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
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>

                <button
                  onClick={() => handleDownload(doc)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {previewDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Real File Rendering if available */}
            {previewDoc.fileUrl && previewDoc.fileUrl.startsWith('data:image/') ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 flex items-center justify-center max-h-80">
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-80 w-auto object-contain"
                />
              </div>
            ) : previewDoc.fileUrl && previewDoc.fileUrl.startsWith('data:application/pdf') ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 h-80">
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.title}
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl fintech-gradient-primary text-white flex items-center justify-center mx-auto shadow-md">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {previewDoc.title}
                </div>
                <div className="text-xs text-slate-400">
                  Category: <span className="uppercase font-semibold text-indigo-600 dark:text-indigo-400">{previewDoc.category}</span> • Size: {previewDoc.fileSize}
                </div>
                <div className="text-xs text-slate-400">
                  Related Entity: {previewDoc.relatedEntityName || 'N/A'}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  handleDeleteDoc(previewDoc.id, previewDoc.title);
                  setPreviewDoc(null);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                Upload Document to Vault
              </h3>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  resetUploadForm();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
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
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="receipt">Receipt / Bill</option>
                    <option value="invoice">Invoice</option>
                    <option value="contract">Contract</option>
                    <option value="tax">Tax / GST</option>
                    <option value="identity">Identity / KYC</option>
                    <option value="bill">Utility Bill</option>
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Real Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center space-y-2 cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/30'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                {selectedFile ? (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs mx-auto">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      {fileSizeStr} • {fileTypeStr} Selected
                    </div>
                    <div className="text-[10px] text-slate-400 pt-0.5">
                      Click or drag to choose a different file
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Drag and drop PDF, JPG, PNG or <span className="text-indigo-600 dark:text-indigo-400 font-bold underline">browse</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">Up to 25MB per file • High-res PDF & Images</div>
                  </>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    resetUploadForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
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
