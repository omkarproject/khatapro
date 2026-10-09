'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri } from '@/lib/utils';
import { Customer, CustomerDriveFolder, CustomerDriveFile } from '@/types';
import { StorageService } from '@/services/storage';
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
  BookOpen,
  HardDrive,
  Folder,
  FolderPlus,
  FolderOpen,
  Upload,
  Download,
  Eye,
  Pencil,
  ArrowLeft,
  ChevronRight,
  File,
  Image as ImageIcon,
  Check,
  LayoutGrid,
  List as ListIcon,
  CheckSquare,
  Square,
  Camera,
  User,
} from 'lucide-react';

function WindowsFolderIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 11C4 8.79086 5.79086 7 8 7H18.5C19.8261 7 21.0979 7.52678 22.0355 8.46447L24.5711 11H40C42.2091 11 44 12.7909 44 15V18H4V11Z" fill="#F59E0B" />
      <path d="M4 16H44V38C44 40.2091 42.2091 42 40 42H8C5.79086 42 4 40.2091 4 38V16Z" fill="#FBBF24" />
      <path d="M4 17C4 16.4477 4.44772 16 5 16H43C43.5523 16 44 16.4477 44 17V19H4V17Z" fill="#FEF08A" fillOpacity="0.8" />
      <path d="M8 22H24" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

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

  // Customer Cloud Drive State
  const [driveCustomer, setDriveCustomer] = useState<Customer | null>(null);
  const [driveFolders, setDriveFolders] = useState<CustomerDriveFolder[]>([]);
  const [driveFiles, setDriveFiles] = useState<CustomerDriveFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [driveSearch, setDriveSearch] = useState('');
  const [driveViewMode, setDriveViewMode] = useState<'grid' | 'list'>('grid');

  // Multi-Select State
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

  // New folder modal
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Rename modal
  const [renamingItem, setRenamingItem] = useState<{ type: 'folder' | 'file'; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // File preview modal
  const [previewFile, setPreviewFile] = useState<CustomerDriveFile | null>(null);

  // Hidden File input ref
  const driveFileInputRef = useRef<HTMLInputElement>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formAvatar, setFormAvatar] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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

  // Handle avatar upload in customer Add/Edit modal
  const handleFormAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('File too large', 'Please select an image under 5MB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        setFormAvatar(base64);
        addToast('Photo Uploaded', 'Profile photo preview updated.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

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
    setFormAvatar(null);
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
    setFormAvatar(c.avatar || null);
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
      avatar: formAvatar || undefined,
      createdAt: editingId
        ? customers.find(c => c.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
    };

    saveCustomer(customerData);
    if (activeCustomer && activeCustomer.id === customerData.id) {
      setActiveCustomer(customerData);
    }
    setIsModalOpen(false);
  };

  // Customer Cloud Drive Handlers
  const handleOpenDriveModal = (cust: Customer) => {
    setDriveCustomer(cust);
    const data = StorageService.getCustomerDriveData(cust.id);
    setDriveFolders(data.folders);
    setDriveFiles(data.files);
    setCurrentFolderId(null);
    setDriveSearch('');
    setSelectedFileIds([]);
    setSelectedFolderIds([]);
  };

  const handleNavigateFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedFileIds([]);
    setSelectedFolderIds([]);
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveCustomer || !newFolderName.trim()) return;
    const name = newFolderName.trim().toUpperCase();
    if (driveFolders.some(f => f.name.toUpperCase() === name)) {
      addToast('Folder Exists', `Folder "${name}" already exists.`, 'error');
      return;
    }
    const newFolder: CustomerDriveFolder = {
      id: `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      createdAt: new Date().toISOString(),
      color: '#F59E0B',
    };
    const updatedFolders = [...driveFolders, newFolder];
    setDriveFolders(updatedFolders);
    StorageService.saveCustomerDriveData(driveCustomer.id, {
      folders: updatedFolders,
      files: driveFiles,
    });
    addToast('Folder Created', `Folder "${name}" created successfully.`, 'success');
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    if (!driveCustomer) return;
    if (!confirm(`Are you sure you want to delete folder "${folderName}" and all files inside it?`)) return;

    const updatedFolders = driveFolders.filter(f => f.id !== folderId);
    const updatedFiles = driveFiles.filter(f => f.folderId !== folderId);
    setDriveFolders(updatedFolders);
    setDriveFiles(updatedFiles);
    if (currentFolderId === folderId) {
      setCurrentFolderId(null);
    }
    StorageService.saveCustomerDriveData(driveCustomer.id, {
      folders: updatedFolders,
      files: updatedFiles,
    });
    addToast('Folder Deleted', `Folder "${folderName}" deleted.`, 'info');
  };

  const handleStartRename = (type: 'folder' | 'file', id: string, name: string) => {
    setRenamingItem({ type, id, name });
    setRenameValue(name);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveCustomer || !renamingItem || !renameValue.trim()) return;
    const trimmed = renameValue.trim();

    if (renamingItem.type === 'folder') {
      const upperName = trimmed.toUpperCase();
      const updatedFolders = driveFolders.map(f =>
        f.id === renamingItem.id ? { ...f, name: upperName } : f
      );
      setDriveFolders(updatedFolders);
      StorageService.saveCustomerDriveData(driveCustomer.id, {
        folders: updatedFolders,
        files: driveFiles,
      });
      addToast('Renamed', `Folder renamed to "${upperName}".`, 'success');
    } else {
      const updatedFiles = driveFiles.map(f =>
        f.id === renamingItem.id ? { ...f, name: trimmed } : f
      );
      setDriveFiles(updatedFiles);
      StorageService.saveCustomerDriveData(driveCustomer.id, {
        folders: driveFolders,
        files: updatedFiles,
      });
      addToast('Renamed', `File renamed to "${trimmed}".`, 'success');
    }
    setRenamingItem(null);
    setRenameValue('');
  };

  const handleUploadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!driveCustomer || !e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);

    let loadedCount = 0;
    const newFiles: CustomerDriveFile[] = [];

    fileList.forEach(file => {
      if (file.size > 15 * 1024 * 1024) {
        addToast('File too large', `${file.name} exceeds 15MB limit.`, 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        newFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: reader.result as string,
          folderId: currentFolderId,
          uploadedAt: new Date().toISOString(),
        });
        loadedCount++;

        if (loadedCount === fileList.length) {
          const updatedFiles = [...driveFiles, ...newFiles];
          setDriveFiles(updatedFiles);
          StorageService.saveCustomerDriveData(driveCustomer.id, {
            folders: driveFolders,
            files: updatedFiles,
          });
          addToast('Files Uploaded', `${newFiles.length} file(s) saved to customer drive.`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleDeleteFile = (fileId: string, fileName: string) => {
    if (!driveCustomer) return;
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    const updatedFiles = driveFiles.filter(f => f.id !== fileId);
    setDriveFiles(updatedFiles);
    StorageService.saveCustomerDriveData(driveCustomer.id, {
      folders: driveFolders,
      files: updatedFiles,
    });
    if (previewFile?.id === fileId) {
      setPreviewFile(null);
    }
    addToast('File Deleted', `"${fileName}" has been deleted.`, 'info');
  };

  const handleDownloadFile = (file: CustomerDriveFile) => {
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return driveFolders.find(f => f.id === currentFolderId) || null;
  }, [driveFolders, currentFolderId]);

  const displayedFolders = useMemo(() => {
    if (currentFolderId !== null) return [];
    if (!driveSearch.trim()) return driveFolders;
    return driveFolders.filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase()));
  }, [driveFolders, currentFolderId, driveSearch]);

  const displayedFiles = useMemo(() => {
    const inCurrentScope = driveFiles.filter(f => {
      if (currentFolderId === null) {
        return !f.folderId;
      }
      return f.folderId === currentFolderId;
    });
    if (!driveSearch.trim()) return inCurrentScope;
    return inCurrentScope.filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase()));
  }, [driveFiles, currentFolderId, driveSearch]);

  // Multi-Select Helpers & Handlers
  const toggleSelectFile = (fileId: string) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const toggleSelectFolder = (folderId: string) => {
    setSelectedFolderIds(prev =>
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const totalSelectedCount = selectedFileIds.length + selectedFolderIds.length;

  const allVisibleFileIds = useMemo(() => displayedFiles.map(f => f.id), [displayedFiles]);
  const allVisibleFolderIds = useMemo(
    () => (currentFolderId === null ? displayedFolders.map(f => f.id) : []),
    [currentFolderId, displayedFolders]
  );

  const isAllSelected = useMemo(() => {
    const totalVisible = allVisibleFileIds.length + allVisibleFolderIds.length;
    if (totalVisible === 0) return false;
    const allFilesSelected = allVisibleFileIds.every(id => selectedFileIds.includes(id));
    const allFoldersSelected = allVisibleFolderIds.every(id => selectedFolderIds.includes(id));
    return allFilesSelected && allFoldersSelected;
  }, [allVisibleFileIds, allVisibleFolderIds, selectedFileIds, selectedFolderIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFileIds([]);
      setSelectedFolderIds([]);
    } else {
      setSelectedFileIds(Array.from(new Set([...selectedFileIds, ...allVisibleFileIds])));
      setSelectedFolderIds(Array.from(new Set([...selectedFolderIds, ...allVisibleFolderIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedFileIds([]);
    setSelectedFolderIds([]);
  };

  const handleBatchDownload = async () => {
    if (!driveCustomer) return;

    // Direct files selected
    const directFiles = driveFiles.filter(f => selectedFileIds.includes(f.id));
    // Files inside selected folders
    const folderFiles = driveFiles.filter(f => f.folderId && selectedFolderIds.includes(f.folderId));

    const filesMap = new Map<string, CustomerDriveFile>();
    directFiles.forEach(f => filesMap.set(f.id, f));
    folderFiles.forEach(f => filesMap.set(f.id, f));
    const toDownload = Array.from(filesMap.values());

    if (toDownload.length === 0) {
      addToast('Download', 'No files found in selected items to download.', 'info');
      return;
    }

    addToast('Downloading', `Starting download for ${toDownload.length} file(s)...`, 'info');
    for (let i = 0; i < toDownload.length; i++) {
      const file = toDownload[i];
      const link = document.createElement('a');
      link.href = file.dataUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (i < toDownload.length - 1) {
        await new Promise(res => setTimeout(res, 250));
      }
    }
  };

  const handleBatchDelete = () => {
    if (!driveCustomer) return;
    const totalCount = selectedFileIds.length + selectedFolderIds.length;
    if (totalCount === 0) return;

    const folderCount = selectedFolderIds.length;
    const fileCount = selectedFileIds.length;

    let confirmMsg = `Are you sure you want to delete ${totalCount} selected items?`;
    if (folderCount > 0 && fileCount > 0) {
      confirmMsg = `Are you sure you want to delete ${folderCount} folder(s) (including all documents inside) and ${fileCount} file(s)?`;
    } else if (folderCount > 0) {
      confirmMsg = `Are you sure you want to delete ${folderCount} folder(s) and all documents inside them?`;
    } else {
      confirmMsg = `Are you sure you want to delete ${fileCount} selected file(s)?`;
    }

    if (!confirm(confirmMsg)) return;

    const updatedFolders = driveFolders.filter(f => !selectedFolderIds.includes(f.id));
    const updatedFiles = driveFiles.filter(f => {
      if (selectedFileIds.includes(f.id)) return false;
      if (f.folderId && selectedFolderIds.includes(f.folderId)) return false;
      return true;
    });

    setDriveFolders(updatedFolders);
    setDriveFiles(updatedFiles);
    setSelectedFileIds([]);
    setSelectedFolderIds([]);

    StorageService.saveCustomerDriveData(driveCustomer.id, {
      folders: updatedFolders,
      files: updatedFiles,
    });

    addToast('Deleted', `${totalCount} item(s) deleted successfully.`, 'info');
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
                    <div className="w-11 h-11 rounded-2xl fintech-gradient-primary text-white font-extrabold flex items-center justify-center text-sm shadow-md overflow-hidden relative shrink-0">
                      {cust.avatar ? (
                        <img src={cust.avatar} alt={cust.name} className="w-full h-full object-cover" />
                      ) : (
                        cust.name.charAt(0)
                      )}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cust.phone}</span>
                    </div>
                    {cust.email && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]" title={cust.email}>{cust.email}</span>
                      </div>
                    )}
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
                  <button
                    onClick={() => handleOpenDriveModal(cust)}
                    className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-600 dark:text-amber-400 transition-colors"
                    title="Customer Cloud Drive / Documents"
                  >
                    <HardDrive className="w-4 h-4" />
                  </button>
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
                <div className="w-12 h-12 rounded-2xl fintech-gradient-primary text-white font-black flex items-center justify-center text-lg overflow-hidden relative shrink-0 shadow-md">
                  {activeCustomer.avatar ? (
                    <img src={activeCustomer.avatar} alt={activeCustomer.name} className="w-full h-full object-cover" />
                  ) : (
                    activeCustomer.name.charAt(0)
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeCustomer.name}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                    <span>{activeCustomer.phone}</span>
                    {activeCustomer.email && (
                      <>
                        <span>•</span>
                        <span>{activeCustomer.email}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{activeCustomer.businessName || 'Individual'}</span>
                    <span>•</span>
                    <span>Member since {formatDate(activeCustomer.createdAt)}</span>
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
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Link
                  href={`/khata?id=${activeCustomer.id}`}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" /> Open Khata Ledger
                </Link>
                <button
                  onClick={() => {
                    const c = activeCustomer;
                    setActiveCustomer(null);
                    handleOpenDriveModal(c);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 transition-colors"
                >
                  <HardDrive className="w-4 h-4 text-amber-500" /> Cloud Drive
                </button>
              </div>

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
              {/* Profile Picture Uploader */}
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl fintech-gradient-primary text-white font-black text-xl flex items-center justify-center shadow-md overflow-hidden border-2 border-white dark:border-slate-800">
                    {formAvatar ? (
                      <img src={formAvatar} alt="Profile preview" className="w-full h-full object-cover" />
                    ) : formName.trim() ? (
                      formName.trim().charAt(0).toUpperCase()
                    ) : (
                      <Camera className="w-7 h-7 text-white/80" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*"
                    onChange={handleFormAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Customer Profile Photo
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    PNG, JPG, WEBP • Max 5MB
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-3 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      {formAvatar ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {formAvatar && (
                      <button
                        type="button"
                        onClick={() => setFormAvatar(null)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

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

      {/* ======================================================== */}
      {/* CUSTOMER CLOUD DRIVE (DOCUMENT VAULT) MODAL */}
      {/* ======================================================== */}
      {driveCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Customer Cloud Drive
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      Vault
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {driveCustomer.name} {driveCustomer.businessName ? `• ${driveCustomer.businessName}` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDriveCustomer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                title="Close Drive"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Windows Explorer Style Action Ribbon / Toolbar */}
            <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              
              {/* Left: Navigation Breadcrumb & Select All */}
              <div className="flex items-center gap-2">
                {currentFolderId ? (
                  <button
                    onClick={() => handleNavigateFolder(null)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                ) : null}

                {/* Select All Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-semibold transition-all shadow-sm cursor-pointer ${
                    isAllSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : totalSelectedCount > 0
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                  }`}
                  title="Select or deselect all items in view"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-white" />
                  ) : totalSelectedCount > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span
                    onClick={() => handleNavigateFolder(null)}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center gap-1"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    Root (Drive)
                  </span>
                  {currentFolder && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <FolderOpen className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        {currentFolder.name}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Actions, Search & View Toggle */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={driveSearch}
                    onChange={(e) => setDriveSearch(e.target.value)}
                    placeholder="Search files / folders..."
                    className="w-36 sm:w-44 pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {driveSearch && (
                    <button
                      onClick={() => setDriveSearch('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* View toggle */}
                <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5">
                  <button
                    onClick={() => setDriveViewMode('grid')}
                    className={`p-1.5 rounded-lg ${driveViewMode === 'grid' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDriveViewMode('list')}
                    className={`p-1.5 rounded-lg ${driveViewMode === 'list' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="List View"
                  >
                    <ListIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* New Folder Button */}
                <button
                  onClick={() => {
                    setNewFolderName('');
                    setIsNewFolderModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold transition-all shadow-sm cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>+ New Folder</span>
                </button>

                {/* Upload Files Button */}
                <button
                  onClick={() => driveFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Files</span>
                </button>
                <input
                  type="file"
                  multiple
                  ref={driveFileInputRef}
                  onChange={handleUploadFiles}
                  className="hidden"
                />
              </div>
            </div>

            {/* Multi-Select Floating Action Banner (Shown when items are selected) */}
            {totalSelectedCount > 0 && (
              <div className="mx-5 my-2.5 px-4 py-2.5 rounded-2xl bg-indigo-600 dark:bg-indigo-700 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-indigo-500/25 animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-extrabold text-xs">
                    {totalSelectedCount}
                  </div>
                  <div>
                    <span className="text-xs font-bold">
                      {totalSelectedCount} {totalSelectedCount === 1 ? 'item' : 'items'} selected
                    </span>
                    <span className="text-[11px] text-indigo-200 ml-2 hidden sm:inline">
                      ({selectedFolderIds.length} folders, {selectedFileIds.length} files)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition-all shadow-sm cursor-pointer"
                    title="Download all selected files"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Selected</span>
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                    title="Delete all selected items"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected</span>
                  </button>
                  <button
                    onClick={handleClearSelection}
                    className="p-1.5 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Drive Explorer Body */}
            <div className="p-5 overflow-y-auto flex-1 min-h-[380px] max-h-[62vh] space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
              
              {/* If at Root level, display Folders */}
              {currentFolderId === null && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-amber-500" />
                      Folders ({displayedFolders.length})
                    </h4>
                  </div>

                  {displayedFolders.length === 0 ? (
                    <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-xs text-slate-400">
                        {driveSearch ? 'No folders matching search.' : 'No folders created yet. Click "+ New Folder" to organize documents.'}
                      </p>
                    </div>
                  ) : driveViewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {displayedFolders.map((folder) => {
                        const folderFileCount = driveFiles.filter(f => f.folderId === folder.id).length;
                        const isFolderSelected = selectedFolderIds.includes(folder.id);
                        return (
                          <div
                            key={folder.id}
                            onDoubleClick={() => handleNavigateFolder(folder.id)}
                            onClick={() => handleNavigateFolder(folder.id)}
                            className={`group relative p-4 rounded-2xl bg-white dark:bg-slate-800/80 border transition-all flex flex-col items-center text-center cursor-pointer select-none ${
                              isFolderSelected
                                ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md'
                                : 'border-slate-200/90 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10'
                            }`}
                          >
                            {/* Checkbox button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectFolder(folder.id);
                              }}
                              className={`absolute top-2.5 left-2.5 z-10 p-1 rounded-lg transition-all ${
                                isFolderSelected
                                  ? 'opacity-100 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm'
                                  : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 bg-white/90 dark:bg-slate-900/90'
                              }`}
                              title={isFolderSelected ? 'Deselect folder' : 'Select folder'}
                            >
                              {isFolderSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            {/* Action overlay buttons (Rename, Delete) */}
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-slate-900/95 p-1 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename('folder', folder.id, folder.name);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                                title="Rename Folder"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(folder.id, folder.name);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                                title="Delete Folder"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Windows Yellow Folder Icon */}
                            <div className="mb-2 group-hover:scale-105 transition-transform">
                              <WindowsFolderIcon className="w-16 h-16 drop-shadow" />
                            </div>

                            {/* Folder Name - Windows Uppercase styling */}
                            <div className="font-extrabold text-xs text-slate-800 dark:text-slate-100 tracking-wide uppercase line-clamp-2 px-1">
                              {folder.name}
                            </div>

                            {/* Items count badge */}
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <span>{folderFileCount} {folderFileCount === 1 ? 'file' : 'files'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* List View for Folders */
                    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60 overflow-hidden">
                      {displayedFolders.map((folder) => {
                        const folderFileCount = driveFiles.filter(f => f.folderId === folder.id).length;
                        const isFolderSelected = selectedFolderIds.includes(folder.id);
                        return (
                          <div
                            key={folder.id}
                            onClick={() => handleNavigateFolder(folder.id)}
                            className={`p-3 flex items-center justify-between transition-colors cursor-pointer group ${
                              isFolderSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : 'hover:bg-amber-500/5'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectFolder(folder.id);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600"
                              >
                                {isFolderSelected ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              <WindowsFolderIcon className="w-8 h-8" />
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                                  {folder.name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {folderFileCount} files • Created {formatDate(folder.createdAt)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename('folder', folder.id, folder.name);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Rename"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(folder.id, folder.name);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Delete"
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

              {/* Files Section (Either inside current folder or root loose files) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    {currentFolder ? `Files in ${currentFolder.name} (${displayedFiles.length})` : `Root Files (${displayedFiles.length})`}
                  </h4>
                </div>

                {displayedFiles.length === 0 ? (
                  <div className="p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/30 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {driveSearch ? 'No files match your search' : 'No documents in this folder yet'}
                      </h5>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
                        Upload customer Aadhar cards, PAN copies, GST registration certificates, invoices, or billing receipts.
                      </p>
                    </div>
                    <button
                      onClick={() => driveFileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload File Now
                    </button>
                  </div>
                ) : driveViewMode === 'grid' ? (
                  /* Grid View of Files */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {displayedFiles.map((file) => {
                      const isImage = file.type.startsWith('image/');
                      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                      const isFileSelected = selectedFileIds.includes(file.id);

                      return (
                        <div
                          key={file.id}
                          className={`group relative p-3 rounded-2xl bg-white dark:bg-slate-800/80 border transition-all flex flex-col justify-between ${
                            isFileSelected
                              ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md'
                              : 'border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10'
                          }`}
                        >
                          {/* Checkbox button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectFile(file.id);
                            }}
                            className={`absolute top-2.5 left-2.5 z-10 p-1 rounded-lg transition-all ${
                              isFileSelected
                                ? 'opacity-100 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm'
                                : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 bg-white/90 dark:bg-slate-900/90'
                            }`}
                            title={isFileSelected ? 'Deselect file' : 'Select file'}
                          >
                            {isFileSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          {/* File Preview / Thumbnail Box */}
                          <div
                            onClick={() => setPreviewFile(file)}
                            className="w-full h-28 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden cursor-pointer relative mb-2.5 border border-slate-200/50 dark:border-slate-700/50"
                          >
                            {isImage ? (
                              <img
                                src={file.dataUrl}
                                alt={file.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : isPdf ? (
                              <div className="flex flex-col items-center gap-1 text-rose-500">
                                <FileText className="w-10 h-10" />
                                <span className="text-[9px] font-bold uppercase bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded text-rose-700 dark:text-rose-300">
                                  PDF
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-indigo-500">
                                <File className="w-10 h-10" />
                                <span className="text-[9px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">
                                  DOC
                                </span>
                              </div>
                            )}

                            {/* Hover Eye overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-5 h-5 drop-shadow" />
                            </div>
                          </div>

                          {/* File Meta */}
                          <div className="space-y-1">
                            <div
                              onClick={() => setPreviewFile(file)}
                              title={file.name}
                              className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate cursor-pointer hover:text-indigo-600"
                            >
                              {file.name}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>{formatFileSize(file.size)}</span>
                              <span>{formatDate(file.uploadedAt)}</span>
                            </div>
                          </div>

                          {/* Actions Bar */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setPreviewFile(file)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="Preview Document"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDownloadFile(file)}
                                className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="Download File"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStartRename('file', file.id, file.name)}
                                className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="Rename File"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id, file.name)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="Delete File"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* List View of Files */
                  <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60 overflow-hidden">
                    {displayedFiles.map((file) => {
                      const isImage = file.type.startsWith('image/');
                      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                      const isFileSelected = selectedFileIds.includes(file.id);

                      return (
                        <div
                          key={file.id}
                          className={`p-3 flex items-center justify-between transition-colors group ${
                            isFileSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div
                            onClick={() => setPreviewFile(file)}
                            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectFile(file.id);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600"
                            >
                              {isFileSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              {isImage ? (
                                <ImageIcon className="w-4 h-4 text-emerald-500" />
                              ) : isPdf ? (
                                <FileText className="w-4 h-4 text-rose-500" />
                              ) : (
                                <File className="w-4 h-4 text-indigo-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {file.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-3">
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStartRename('file', file.id, file.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Rename"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFile(file.id, file.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Delete"
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
            </div>

            {/* Modal Footer Bar */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span>
                  Total Files: <strong className="text-slate-800 dark:text-slate-200">{driveFiles.length}</strong> | Total Folders: <strong className="text-slate-800 dark:text-slate-200">{driveFolders.length}</strong>
                </span>
                {totalSelectedCount > 0 && (
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {totalSelectedCount} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {totalSelectedCount > 0 && (
                  <>
                    <button
                      onClick={handleBatchDownload}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download ({totalSelectedCount})
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete ({totalSelectedCount})
                    </button>
                  </>
                )}
                <button
                  onClick={() => setDriveCustomer(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Close Drive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NEW FOLDER CREATION MODAL */}
      {/* ======================================================== */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Create New Folder
                </h4>
                <p className="text-[11px] text-slate-400">
                  Folder will be created in Windows style
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. AADHAR CARD, BILLS, GST PAPERS"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RENAME FOLDER / FILE MODAL */}
      {/* ======================================================== */}
      {renamingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white capitalize">
                  Rename {renamingItem.type}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Enter new name for this {renamingItem.type}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  New Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* HIGH-RES FILE PREVIEW MODAL */}
      {/* ======================================================== */}
      {previewFile && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {previewFile.name}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {formatFileSize(previewFile.size)} • Uploaded {formatDate(previewFile.uploadedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(previewFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Viewport */}
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950/20 min-h-[400px]">
              {previewFile.type.startsWith('image/') ? (
                <img
                  src={previewFile.dataUrl}
                  alt={previewFile.name}
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-200/20"
                />
              ) : previewFile.type === 'application/pdf' || previewFile.name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewFile.dataUrl}
                  title={previewFile.name}
                  className="w-full h-[75vh] rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <File className="w-16 h-16 text-indigo-400 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Direct in-browser preview not supported for this file type.
                  </p>
                  <button
                    onClick={() => handleDownloadFile(previewFile)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Download to View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
