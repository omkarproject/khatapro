'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate, buildUpiUri, getQrCodeUrl } from '@/lib/utils';
import { Customer, CustomerDriveFolder, CustomerDriveFile, CustomerBankAccount, CustomerUpiDetail } from '@/types';
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
  Landmark,
  Copy,
} from 'lucide-react';

const POPULAR_BANKS = [
  'State Bank of India (SBI)',
  'HDFC Bank',
  'ICICI Bank',
  'Punjab National Bank (PNB)',
  'Bank of Baroda (BOB)',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Canara Bank',
  'Union Bank of India',
  'IndusInd Bank',
  'Bank of India',
  'Central Bank of India',
  'Indian Bank',
  'YES Bank',
  'IDBI Bank',
  'Federal Bank',
  'IDFC FIRST Bank',
  'Bandhan Bank',
  'Other Bank',
];

const UPI_APPS = [
  'Google Pay',
  'PhonePe',
  'Paytm',
  'BHIM UPI',
  'Amazon Pay',
  'CRED',
  'WhatsApp Pay',
  'Other',
];

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

  // Customer Bank Accounts & UPI Modal State
  const [bankCustomer, setBankCustomer] = useState<Customer | null>(null);
  const [bankAccounts, setBankAccounts] = useState<CustomerBankAccount[]>([]);
  const [upiDetails, setUpiDetails] = useState<CustomerUpiDetail[]>([]);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [activeBankTab, setActiveBankTab] = useState<'accounts' | 'upi'>('accounts');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Bank Form State
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [bankFormName, setBankFormName] = useState('State Bank of India (SBI)');
  const [bankFormCustomName, setBankFormCustomName] = useState('');
  const [bankFormHolder, setBankFormHolder] = useState('');
  const [bankFormAccNumber, setBankFormAccNumber] = useState('');
  const [bankFormIfsc, setBankFormIfsc] = useState('');
  const [bankFormBranch, setBankFormBranch] = useState('');
  const [bankFormType, setBankFormType] = useState<'Savings' | 'Current' | 'Corporate'>('Savings');

  // UPI Form State
  const [isAddingUpi, setIsAddingUpi] = useState(false);
  const [upiFormId, setUpiFormId] = useState('');
  const [upiFormHolder, setUpiFormHolder] = useState('');
  const [upiFormApp, setUpiFormApp] = useState('Google Pay');
  const [upiFormQrImage, setUpiFormQrImage] = useState<string | null>(null);
  const upiQrInputRef = useRef<HTMLInputElement>(null);

  // Enlarged QR modal
  const [enlargedQr, setEnlargedQr] = useState<{ upiId: string; qrUrl: string; holderName?: string; appName?: string } | null>(null);

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
    const term = searchTerm.trim().toLowerCase();
    return customers.filter(c => {
      const matchSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.businessName && c.businessName.toLowerCase().includes(term)) ||
        (c.gstNumber && c.gstNumber.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term));
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

  // Banking & UPI Handlers
  const handleOpenBankModal = (cust: Customer) => {
    setBankCustomer(cust);
    const data = StorageService.getCustomerBankingData(cust.id);
    setBankAccounts(data.bankAccounts || []);
    setUpiDetails(data.upiDetails || []);
    setActiveBankTab('accounts');
    setIsAddingAccount(false);
    setIsAddingUpi(false);
    setBankFormName('State Bank of India (SBI)');
    setBankFormCustomName('');
    setBankFormHolder(cust.name);
    setBankFormAccNumber('');
    setBankFormIfsc('');
    setBankFormBranch('');
    setBankFormType('Savings');
    setUpiFormId('');
    setUpiFormHolder(cust.name);
    setUpiFormApp('Google Pay');
    setUpiFormQrImage(null);
    setIsBankModalOpen(true);
  };

  const handleCopyValue = (text: string, label: string, keyId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1500);
    addToast('Copied to Clipboard', `${label}: ${text}`, 'success');
  };

  const handleUpiQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('File too large', 'Please choose a QR image under 5MB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setUpiFormQrImage(evt.target?.result as string);
        addToast('QR Uploaded', 'QR Code image attached successfully.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankCustomer) return;
    if (!bankFormAccNumber.trim()) {
      addToast('Validation Error', 'Account Number is required.', 'error');
      return;
    }
    if (!bankFormIfsc.trim()) {
      addToast('Validation Error', 'IFSC Code is required.', 'error');
      return;
    }
    const finalBank = bankFormName === 'Other Bank' ? (bankFormCustomName.trim() || 'Other Bank') : bankFormName;
    const newAccount: CustomerBankAccount = {
      id: `acc_${Date.now()}`,
      bankName: finalBank,
      accountHolderName: bankFormHolder.trim() || bankCustomer.name,
      accountNumber: bankFormAccNumber.trim(),
      ifscCode: bankFormIfsc.trim().toUpperCase(),
      branchName: bankFormBranch.trim(),
      accountType: bankFormType,
      createdAt: new Date().toISOString(),
    };
    const updated = [newAccount, ...bankAccounts];
    setBankAccounts(updated);
    StorageService.saveCustomerBankingData(bankCustomer.id, {
      bankAccounts: updated,
      upiDetails,
    });
    addToast('Bank Account Added', `${finalBank} account saved successfully.`, 'success');
    setIsAddingAccount(false);
    setBankFormAccNumber('');
    setBankFormIfsc('');
    setBankFormBranch('');
  };

  const handleDeleteBankAccount = (accId: string) => {
    if (!bankCustomer) return;
    const updated = bankAccounts.filter((a) => a.id !== accId);
    setBankAccounts(updated);
    StorageService.saveCustomerBankingData(bankCustomer.id, {
      bankAccounts: updated,
      upiDetails,
    });
    addToast('Account Removed', 'Bank account removed successfully.', 'info');
  };

  const handleSaveUpiDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankCustomer) return;
    if (!upiFormId.trim()) {
      addToast('Validation Error', 'UPI ID is required.', 'error');
      return;
    }
    const newUpi: CustomerUpiDetail = {
      id: `upi_${Date.now()}`,
      upiId: upiFormId.trim().toLowerCase(),
      holderName: upiFormHolder.trim() || bankCustomer.name,
      appName: upiFormApp.trim() || 'UPI',
      qrImageUrl: upiFormQrImage || undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [newUpi, ...upiDetails];
    setUpiDetails(updated);
    StorageService.saveCustomerBankingData(bankCustomer.id, {
      bankAccounts,
      upiDetails: updated,
    });
    addToast('UPI / QR Added', `UPI ID ${newUpi.upiId} saved successfully.`, 'success');
    setIsAddingUpi(false);
    setUpiFormId('');
    setUpiFormQrImage(null);
  };

  const handleDeleteUpiDetail = (upiId: string) => {
    if (!bankCustomer) return;
    const updated = upiDetails.filter((u) => u.id !== upiId);
    setUpiDetails(updated);
    StorageService.saveCustomerBankingData(bankCustomer.id, {
      bankAccounts,
      upiDetails: updated,
    });
    addToast('UPI Removed', 'UPI detail removed successfully.', 'info');
  };

  const handleDownloadQrImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('QR Downloaded', `Saved ${filename}`, 'success');
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
            placeholder="Search by name, phone, email, or company..."
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
                    className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                    title="Open Khata Ledger"
                  >
                    <BookOpen className="w-4 h-4" />
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
                  <button
                    onClick={() => handleOpenBankModal(cust)}
                    className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 transition-colors"
                    title="Customer Bank Accounts & UPI QRs"
                  >
                    <Landmark className="w-4 h-4" />
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
                <button
                  onClick={() => {
                    const c = activeCustomer;
                    setActiveCustomer(null);
                    handleOpenBankModal(c);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors"
                >
                  <Landmark className="w-4 h-4 text-indigo-500" /> Bank & UPI
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

      {/* ======================================================== */}
      {/* CUSTOMER BANK ACCOUNTS & UPI QR MODAL */}
      {/* ======================================================== */}
      {isBankModalOpen && bankCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Bank Accounts & UPI / QR
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>Customer: <strong className="text-slate-800 dark:text-slate-200">{bankCustomer.name}</strong></span>
                    <span>•</span>
                    <span>{bankCustomer.phone}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      {bankCustomer.category}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBankModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs & Add Buttons */}
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveBankTab('accounts')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeBankTab === 'accounts'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Bank Accounts ({bankAccounts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBankTab('upi')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeBankTab === 'upi'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>UPI & QR Codes ({upiDetails.length})</span>
                </button>
              </div>

              {activeBankTab === 'accounts' ? (
                <button
                  type="button"
                  onClick={() => setIsAddingAccount(!isAddingAccount)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingAccount ? 'Cancel' : 'Add Bank Account'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingUpi(!isAddingUpi)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingUpi ? 'Cancel' : 'Add UPI / QR'}</span>
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-950/40">
              
              {/* TAB 1: BANK ACCOUNTS */}
              {activeBankTab === 'accounts' && (
                <div className="space-y-5">
                  {/* Add Account Form */}
                  {isAddingAccount && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-indigo-500/20 shadow-md space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> New Bank Account Details
                        </h4>
                        <span className="text-[11px] text-slate-400">Click to save in customer portfolio</span>
                      </div>

                      <form onSubmit={handleSaveBankAccount} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* Bank Name Dropdown */}
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Select Bank <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={bankFormName}
                              onChange={(e) => setBankFormName(e.target.value)}
                              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              {POPULAR_BANKS.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                            {bankFormName === 'Other Bank' && (
                              <input
                                type="text"
                                placeholder="Enter Bank Name"
                                value={bankFormCustomName}
                                onChange={(e) => setBankFormCustomName(e.target.value)}
                                className="mt-2 w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                              />
                            )}
                          </div>

                          {/* Account Holder Name */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Account Holder Name
                            </label>
                            <input
                              type="text"
                              value={bankFormHolder}
                              onChange={(e) => setBankFormHolder(e.target.value)}
                              placeholder="Account Holder Name"
                              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Account Type */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Account Type
                            </label>
                            <select
                              value={bankFormType}
                              onChange={(e) => setBankFormType(e.target.value as any)}
                              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Savings">Savings Account</option>
                              <option value="Current">Current Account</option>
                              <option value="Corporate">Corporate Account</option>
                            </select>
                          </div>

                          {/* Account Number */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Account Number <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={bankFormAccNumber}
                              onChange={(e) => setBankFormAccNumber(e.target.value)}
                              placeholder="e.g. 100029384756"
                              required
                              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          {/* IFSC Code */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              IFSC Code <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={bankFormIfsc}
                              onChange={(e) => setBankFormIfsc(e.target.value.toUpperCase())}
                              placeholder="e.g. SBIN0001234"
                              required
                              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Branch Name */}
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Branch Name (Optional)
                            </label>
                            <input
                              type="text"
                              value={bankFormBranch}
                              onChange={(e) => setBankFormBranch(e.target.value)}
                              placeholder="e.g. Connaught Place Branch, New Delhi"
                              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setIsAddingAccount(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all"
                          >
                            Save Bank Account
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Saved Bank Accounts List */}
                  {bankAccounts.length === 0 && !isAddingAccount ? (
                    <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-500 flex items-center justify-center mx-auto">
                        <Landmark className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        No Bank Accounts Added Yet
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Add this customer&apos;s bank account details to easily view and copy Account Number and IFSC Code during transactions.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddingAccount(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Bank Account</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bankAccounts.map((acc) => {
                        const accCopied = copiedKey === `${acc.id}_acc`;
                        const ifscCopied = copiedKey === `${acc.id}_ifsc`;

                        return (
                          <div
                            key={acc.id}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3.5 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
                          >
                            {/* Card Top */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                    {acc.bankName}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    acc.accountType === 'Current'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                      : acc.accountType === 'Corporate'
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  }`}>
                                    {acc.accountType}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span className="truncate">{acc.accountHolderName}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteBankAccount(acc.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                title="Delete Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Clickable Account Number Box */}
                            <div
                              onClick={() => handleCopyValue(acc.accountNumber, 'Account Number', `${acc.id}_acc`)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                accCopied
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                              }`}
                              title="Click to copy Account Number"
                            >
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                  Account Number
                                </div>
                                <div className="font-mono font-bold text-sm text-slate-900 dark:text-white truncate">
                                  {acc.accountNumber}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1 text-xs font-semibold">
                                {accCopied ? (
                                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fadeIn">
                                    <Check className="w-3.5 h-3.5" /> Copied!
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-xs">
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Clickable IFSC Code Box */}
                            <div
                              onClick={() => handleCopyValue(acc.ifscCode, 'IFSC Code', `${acc.id}_ifsc`)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                ifscCopied
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                              }`}
                              title="Click to copy IFSC Code"
                            >
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                  IFSC Code
                                </div>
                                <div className="font-mono font-bold text-xs uppercase text-slate-900 dark:text-white truncate">
                                  {acc.ifscCode}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1 text-xs font-semibold">
                                {ifscCopied ? (
                                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fadeIn">
                                    <Check className="w-3.5 h-3.5" /> Copied!
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-xs">
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Branch info */}
                            {acc.branchName && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{acc.branchName}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: UPI & QR CODES */}
              {activeBankTab === 'upi' && (
                <div className="space-y-5">
                  {/* Add UPI Form */}
                  {isAddingUpi && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500/20 shadow-md space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> Add UPI ID / QR Code
                        </h4>
                        <span className="text-[11px] text-slate-400">Save custom UPI or upload QR</span>
                      </div>

                      <form onSubmit={handleSaveUpiDetail} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* UPI ID */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              UPI ID / VPA <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={upiFormId}
                              onChange={(e) => setUpiFormId(e.target.value)}
                              placeholder="e.g. user@oksbi, 9876543210@paytm"
                              required
                              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          {/* App Provider */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              App / Provider
                            </label>
                            <select
                              value={upiFormApp}
                              onChange={(e) => setUpiFormApp(e.target.value)}
                              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              {UPI_APPS.map((app) => (
                                <option key={app} value={app}>{app}</option>
                              ))}
                            </select>
                          </div>

                          {/* Payee Name */}
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Payee / Holder Name
                            </label>
                            <input
                              type="text"
                              value={upiFormHolder}
                              onChange={(e) => setUpiFormHolder(e.target.value)}
                              placeholder="Payee Name"
                              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          {/* QR Upload */}
                          <div className="sm:col-span-2 space-y-2">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              QR Code Image (Optional)
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                ref={upiQrInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleUpiQrImageUpload}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => upiQrInputRef.current?.click()}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5 text-slate-500" />
                                <span>{upiFormQrImage ? 'Change QR Image' : 'Upload QR Image'}</span>
                              </button>
                              {upiFormQrImage && (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={upiFormQrImage}
                                    alt="QR Preview"
                                    className="w-8 h-8 rounded-lg object-contain border border-slate-300 dark:border-slate-600 bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setUpiFormQrImage(null)}
                                    className="text-xs text-rose-500 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Upload customer&apos;s physical QR image, or leave empty to auto-generate a digital QR code from the UPI ID.
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setIsAddingUpi(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all"
                          >
                            Save UPI / QR
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Saved UPI / QR List */}
                  {upiDetails.length === 0 && !isAddingUpi ? (
                    <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-500 flex items-center justify-center mx-auto">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        No UPI IDs or QR Codes Added Yet
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Save multiple UPI IDs and QR codes for instant 1-click copying and scanning.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddingUpi(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First UPI / QR</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {upiDetails.map((upi) => {
                        const upiCopied = copiedKey === `${upi.id}_upi`;
                        const payeeName = upi.holderName || bankCustomer.name;
                        const qrCodeUrl = upi.qrImageUrl || getQrCodeUrl(buildUpiUri(upi.upiId, payeeName));

                        return (
                          <div
                            key={upi.id}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all flex flex-col justify-between"
                          >
                            <div>
                              {/* Card Top */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                    {upi.appName || 'UPI'}
                                  </span>
                                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span>{payeeName}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteUpiDetail(upi.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                  title="Delete UPI"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Clickable UPI Box */}
                              <div
                                onClick={() => handleCopyValue(upi.upiId, 'UPI ID', `${upi.id}_upi`)}
                                className={`mt-3 p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                  upiCopied
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500'
                                }`}
                                title="Click to copy UPI ID"
                              >
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    UPI ID / VPA
                                  </div>
                                  <div className="font-mono font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {upi.upiId}
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-1 text-xs font-semibold">
                                  {upiCopied ? (
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fadeIn">
                                      <Check className="w-3.5 h-3.5" /> Copied!
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs">
                                      <Copy className="w-3.5 h-3.5" /> Copy
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* QR Code Section */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
                              <img
                                src={qrCodeUrl}
                                alt="UPI QR"
                                className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1 object-contain shrink-0 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                                onClick={() => setEnlargedQr({ upiId: upi.upiId, qrUrl: qrCodeUrl, holderName: payeeName, appName: upi.appName })}
                                title="Click to enlarge QR"
                              />

                              <div className="space-y-1.5 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setEnlargedQr({ upiId: upi.upiId, qrUrl: qrCodeUrl, holderName: payeeName, appName: upi.appName })}
                                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View QR</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadQrImage(qrCodeUrl, `QR_${upi.upiId.replace(/[^a-zA-Z0-9]/g, '_')}.png`)}
                                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <span className="text-xs text-slate-400">
                💡 Tip: Click on any Account No, IFSC Code, or UPI ID to copy instantly.
              </span>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ENLARGED UPI QR CODE VIEWER MODAL */}
      {/* ======================================================== */}
      {enlargedQr && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="text-left">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Scan &amp; Pay via UPI
                </h4>
                <p className="text-[11px] text-slate-400">
                  {enlargedQr.appName || 'UPI Payment'}
                </p>
              </div>
              <button
                onClick={() => setEnlargedQr(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 inline-block">
              <img
                src={enlargedQr.qrUrl}
                alt="Enlarged UPI QR"
                className="w-56 h-56 object-contain mx-auto"
              />
            </div>

            {enlargedQr.holderName && (
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payee: {enlargedQr.holderName}
              </div>
            )}

            {/* Click to Copy UPI ID */}
            <div
              onClick={() => handleCopyValue(enlargedQr.upiId, 'UPI ID', 'enlarged_upi')}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 cursor-pointer hover:border-emerald-500 transition-all"
              title="Click to copy UPI ID"
            >
              <div className="min-w-0 text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">UPI ID</span>
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate block">
                  {enlargedQr.upiId}
                </span>
              </div>
              <div className="shrink-0">
                {copiedKey === 'enlarged_upi' ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-xs">
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadQrImage(enlargedQr.qrUrl, `QR_${enlargedQr.upiId.replace(/[^a-zA-Z0-9]/g, '_')}.png`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR</span>
              </button>
              <button
                type="button"
                onClick={() => setEnlargedQr(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
