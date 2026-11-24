import { jsPDF } from 'jspdf';
import { Invoice, SystemSettings, UserProfile } from '@/types';
import { formatINR, formatDate } from '@/lib/utils';
import QRCode from 'qrcode';

/**
 * Generates an ultra-crisp dynamic UPI QR Code with the merchant's Profile/Business Logo in the center.
 */
export async function generateInvoiceQrWithLogo(
  upiUri: string,
  logoUrl?: string,
  size: number = 320
): Promise<string> {
  if (typeof window === 'undefined') return '';

  const baseQrDataUrl = await QRCode.toDataURL(upiUri, {
    width: size,
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  if (!logoUrl) return baseQrDataUrl;

  try {
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.src = baseQrDataUrl;
    await new Promise((resolve, reject) => {
      qrImg.onload = () => resolve(null);
      qrImg.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseQrDataUrl;

    // Draw main QR code
    ctx.drawImage(qrImg, 0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const logoOuterRadius = size * 0.13; // ~41px on 320px
    const logoInnerRadius = size * 0.11; // ~35px

    // 1. Draw circular white backing badge with soft border
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, logoOuterRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = size * 0.01;
    ctx.strokeStyle = '#CBD5E1';
    ctx.stroke();
    ctx.restore();

    // 2. Draw merchant logo inside circular clip
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = logoUrl;
    await new Promise((resolve) => {
      logoImg.onload = () => resolve(null);
      logoImg.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 1200);
    });

    if (logoImg.naturalWidth > 0 && logoImg.naturalHeight > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, logoInnerRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        logoImg,
        centerX - logoInnerRadius,
        centerY - logoInnerRadius,
        logoInnerRadius * 2,
        logoInnerRadius * 2
      );
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('generateInvoiceQrWithLogo fallback:', err);
    return baseQrDataUrl;
  }
}

export interface InvoicePdfTheme {
  primary: [number, number, number];
  titleText: string;
  tableHeaderBg: [number, number, number];
  tableHeaderText: [number, number, number];
  totalBoxBg: [number, number, number];
  totalBoxBorder: [number, number, number];
  totalTextColor: [number, number, number];
  topBarColor?: [number, number, number];
}

export function getInvoicePdfTheme(templateId?: string): InvoicePdfTheme {
  switch (templateId) {
    case 'template_gold_luxury':
      return {
        primary: [180, 83, 9], // #b45309 Warm Gold
        titleText: 'TAX INVOICE & BILL OF SUPPLY',
        tableHeaderBg: [254, 243, 199], // #fef3c7
        tableHeaderText: [146, 64, 14], // #92400e
        totalBoxBg: [255, 251, 235], // #fffbeb
        totalBoxBorder: [217, 119, 6], // #d97706
        totalTextColor: [180, 83, 9],
        topBarColor: [217, 119, 6],
      };
    case 'template_emerald':
      return {
        primary: [6, 95, 70], // #065f46
        titleText: 'TAX INVOICE & BILL OF SUPPLY',
        tableHeaderBg: [236, 253, 245],
        tableHeaderText: [6, 78, 59],
        totalBoxBg: [236, 253, 245],
        totalBoxBorder: [6, 95, 70],
        totalTextColor: [6, 95, 70],
        topBarColor: [6, 95, 70],
      };
    case 'template_fintech':
      return {
        primary: [5, 150, 105], // #059669
        titleText: 'TAX INVOICE & BILL OF SUPPLY',
        tableHeaderBg: [15, 23, 42],
        tableHeaderText: [255, 255, 255],
        totalBoxBg: [15, 23, 42],
        totalBoxBorder: [5, 150, 105],
        totalTextColor: [52, 211, 153],
        topBarColor: [15, 23, 42],
      };
    case 'template_corporate':
      return {
        primary: [30, 58, 138], // #1e3a8a
        titleText: 'TAX INVOICE & BILL OF SUPPLY',
        tableHeaderBg: [239, 246, 255],
        tableHeaderText: [30, 58, 138],
        totalBoxBg: [239, 246, 255],
        totalBoxBorder: [30, 58, 138],
        totalTextColor: [30, 58, 138],
        topBarColor: [30, 58, 138],
      };
    case 'template_startup_gradient':
      return {
        primary: [124, 58, 237], // #7c3aed
        titleText: 'TAX INVOICE & BILL OF SUPPLY',
        tableHeaderBg: [245, 243, 255],
        tableHeaderText: [109, 40, 217],
        totalBoxBg: [245, 243, 255],
        totalBoxBorder: [124, 58, 237],
        totalTextColor: [124, 58, 237],
        topBarColor: [124, 58, 237],
      };
    case 'template_gst_compliant':
      return {
        primary: [37, 99, 235], // #2563eb
        titleText: 'TAX INVOICE & BILL OF SUPPLY',
        tableHeaderBg: [239, 246, 255],
        tableHeaderText: [29, 78, 216],
        totalBoxBg: [239, 246, 255],
        totalBoxBorder: [37, 99, 235],
        totalTextColor: [29, 78, 216],
        topBarColor: [37, 99, 235],
      };
    case 'template_swiss_monochrome':
      return {
        primary: [0, 0, 0],
        titleText: 'TAX INVOICE & BILL OF SUPPLY',
        tableHeaderBg: [0, 0, 0],
        tableHeaderText: [255, 255, 255],
        totalBoxBg: [248, 250, 252],
        totalBoxBorder: [0, 0, 0],
        totalTextColor: [0, 0, 0],
        topBarColor: [0, 0, 0],
      };
    case 'template_pos_receipt':
      return {
        primary: [15, 23, 42],
        titleText: 'TAX INVOICE & RETAIL RECEIPT',
        tableHeaderBg: [241, 245, 249],
        tableHeaderText: [15, 23, 42],
        totalBoxBg: [248, 250, 252],
        totalBoxBorder: [15, 23, 42],
        totalTextColor: [15, 23, 42],
        topBarColor: [15, 23, 42],
      };
    case 'template_ribbon_accent':
      return {
        primary: [2, 132, 199], // #0284c7
        titleText: 'TAX INVOICE & BILL OF SUPPLY',
        tableHeaderBg: [240, 249, 255],
        tableHeaderText: [3, 105, 161],
        totalBoxBg: [240, 249, 255],
        totalBoxBorder: [2, 132, 199],
        totalTextColor: [2, 132, 199],
        topBarColor: [2, 132, 199],
      };
    case 'template_minimal':
    default:
      return {
        primary: [79, 70, 229], // #4f46e5
        titleText: 'TAX INVOICE & BILL OF SUPPLY',
        tableHeaderBg: [248, 250, 252],
        tableHeaderText: [71, 85, 105],
        totalBoxBg: [241, 245, 249],
        totalBoxBorder: [226, 232, 240],
        totalTextColor: [79, 70, 229],
        topBarColor: [79, 70, 229],
      };
  }
}

/**
 * Creates an official, high-resolution vector Tax Invoice PDF document.
 */
export async function generateInvoicePdfBlob(
  invoice: Invoice,
  settings: SystemSettings,
  profile: Partial<UserProfile> = {},
  qrDataUrl?: string,
  templateId?: string
): Promise<Blob> {
  const activeTemplateId =
    templateId ||
    settings.selectedInvoiceTemplate ||
    (typeof window !== 'undefined' ? localStorage.getItem('skp_invoice_template') || localStorage.getItem('selectedInvoiceTemplate') : null) ||
    'template_minimal';

  const theme = getInvoicePdfTheme(activeTemplateId);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const businessName = settings.businessName || profile.businessName || 'SmartKhata Merchant';
  const businessAddress = settings.businessAddress || profile.businessAddress || (profile as any)?.address || settings.websiteSupportLocation || 'Registered Office Address';
  const businessPhone = settings.businessPhone || profile.phone || '';
  const businessEmail = settings.businessEmail || profile.email || '';
  const businessGst = (settings as any).businessGst || settings.paymentSettings?.businessGst || (settings as any)?.gstin || '';
  const upiId = settings.paymentSettings?.upiId || '';

  // Left & Right Page Margins
  const marginX = 14;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginX * 2;
  let currentY = 16;

  // Draw Luxury Brand Top Bar if specified
  if (theme.topBarColor) {
    doc.setFillColor(theme.topBarColor[0], theme.topBarColor[1], theme.topBarColor[2]);
    doc.rect(0, 0, pageWidth, 3.5, 'F');
  }

  // --- 1. HEADER SECTION ---
  // If merchant has a logo, try to load and draw it
  let logoX = marginX;
  const rawLogo = settings.businessLogo || profile.avatarUrl || '';
  let logoDrawn = false;

  if (rawLogo && typeof window !== 'undefined') {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = rawLogo;
      await new Promise((res) => {
        img.onload = () => res(null);
        img.onerror = () => res(null);
        setTimeout(() => res(null), 800);
      });
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        // Draw logo 18x18 mm
        doc.addImage(img, 'PNG', marginX, currentY, 18, 18);
        logoX = marginX + 22;
        logoDrawn = true;
      }
    } catch {}
  }

  // Business info on left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(businessName, logoX, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600

  let bY = currentY + 9;
  if (businessAddress) {
    doc.text(businessAddress.slice(0, 45), logoX, bY);
    bY += 4;
  }
  const contactParts: string[] = [];
  if (businessPhone) contactParts.push(`Phone: ${businessPhone}`);
  if (businessEmail) contactParts.push(`Email: ${businessEmail}`);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(' • ').slice(0, 55), logoX, bY);
    bY += 4;
  }
  if (businessGst) {
    doc.text(`GSTIN: ${businessGst}`, logoX, bY);
    bY += 4;
  }

  // Invoice Title & Meta on right
  const rightX = pageWidth - marginX;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.text(theme.titleText, rightX, currentY + 4, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.invoiceNumber, rightX, currentY + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${formatDate(invoice.issueDate || (invoice as any).date)}`, rightX, currentY + 15, { align: 'right' });
  doc.text(`Due: ${formatDate(invoice.dueDate)}`, rightX, currentY + 20, { align: 'right' });

  // Status Badge on right
  const isPaid = invoice.status === 'paid';
  const badgeText = isPaid ? 'PAID' : (invoice.status === 'overdue' ? 'OVERDUE' : 'UNPAID');
  const badgeWidth = 22;
  const badgeHeight = 6;
  const badgeX = rightX - badgeWidth;
  const badgeY = currentY + 23;

  if (isPaid) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(badgeText, badgeX + badgeWidth / 2, badgeY + 4.2, { align: 'center' });
  } else {
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(254, 205, 211); // rose-200
    doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(badgeText, badgeX + badgeWidth / 2, badgeY + 4.2, { align: 'center' });
  }

  currentY = Math.max(bY, badgeY + badgeHeight) + 6;

  // Horizontal Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, rightX, currentY);
  currentY += 6;

  // --- 2. BILLED TO SECTION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('BILLED TO:', marginX, currentY);
  currentY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(invoice.customerName || 'Valued Customer', marginX, currentY);
  currentY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  if (invoice.customerPhone) {
    doc.text(`Phone: ${invoice.customerPhone}`, marginX, currentY);
    currentY += 4;
  }
  if (invoice.customerAddress) {
    doc.text(`Address: ${invoice.customerAddress}`, marginX, currentY);
    currentY += 4;
  }

  currentY += 4;

  // --- 3. ITEMS TABLE ---
  const tableHeaderY = currentY;
  const colIndexX = marginX + 3;
  const colDescX = marginX + 10;
  const colQtyX = marginX + 95;
  const colUnitPriceX = marginX + 125;
  const colGstX = marginX + 150;
  const colTotalX = rightX - 3;

  // Table Header Background
  doc.setFillColor(theme.tableHeaderBg[0], theme.tableHeaderBg[1], theme.tableHeaderBg[2]);
  doc.setDrawColor(theme.totalBoxBorder[0], theme.totalBoxBorder[1], theme.totalBoxBorder[2]);
  doc.roundedRect(marginX, tableHeaderY, contentWidth, 8, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(theme.tableHeaderText[0], theme.tableHeaderText[1], theme.tableHeaderText[2]);
  doc.text('#', colIndexX, tableHeaderY + 5.2);
  doc.text('ITEM DESCRIPTION', colDescX, tableHeaderY + 5.2);
  doc.text('QTY', colQtyX, tableHeaderY + 5.2, { align: 'right' });
  doc.text('UNIT PRICE', colUnitPriceX, tableHeaderY + 5.2, { align: 'right' });
  doc.text('GST %', colGstX, tableHeaderY + 5.2, { align: 'right' });
  doc.text('TOTAL (₹)', colTotalX, tableHeaderY + 5.2, { align: 'right' });

  currentY = tableHeaderY + 8;

  // Render items
  invoice.items.forEach((item, idx) => {
    const rowY = currentY + 5.5;

    // Zebra row background on alternate rows
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(marginX, currentY, contentWidth, 7.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(idx + 1), colIndexX, rowY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const itemLabel = item.name
      ? (item.description ? `${item.name} (${item.description})` : item.name)
      : (item.description || 'Item');
    doc.text(itemLabel.slice(0, 48), colDescX, rowY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(String(item.quantity), colQtyX, rowY, { align: 'right' });
    doc.text(`₹${item.unitPrice.toLocaleString('en-IN')}`, colUnitPriceX, rowY, { align: 'right' });
    doc.text(item.taxPercent > 0 ? `${item.taxPercent}%` : '-', colGstX, rowY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`₹${item.total.toLocaleString('en-IN')}`, colTotalX, rowY, { align: 'right' });

    currentY += 7.5;
    // Row underline
    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, currentY, rightX, currentY);
  });

  currentY += 6;

  // --- 4. BOTTOM SECTION: SCAN TO PAY QR (LEFT) + SUMMARY TOTALS (RIGHT) ---
  const bottomBoxY = currentY;

  // Left: Integrated Scan to Pay QR Box
  const qrBoxWidth = 85;
  const qrBoxHeight = 44;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, bottomBoxY, qrBoxWidth, qrBoxHeight, 2.5, 2.5, 'FD');

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', marginX + 3.5, bottomBoxY + 4, 35, 35);
    } catch (e) {
      console.warn('doc.addImage qrDataUrl error:', e);
    }
  }

  const qrTextX = marginX + 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Scan to Pay via UPI', qrTextX, bottomBoxY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text((upiId || 'Merchant UPI ID').slice(0, 24), qrTextX, bottomBoxY + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(79, 70, 229); // indigo
  doc.text('GPay • PhonePe • Paytm • BHIM', qrTextX, bottomBoxY + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('100% Instant & Zero Fee', qrTextX, bottomBoxY + 29);

  // Right: Subtotal, Taxes & Grand Total Summary
  const sumStartX = marginX + 98;
  const sumValX = rightX;
  let sumY = bottomBoxY + 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  // Subtotal
  doc.text('Subtotal:', sumStartX, sumY);
  doc.text(`₹${invoice.subtotal.toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });
  sumY += 5;

  // Discount (if any)
  if (invoice.discountAmount > 0) {
    doc.setTextColor(5, 150, 105);
    doc.text('Discount:', sumStartX, sumY);
    doc.text(`-₹${invoice.discountAmount.toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });
    doc.setTextColor(71, 85, 105);
    sumY += 5;
  }

  // Taxes
  if (invoice.cgst > 0) {
    doc.text('CGST:', sumStartX, sumY);
    doc.text(`+₹${invoice.cgst.toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });
    sumY += 5;
  }
  if (invoice.sgst > 0) {
    doc.text('SGST:', sumStartX, sumY);
    doc.text(`+₹${invoice.sgst.toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });
    sumY += 5;
  }
  if (invoice.igst > 0) {
    doc.text('IGST:', sumStartX, sumY);
    doc.text(`+₹${invoice.igst.toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });
    sumY += 5;
  }

  // Grand Total Highlight Bar
  sumY += 2;
  doc.setFillColor(theme.totalBoxBg[0], theme.totalBoxBg[1], theme.totalBoxBg[2]);
  doc.setDrawColor(theme.totalBoxBorder[0], theme.totalBoxBorder[1], theme.totalBoxBorder[2]);
  doc.roundedRect(sumStartX - 2, sumY - 1, (sumValX - sumStartX) + 4, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Amount:', sumStartX, sumY + 5.5);
  doc.setTextColor(theme.totalTextColor[0], theme.totalTextColor[1], theme.totalTextColor[2]);
  doc.text(`₹${invoice.total.toLocaleString('en-IN')}`, sumValX, sumY + 5.5, { align: 'right' });

  currentY = Math.max(bottomBoxY + qrBoxHeight, sumY + 12) + 6;

  // --- 5. TERMS & NOTES FOOTER ---
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, rightX, currentY);
  currentY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Terms: Payment due within 15 days. Subject to local jurisdiction.', marginX, currentY);
  currentY += 3.5;
  doc.text('Notes: Thank you for your business! For any billing queries, contact the merchant phone or email above.', marginX, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Powered by SmartKhata Fintech Enterprise Portal • Automated Tax Invoice', pageWidth / 2, currentY, { align: 'center' });

  // Output as Blob
  const arrayBuffer = doc.output('arraybuffer');
  return new Blob([arrayBuffer], { type: 'application/pdf' });
}

export interface ReceiptCanvasData {
  receiptNo: string;
  amount: number;
  dueAmount?: number;
  gatewayFee?: number;
  payeeName: string;
  payeeUpi: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  dateTime: string;
  paymentMode: string;
  referenceNo: string;
  gatewayTxnId?: string;
  websiteName?: string;
}

/**
 * Generates a high-resolution Classic White & Clean Receipt image Data URL.
 */
export async function generateReceiptCanvasBlob(data: ReceiptCanvasData): Promise<string> {
  if (typeof window === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    const w = 680;
    const h = 880;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Outer Page Background (Subtle Clean Frame)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Main White Receipt Card
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(20, 20, w - 40, h - 40, 20);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top Emerald Brand Bar
    const grad = ctx.createLinearGradient(20, 0, w - 20, 0);
    grad.addColorStop(0, '#059669');
    grad.addColorStop(0.5, '#10b981');
    grad.addColorStop(1, '#0284c7');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(20, 20, w - 40, 8, [20, 20, 0, 0]);
    ctx.fill();

    // Header Branding: Merchant Business Name & Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(data.payeeName || data.websiteName || 'SmartKhata Merchant', 48, 68);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('OFFICIAL DIGITAL PAYMENT RECEIPT • TAX INVOICE', 48, 88);

    // Verified Badge (Top Right)
    ctx.fillStyle = '#ecfdf5';
    ctx.beginPath();
    ctx.roundRect(w - 180, 50, 132, 28, 14);
    ctx.fill();
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('✔ 100% VERIFIED', w - 166, 68);

    // Horizontal Divider
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(48, 108);
    ctx.lineTo(w - 48, 108);
    ctx.stroke();

    // Big Amount Settled Box (Emerald tint)
    ctx.fillStyle = '#f0fdf4';
    ctx.beginPath();
    ctx.roundRect(48, 126, w - 96, 105, 16);
    ctx.fill();
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('TOTAL AMOUNT SETTLED & PAID', 72, 156);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(formatINR(data.amount), 72, 200);

    // Breakdown note inside amount box
    const duePart = data.dueAmount !== undefined ? `Due Amount: ${formatINR(data.dueAmount)}` : '';
    const feePart = data.gatewayFee && data.gatewayFee > 0 ? `  •  PG Convenience Fee (2%): ${formatINR(data.gatewayFee)}` : '';
    if (duePart) {
      ctx.fillStyle = '#166534';
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${duePart}${feePart}`, 72, 222);
    }

    // Details Rows (Table style)
    const rows: [string, string, boolean][] = [
      ['Receipt ID', data.receiptNo, false],
      ['Payment Date & Time', data.dateTime, false],
      ['Bank Ref / UTR No', data.referenceNo, true],
      ['Paid To (Merchant)', data.payeeName, false],
      ['Merchant UPI ID', data.payeeUpi || 'UPI Linked Account', false],
      ['Paid By (Customer)', `${data.customerName}${data.customerPhone ? ` (${data.customerPhone})` : ''}`, false],
      ['Customer Email', data.customerEmail || 'billing@smartkhata.in', false],
      ['Payment Method', data.paymentMode, false],
      ['Settlement Status', 'COMPLETED & RECORDED', true],
    ];

    if (data.gatewayTxnId) {
      rows.splice(3, 0, ['Gateway Txn ID', data.gatewayTxnId, false]);
    }

    let startY = 268;
    rows.forEach(([label, val, isHighlight]) => {
      // Label (left)
      ctx.fillStyle = '#64748b';
      ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(label, 48, startY);

      // Value (right)
      if (label === 'Settlement Status') {
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      } else if (isHighlight) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      }
      ctx.textAlign = 'right';
      ctx.fillText(val, w - 48, startY);
      ctx.textAlign = 'left';

      // Row Separator
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(48, startY + 12);
      ctx.lineTo(w - 48, startY + 12);
      ctx.stroke();

      startY += 40;
    });

    // Bottom Security & Compliance Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Secured by NPCI Unified Payments Interface (UPI) • 256-Bit SSL Encrypted Settlement', w / 2, h - 62);
    ctx.fillText('Official computer-generated receipt issued natively by SmartKhata ERP Enterprise Portal', w / 2, h - 45);
    ctx.textAlign = 'left';

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Error drawing receipt canvas:', e);
    return '';
  }
}
