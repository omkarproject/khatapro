'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/lib/utils';
import { getActiveCurrency, t } from '@/lib/i18n';
import { Product } from '@/types';
import {
  PackageCheck,
  Plus,
  Search,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Barcode,
  Building,
  MapPin,
  X,
  Sparkles,
  TrendingUp,
  Tag,
  Trash2,
  Pencil,
  FileSpreadsheet,
  Upload,
  Download,
  FileDown,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function InventoryPage() {
  const { products, saveProduct, saveProductsBatch, deleteProduct, adjustStock, addToast, settings, activeCurrency, activeLanguage } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'low'>('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState('10');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');

  // Excel Import / Export State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<Product[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileImportInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formBuyPrice, setFormBuyPrice] = useState('');
  const [formSellPrice, setFormSellPrice] = useState('');
  const [formStock, setFormStock] = useState('50');
  const [formMinStock, setFormMinStock] = useState('10');
  const [formUnit, setFormUnit] = useState<'pcs' | 'boxes' | 'kg' | 'liters'>('pcs');
  const [formSupplier, setFormSupplier] = useState('');
  const [formLocation, setFormLocation] = useState('');

  // Computations
  const totalValuation = products.reduce((acc, p) => acc + p.purchasePrice * p.currentStock, 0);
  const totalItemsCount = products.reduce((acc, p) => acc + p.currentStock, 0);
  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchQuery =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStock = filterStock === 'all' || (filterStock === 'low' && p.currentStock <= p.minStock);
      return matchQuery && matchStock;
    });
  }, [products, searchTerm, filterStock]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormBarcode('');
    setFormCategory('General');
    setFormBuyPrice('');
    setFormSellPrice('');
    setFormStock('50');
    setFormMinStock('10');
    setFormUnit('pcs');
    setFormSupplier('');
    setFormLocation('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormCategory(p.category || 'General');
    setFormBuyPrice(p.purchasePrice ? p.purchasePrice.toString() : '');
    setFormSellPrice(p.sellingPrice ? p.sellingPrice.toString() : '');
    setFormStock(p.currentStock.toString());
    setFormMinStock(p.minStock.toString());
    setFormUnit(p.unit as any);
    setFormSupplier(p.supplier || '');
    setFormLocation(p.location || '');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('Name Required', 'Please enter product name.', 'error');
      return;
    }

    const prodToSave: Product = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      name: formName.trim(),
      sku: formSku.trim() || (editingProduct ? editingProduct.sku : `SKP-${Math.floor(100 + Math.random() * 900)}`),
      barcode: formBarcode.trim() || (editingProduct ? editingProduct.barcode : `890${Math.floor(1000000000 + Math.random() * 9000000000)}`),
      category: formCategory.trim() || 'General',
      purchasePrice: parseFloat(formBuyPrice) || 0,
      sellingPrice: parseFloat(formSellPrice) || 0,
      currentStock: editingProduct ? editingProduct.currentStock : (parseInt(formStock) || 0),
      minStock: parseInt(formMinStock) || 5,
      unit: formUnit as any,
      supplier: formSupplier.trim(),
      location: formLocation.trim(),
      updatedAt: new Date().toISOString(),
    };

    saveProduct(prodToSave);
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormBarcode('');
    setFormBuyPrice('');
    setFormSellPrice('');
    addToast(editingProduct ? 'Product Updated' : 'Product Added', `${prodToSave.name} saved successfully.`, 'success');
  };

  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const delta = parseInt(stockDelta) || 0;
    if (delta <= 0) return;

    adjustStock(selectedProduct.id, adjustType === 'in' ? delta : -delta);
    setIsStockAdjustOpen(false);
  };

  // Download Sample Excel Template for Bulk Import
  const handleDownloadSampleExcel = async () => {
    try {
      addToast('Preparing Sample', 'Generating sample Excel template...', 'info');
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SmartKhata ERP';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Products Template', {
        views: [{ showGridLines: true }]
      });

      worksheet.columns = [
        { key: 'name', width: 32 },
        { key: 'sku', width: 18 },
        { key: 'barcode', width: 18 },
        { key: 'category', width: 20 },
        { key: 'costPrice', width: 16 },
        { key: 'sellingPrice', width: 16 },
        { key: 'currentStock', width: 16 },
        { key: 'minStock', width: 16 },
        { key: 'unit', width: 14 },
        { key: 'supplier', width: 24 },
        { key: 'location', width: 22 },
      ];

      const NAVY_HEADER = '1E3A8A';
      const SUB_NAVY = '2563EB';
      const WHITE = 'FFFFFF';
      const LIGHT_BG = 'F8FAFC';

      // Title Row
      worksheet.mergeCells('A1:K1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'SMARTKHATA ERP — INVENTORY BULK IMPORT TEMPLATE';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: WHITE } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 32;

      // Instruction Subtitle
      worksheet.mergeCells('A2:K2');
      const subCell = worksheet.getCell('A2');
      subCell.value = 'INSTRUCTIONS: Fill product details below. Required fields: Product Name *, Cost Price *, Selling Price *, Current Stock *. Valid Units: pcs, kg, boxes, liters, meters.';
      subCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUB_NAVY } };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(2).height = 22;

      // Table Headers
      const headers = [
        'Product Name *',
        'SKU Code',
        'Barcode',
        'Category',
        'Cost Price (₹) *',
        'Selling Price (₹) *',
        'Current Stock *',
        'Min Stock Alert',
        'Unit (pcs/kg/boxes/liters)',
        'Supplier',
        'Warehouse Location / Shelf',
      ];
      const hRow = worksheet.getRow(3);
      headers.forEach((h, idx) => {
        const c = hRow.getCell(idx + 1);
        c.value = h;
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
        c.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : (idx >= 4 && idx <= 7 ? 'right' : 'center'), indent: idx === 0 ? 1 : 0 };
      });
      hRow.height = 24;

      // Sample Data Rows (Real-world retail/wholesale examples)
      const sampleRows = [
        ['Basmati Premium Rice 5kg', 'RICE-BAS-001', '890103000101', 'Grains & Grocery', 420, 520, 50, 10, 'kg', 'National Agro Traders', 'Aisle 3, Rack A'],
        ['Fortune Sunflower Oil 1L', 'OIL-SUN-002', '890103000102', 'Edible Oils', 135, 160, 120, 20, 'liters', 'Adani Wilmar Dist.', 'Rack B-2'],
        ['Parle-G Gold Biscuits Pack', 'BIS-PAR-003', '890103000103', 'Snacks & Bakery', 240, 280, 80, 15, 'boxes', 'Parle Products Ltd', 'Shelf C-1'],
        ['Aashirvaad Shudh Chakki Atta 10kg', 'ATTA-AAS-004', '890103000104', 'Flour & Grains', 380, 440, 60, 10, 'kg', 'ITC Distribution', 'Pallet 4'],
        ['Tata Tea Gold 500g', 'TEA-TAT-005', '890103000105', 'Beverages', 260, 310, 45, 12, 'pcs', 'Tata Consumer Dist.', 'Rack A-2'],
        ['Dettol Antiseptic Liquid 500ml', 'DET-ANT-006', '890103000106', 'Personal Care', 185, 220, 35, 8, 'pcs', 'Reckitt Benckiser', 'Shelf D-3'],
      ];

      sampleRows.forEach((row, i) => {
        const r = worksheet.getRow(4 + i);
        row.forEach((val, cIdx) => {
          const cell = r.getCell(cIdx + 1);
          cell.value = val;
          if (cIdx >= 4 && cIdx <= 7) {
            cell.numFmt = typeof val === 'number' ? '#,##0.00' : '@';
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (cIdx === 8) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', indent: 1 };
          }
          if (i % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BG } };
          }
          cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
        });
        r.height = 20;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'SmartKhata_Inventory_Sample_Template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('Sample Template Downloaded', 'Sample Excel template downloaded with demo data.', 'success');
    } catch (err) {
      console.error('Error generating sample Excel template:', err);
      addToast('Download Failed', 'Could not generate sample template.', 'error');
    }
  };

  // Export All Stock to Excel
  const handleExportStockExcel = async () => {
    if (products.length === 0) {
      addToast('No Inventory', 'Export karne ke liye inventory me koi product nahi hai.', 'warning');
      return;
    }

    try {
      setIsExporting(true);
      addToast('Preparing Excel', 'Generating inventory stock spreadsheet...', 'info');

      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SmartKhata ERP';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Inventory Stock', {
        views: [{ showGridLines: true }]
      });

      worksheet.columns = [
        { key: 'sno', width: 8 },
        { key: 'name', width: 30 },
        { key: 'sku', width: 16 },
        { key: 'barcode', width: 16 },
        { key: 'category', width: 18 },
        { key: 'unit', width: 12 },
        { key: 'costPrice', width: 16 },
        { key: 'sellingPrice', width: 16 },
        { key: 'margin', width: 14 },
        { key: 'stock', width: 16 },
        { key: 'minStock', width: 16 },
        { key: 'valuation', width: 20 },
        { key: 'status', width: 16 },
        { key: 'supplier', width: 22 },
        { key: 'location', width: 20 },
      ];

      const NAVY_HEADER = '1E3A8A';
      const SUB_NAVY = '2563EB';
      const WHITE = 'FFFFFF';
      const LIGHT_BG = 'F8FAFC';
      const BORDER_COLOR = 'CBD5E1';

      // Title & Business Branding Row
      worksheet.mergeCells('A1:O1');
      const titleRow = worksheet.getCell('A1');
      titleRow.value = (settings.businessName || 'Business Enterprise').toUpperCase();
      titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: WHITE } };
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 36;

      // Subtitle Row
      worksheet.mergeCells('A2:O2');
      const subRow = worksheet.getCell('A2');
      subRow.value = `INVENTORY & WAREHOUSE STOCK LEDGER • ${products.length} REGISTERED SKUS`;
      subRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } };
      subRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUB_NAVY } };
      subRow.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(2).height = 24;

      // Meta info row
      worksheet.mergeCells('A3:G3');
      worksheet.getCell('A3').value = `Generated On: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      worksheet.getCell('A3').font = { name: 'Calibri', size: 9, italic: true, color: { argb: '64748B' } };
      worksheet.getCell('A3').alignment = { vertical: 'middle', indent: 1 };

      worksheet.mergeCells('H3:O3');
      worksheet.getCell('H3').value = `Total Stock Value: ${formatINR(totalValuation)} • Total Units: ${totalItemsCount}`;
      worksheet.getCell('H3').font = { name: 'Calibri', size: 9, bold: true, color: { argb: '64748B' } };
      worksheet.getCell('H3').alignment = { vertical: 'middle', horizontal: 'right' };
      worksheet.getRow(3).height = 20;

      worksheet.getRow(4).height = 8;

      // Table Headers
      const headers = [
        '#',
        'Product Name',
        'SKU Code',
        'Barcode',
        'Category',
        'Unit',
        'Cost Price (₹)',
        'Selling Price (₹)',
        'Margin %',
        'Current Stock',
        'Min Stock Alert',
        'Stock Valuation (₹)',
        'Stock Status',
        'Supplier',
        'Location / Shelf',
      ];

      const headerRow = worksheet.getRow(5);
      headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: idx === 0 || idx === 5 || idx === 8 || idx === 12 ? 'center' : (idx >= 6 && idx <= 11 ? 'right' : 'left'),
          indent: idx === 1 || idx === 2 || idx === 4 || idx >= 13 ? 1 : 0,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: BORDER_COLOR } },
          bottom: { style: 'medium', color: { argb: NAVY_HEADER } },
        };
      });
      headerRow.height = 24;

      let rIdx = 6;
      products.forEach((p, idx) => {
        const row = worksheet.getRow(rIdx);
        const margin = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100) : 0;
        const val = p.purchasePrice * p.currentStock;
        const isLow = p.currentStock <= p.minStock;
        const isOut = p.currentStock <= 0;

        row.getCell(1).value = idx + 1;
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

        row.getCell(2).value = p.name;
        row.getCell(2).font = { name: 'Calibri', size: 10, bold: true };
        row.getCell(2).alignment = { vertical: 'middle', indent: 1 };

        row.getCell(3).value = p.sku;
        row.getCell(3).alignment = { vertical: 'middle', indent: 1 };

        row.getCell(4).value = p.barcode || '-';
        row.getCell(4).alignment = { vertical: 'middle', indent: 1 };

        row.getCell(5).value = p.category || 'General';
        row.getCell(5).alignment = { vertical: 'middle', indent: 1 };

        row.getCell(6).value = p.unit || 'pcs';
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

        row.getCell(7).value = p.purchasePrice;
        row.getCell(7).numFmt = '₹#,##0.00';
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };

        row.getCell(8).value = p.sellingPrice;
        row.getCell(8).numFmt = '₹#,##0.00';
        row.getCell(8).font = { name: 'Calibri', size: 10, bold: true, color: { argb: '16A34A' } };
        row.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };

        row.getCell(9).value = `${margin}%`;
        row.getCell(9).font = { name: 'Calibri', size: 10, bold: true, color: { argb: margin >= 20 ? '16A34A' : 'D97706' } };
        row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };

        row.getCell(10).value = p.currentStock;
        row.getCell(10).font = { name: 'Calibri', size: 10, bold: true, color: { argb: isOut ? 'E11D48' : (isLow ? 'D97706' : '0F172A') } };
        row.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };

        row.getCell(11).value = p.minStock;
        row.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };

        row.getCell(12).value = val;
        row.getCell(12).numFmt = '₹#,##0.00';
        row.getCell(12).font = { name: 'Calibri', size: 10, bold: true };
        row.getCell(12).alignment = { vertical: 'middle', horizontal: 'right' };

        row.getCell(13).value = isOut ? 'Out of Stock 🔴' : (isLow ? 'Low Stock ⚠️' : 'In Stock 🟢');
        row.getCell(13).font = { name: 'Calibri', size: 9, bold: true, color: { argb: isOut ? 'E11D48' : (isLow ? 'D97706' : '16A34A') } };
        row.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };

        row.getCell(14).value = p.supplier || '-';
        row.getCell(14).alignment = { vertical: 'middle', indent: 1 };

        row.getCell(15).value = p.location || '-';
        row.getCell(15).alignment = { vertical: 'middle', indent: 1 };

        if (idx % 2 === 1) {
          for (let c = 1; c <= 15; c++) {
            row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BG } };
          }
        }
        for (let c = 1; c <= 15; c++) {
          row.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
        }
        row.height = 20;
        rIdx++;
      });

      // Total Summary Row
      const totRow = worksheet.getRow(rIdx);
      worksheet.mergeCells(`A${rIdx}:I${rIdx}`);
      totRow.getCell(1).value = 'TOTAL INVENTORY VALUATION & STOCK COUNT';
      totRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } };
      totRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

      totRow.getCell(10).value = totalItemsCount;
      totRow.getCell(10).font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } };
      totRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };

      totRow.getCell(12).value = totalValuation;
      totRow.getCell(12).numFmt = '₹#,##0.00';
      totRow.getCell(12).font = { name: 'Calibri', size: 12, bold: true, color: { argb: WHITE } };
      totRow.getCell(12).alignment = { vertical: 'middle', horizontal: 'right' };

      for (let c = 1; c <= 15; c++) {
        totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
        totRow.getCell(c).border = {
          top: { style: 'medium', color: { argb: NAVY_HEADER } },
          bottom: { style: 'double', color: { argb: NAVY_HEADER } },
        };
      }
      totRow.height = 26;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Inventory_Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('Excel Exported', 'Inventory stock report downloaded successfully.', 'success');
    } catch (err) {
      console.error('Error exporting inventory to Excel:', err);
      addToast('Export Error', 'Failed to generate inventory spreadsheet.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Excel File Upload & Parse
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsParsing(true);
    setImportErrors([]);
    setParsedProducts([]);

    try {
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        setImportErrors(['No worksheet found in the uploaded Excel file.']);
        setIsParsing(false);
        return;
      }

      // Find the header row
      let headerRowIndex = -1;
      let colMap: Record<string, number> = {};

      worksheet.eachRow((row, rowNumber) => {
        if (headerRowIndex !== -1) return;
        const values = row.values as any[];
        if (!values) return;

        const rowStr = values.map(v => String(v || '').toLowerCase()).join(' ');
        if (rowStr.includes('product') || rowStr.includes('name') || rowStr.includes('sku') || rowStr.includes('stock')) {
          headerRowIndex = rowNumber;
          values.forEach((val, colIdx) => {
            const str = String(val || '').toLowerCase().trim();
            if (str.includes('product') || (str.includes('name') && !str.includes('supplier'))) colMap['name'] = colIdx;
            else if (str.includes('sku')) colMap['sku'] = colIdx;
            else if (str.includes('barcode')) colMap['barcode'] = colIdx;
            else if (str.includes('category')) colMap['category'] = colIdx;
            else if (str.includes('cost') || str.includes('buy') || str.includes('purchase')) colMap['purchasePrice'] = colIdx;
            else if (str.includes('sell') || str.includes('sale') || str.includes('mrp')) colMap['sellingPrice'] = colIdx;
            else if (str.includes('current stock') || str.includes('stock') || str.includes('qty') || str.includes('quantity')) {
              if (!str.includes('min')) colMap['currentStock'] = colIdx;
            }
            else if (str.includes('min') || str.includes('alert')) colMap['minStock'] = colIdx;
            else if (str.includes('unit')) colMap['unit'] = colIdx;
            else if (str.includes('supplier')) colMap['supplier'] = colIdx;
            else if (str.includes('location') || str.includes('shelf') || str.includes('rack')) colMap['location'] = colIdx;
          });
        }
      });

      if (headerRowIndex === -1 || !colMap['name']) {
        setImportErrors([
          'Could not find valid column headers. Please ensure the Excel sheet has "Product Name", "Cost Price", "Selling Price", and "Current Stock" columns, or download our sample template.',
        ]);
        setIsParsing(false);
        return;
      }

      const parsed: Product[] = [];
      const errors: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIndex) return;

        const getVal = (colKey: string) => {
          const colIdx = colMap[colKey];
          if (!colIdx) return undefined;
          const cell = row.getCell(colIdx);
          return cell?.value;
        };

        const rawName = String(getVal('name') || '').trim();
        if (!rawName) return;

        const rawCost = parseFloat(String(getVal('purchasePrice') || '0').replace(/[^0-9.]/g, '')) || 0;
        const rawSell = parseFloat(String(getVal('sellingPrice') || '0').replace(/[^0-9.]/g, '')) || 0;
        const rawStock = parseInt(String(getVal('currentStock') || '0').replace(/[^0-9.-]/g, '')) || 0;
        const rawMinStock = parseInt(String(getVal('minStock') || '5').replace(/[^0-9.-]/g, '')) || 5;

        const rawSku = String(getVal('sku') || '').trim();
        const rawBarcode = String(getVal('barcode') || '').trim();
        const rawCat = String(getVal('category') || 'General').trim();
        const rawSupplier = String(getVal('supplier') || '').trim();
        const rawLocation = String(getVal('location') || '').trim();
        
        let unitVal: any = String(getVal('unit') || 'pcs').toLowerCase().trim();
        if (!['pcs', 'kg', 'boxes', 'liters', 'meters'].includes(unitVal)) {
          unitVal = 'pcs';
        }

        const productItem: Product = {
          id: `prod_${Date.now()}_${rowNumber}`,
          name: rawName,
          sku: rawSku || `SKU-${Date.now().toString().slice(-4)}-${rowNumber}`,
          barcode: rawBarcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          category: rawCat || 'General',
          purchasePrice: rawCost,
          sellingPrice: rawSell,
          currentStock: rawStock,
          minStock: rawMinStock,
          unit: unitVal,
          supplier: rawSupplier,
          location: rawLocation,
          updatedAt: new Date().toISOString(),
        };

        parsed.push(productItem);
      });

      if (parsed.length === 0) {
        errors.push('No valid product rows found in the sheet. Please make sure product names and stock values are present.');
      }

      setParsedProducts(parsed);
      setImportErrors(errors);
    } catch (err: any) {
      console.error('Error parsing uploaded Excel file:', err);
      setImportErrors(['Failed to read Excel file: ' + (err?.message || 'Invalid format')]);
    } finally {
      setIsParsing(false);
      if (fileImportInputRef.current) fileImportInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (parsedProducts.length === 0) {
      addToast('No Products', 'Import karne ke liye koi valid product nahi mila.', 'warning');
      return;
    }

    saveProductsBatch(parsedProducts);
    setIsImportModalOpen(false);
    setImportFile(null);
    setParsedProducts([]);
    setImportErrors([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <PackageCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Inventory & Stock Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time stock ledger, automated low inventory warnings, margin calculations, and SKU tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportStockExcel}
            disabled={isExporting || products.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            title="Export all stock to Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export Excel</span>
          </button>

          {/* Import Excel Button */}
          <button
            type="button"
            onClick={() => {
              setImportFile(null);
              setParsedProducts([]);
              setImportErrors([]);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all cursor-pointer"
            title="Import products & stock from Excel"
          >
            <Upload className="w-4 h-4 text-indigo-500" />
            <span>Import Excel</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Stock Value (Cost)</div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalValuation)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Across {products.length} registered SKUs
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Units in Warehouse</div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {totalItemsCount.toLocaleString('en-IN')} units
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Physically verified inventory
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Low Stock Warnings</div>
          <div className={`text-2xl font-black font-mono mt-1 ${lowStockCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {lowStockCount} Products
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Requires immediate reorder from suppliers
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product name, SKU or category..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStock('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
              filterStock === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setFilterStock('low')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
              filterStock === 'low'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock ({lowStockCount})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-card p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3">Product & SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Cost</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3 text-right">Margin %</th>
                <th className="py-3 px-3 text-center">Stock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((p) => {
                const isLow = p.currentStock <= p.minStock;
                const margin = p.purchasePrice > 0
                  ? Math.round(((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100)
                  : 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>SKU: {p.sku}</span>
                        {p.location && <span>• {p.location}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatINR(p.purchasePrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(p.sellingPrice)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-full ${
                          isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 ring-1 ring-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}
                      >
                        {isLow && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        {p.currentStock} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                      {margin}%
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setAdjustType('in');
                            setIsStockAdjustOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1"
                        >
                          <ArrowDown className="w-3 h-3" /> In
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setAdjustType('out');
                            setIsStockAdjustOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-400 font-bold text-[10px] flex items-center gap-1"
                        >
                          <ArrowUp className="w-3 h-3" /> Out
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-400 hover:text-indigo-600 transition-colors ml-1 cursor-pointer"
                          title="Edit Product"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Product */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-500" />
                {editingProduct ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. WiFi 6 Router AX3000"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. SKP-RTR-01"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Electronics"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t('purchasePrice', 'Purchase Cost')} ({getActiveCurrency().symbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formBuyPrice}
                    onChange={(e) => setFormBuyPrice(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t('sellingPrice', 'Selling Price')} ({getActiveCurrency().symbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formSellPrice}
                    onChange={(e) => setFormSellPrice(e.target.value)}
                    placeholder="e.g. 3800"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Unit
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e: any) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="boxes">Boxes</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="liters">Liters</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Supplier / Vendor Name
                </label>
                <input
                  type="text"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  placeholder="e.g. Havells India Ltd"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white fintech-gradient-primary shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all"
                >
                  {editingProduct ? 'Save Changes' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-left">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Import Stock from Excel</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bulk upload products, prices, and stock inventory via spreadsheet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Sample Template Download Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-emerald-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                  <span>Excel Template & Sample Format</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Is sample template me pre-filled columns hain jisse aap easily data arrange kar sakte hain.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700/80 border border-indigo-200 dark:border-indigo-800/60 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sample Download</span>
              </button>
            </div>

            {/* Step 2: File Upload / Choose */}
            <div>
              <input
                type="file"
                ref={fileImportInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onClick={() => fileImportInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  importFile
                    ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/20'
                }`}
              >
                {isParsing ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Reading Excel data...</span>
                  </div>
                ) : importFile ? (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{importFile.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {(importFile.size / 1024).toFixed(1)} KB • Click to choose another file
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center py-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Click to choose Excel file (.xlsx, .xls, .csv)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Product Name, Cost Price, Selling Price, and Stock columns required
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Errors / Warnings Display */}
            {importErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Import Validation Warning</span>
                </div>
                {importErrors.map((err, i) => (
                  <div key={i} className="text-[11px] text-rose-600 dark:text-rose-400">{err}</div>
                ))}
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedProducts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{parsedProducts.length} Products Ready to Import</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Existing SKU/names will be updated
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 text-[10px] uppercase border-b border-slate-200 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-2 px-2.5">Name</th>
                        <th className="py-2 px-2.5">Category</th>
                        <th className="py-2 px-2.5 text-right">Cost</th>
                        <th className="py-2 px-2.5 text-right">Selling</th>
                        <th className="py-2 px-2.5 text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                      {parsedProducts.slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-2.5 font-sans font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                            {p.name}
                          </td>
                          <td className="py-1.5 px-2.5 font-sans text-slate-500">
                            {p.category}
                          </td>
                          <td className="py-1.5 px-2.5 text-right text-slate-600 dark:text-slate-400">
                            ₹{p.purchasePrice}
                          </td>
                          <td className="py-1.5 px-2.5 text-right text-emerald-600 font-bold">
                            ₹{p.sellingPrice}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {p.currentStock} {p.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedProducts.length > 5 && (
                    <div className="py-1.5 text-center text-[10px] font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                      + {parsedProducts.length - 5} more products in file
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedProducts.length === 0 || isParsing}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              >
                <Upload className="w-4 h-4" />
                <span>Import {parsedProducts.length > 0 ? `${parsedProducts.length} Products` : 'Stock'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Adjust Stock In / Out */}
      {isStockAdjustOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {adjustType === 'in' ? 'Stock In (Add)' : 'Stock Out (Deduct)'}
              </h3>
              <button onClick={() => setIsStockAdjustOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Product: <strong>{selectedProduct.name}</strong>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Current Stock: {selectedProduct.currentStock} {selectedProduct.unit}
              </div>
            </div>

            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Quantity ({selectedProduct.unit}) *
                </label>
                <input
                  type="number"
                  required
                  value={stockDelta}
                  onChange={(e) => setStockDelta(e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full px-3.5 py-2.5 text-base font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStockAdjustOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md ${
                    adjustType === 'in'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  Confirm {adjustType === 'in' ? 'Stock In' : 'Stock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-left">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Import Stock from Excel</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bulk upload products, prices, and stock inventory via spreadsheet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Sample Template Download Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-emerald-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                  <span>Excel Template & Sample Format</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Is sample template me pre-filled columns hain jisse aap easily data arrange kar sakte hain.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700/80 border border-indigo-200 dark:border-indigo-800/60 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sample Download</span>
              </button>
            </div>

            {/* Step 2: File Upload / Choose */}
            <div>
              <input
                type="file"
                ref={fileImportInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onClick={() => fileImportInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  importFile
                    ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/20'
                }`}
              >
                {isParsing ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Reading Excel data...</span>
                  </div>
                ) : importFile ? (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{importFile.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {(importFile.size / 1024).toFixed(1)} KB • Click to choose another file
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center py-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Click to choose Excel file (.xlsx, .xls, .csv)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Product Name, Cost Price, Selling Price, and Stock columns required
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Errors / Warnings Display */}
            {importErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Import Validation Warning</span>
                </div>
                {importErrors.map((err, i) => (
                  <div key={i} className="text-[11px] text-rose-600 dark:text-rose-400">{err}</div>
                ))}
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedProducts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{parsedProducts.length} Products Ready to Import</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Existing SKU/names will be updated
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 text-[10px] uppercase border-b border-slate-200 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-2 px-2.5">Name</th>
                        <th className="py-2 px-2.5">Category</th>
                        <th className="py-2 px-2.5 text-right">Cost</th>
                        <th className="py-2 px-2.5 text-right">Selling</th>
                        <th className="py-2 px-2.5 text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                      {parsedProducts.slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-2.5 font-sans font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                            {p.name}
                          </td>
                          <td className="py-1.5 px-2.5 font-sans text-slate-500">
                            {p.category}
                          </td>
                          <td className="py-1.5 px-2.5 text-right text-slate-600 dark:text-slate-400">
                            ₹{p.purchasePrice}
                          </td>
                          <td className="py-1.5 px-2.5 text-right text-emerald-600 font-bold">
                            ₹{p.sellingPrice}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {p.currentStock} {p.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedProducts.length > 5 && (
                    <div className="py-1.5 text-center text-[10px] font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                      + {parsedProducts.length - 5} more products in file
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedProducts.length === 0 || isParsing}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              >
                <Upload className="w-4 h-4" />
                <span>Import {parsedProducts.length > 0 ? `${parsedProducts.length} Products` : 'Stock'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
