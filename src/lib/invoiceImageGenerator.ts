import { Invoice, SystemSettings, UserProfile } from '@/types';
import { formatINR, formatDate } from '@/lib/utils';

/**
 * Renders an ultra-crisp, professional Tax Invoice receipt image onto an HTML5 Canvas.
 * Returns high-resolution image data URL and Blob for direct preview in Digital KhataBook.
 */
export async function generateInvoiceImageDataUrl(
  invoice: Invoice,
  settings: SystemSettings,
  profile: Partial<UserProfile> = {},
  qrDataUrl?: string
): Promise<{ dataUrl: string; blob?: Blob }> {
  if (typeof window === 'undefined') {
    return { dataUrl: '' };
  }

  const businessName = settings.businessName || profile.businessName || 'SmartKhata Merchant';
  const businessAddress = settings.businessAddress || (profile as any)?.address || '';
  const businessPhone = settings.businessPhone || profile.phone || '';
  const businessEmail = settings.businessEmail || profile.email || '';
  const businessGst = (settings as any).businessGst || settings.paymentSettings?.businessGst || (settings as any)?.gstin || '';
  const upiId = settings.paymentSettings?.upiId || '';

  const items = Array.isArray(invoice.items) && invoice.items.length > 0
    ? invoice.items
    : [{ name: 'Products / Services', description: '', quantity: 1, unitPrice: invoice.total, discountPercent: 0, taxPercent: 0, total: invoice.total }];

  // Canvas Geometry
  const width = 800;
  const rowHeight = 36;
  const tableHeaderY = 240;
  const tableHeight = items.length * rowHeight;
  const bottomSectionY = tableHeaderY + 45 + tableHeight + 20;
  const bottomHeight = 240;
  const height = bottomSectionY + bottomHeight + 60;

  const canvas = document.createElement('canvas');
  // Use 2x pixel ratio for retina/HD sharpness
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '' };

  ctx.scale(scale, scale);

  // 1. Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Subtle border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // 2. Header Top Bar (Brand banner)
  const headerGrad = ctx.createLinearGradient(10, 10, width - 10, 10);
  headerGrad.addColorStop(0, '#4F46E5');
  headerGrad.addColorStop(1, '#06B6D4');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(10, 10, width - 20, 6);

  // --- BUSINESS DETAILS (Left) ---
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(businessName, 32, 48);

  ctx.fillStyle = '#475569';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  let curY = 68;
  if (businessAddress) {
    ctx.fillText(businessAddress.slice(0, 55), 32, curY);
    curY += 16;
  }
  const contactParts: string[] = [];
  if (businessPhone) contactParts.push(`Phone: ${businessPhone}`);
  if (businessEmail) contactParts.push(`Email: ${businessEmail}`);
  if (contactParts.length > 0) {
    ctx.fillText(contactParts.join('  •  '), 32, curY);
    curY += 16;
  }
  if (businessGst) {
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#1E293B';
    ctx.fillText(`GSTIN: ${businessGst}`, 32, curY);
    curY += 16;
  }

  // --- INVOICE BADGE & DATES (Right) ---
  ctx.fillStyle = '#4F46E5';
  ctx.beginPath();
  ctx.roundRect(width - 200, 32, 168, 28, 6);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TAX INVOICE', width - 116, 50);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Invoice #: ${invoice.invoiceNumber}`, width - 32, 80);

  ctx.fillStyle = '#475569';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Date: ${formatDate(invoice.issueDate || (invoice as any).invoiceDate || invoice.createdAt || new Date().toISOString())}`, width - 32, 98);
  ctx.fillText(`Due Date: ${formatDate(invoice.dueDate || new Date().toISOString())}`, width - 32, 116);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, 140);
  ctx.lineTo(width - 32, 140);
  ctx.stroke();

  // --- BILLED TO (Customer) ---
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('BILLED TO (CUSTOMER)', 32, 162);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(invoice.customerName || 'Walk-in Customer', 32, 184);

  ctx.fillStyle = '#475569';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  let custY = 202;
  const custContact: string[] = [];
  if (invoice.customerPhone) custContact.push(`Phone: ${invoice.customerPhone}`);
  if (invoice.customerAddress) custContact.push(`Address: ${invoice.customerAddress.slice(0, 45)}`);
  if (custContact.length > 0) {
    ctx.fillText(custContact.join('  •  '), 32, custY);
    custY += 16;
  }
  if (invoice.customerGst) {
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`GSTIN: ${invoice.customerGst}`, 32, custY);
  }

  // --- ITEMS TABLE ---
  const tableY = tableHeaderY;
  // Table Header Box
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(32, tableY, width - 64, 34, 6);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('ITEM / DESCRIPTION', 46, tableY + 22);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', 440, tableY + 22);
  ctx.fillText('TAX%', 530, tableY + 22);
  ctx.textAlign = 'right';
  ctx.fillText('RATE', 620, tableY + 22);
  ctx.fillText('AMOUNT', width - 46, tableY + 22);
  ctx.textAlign = 'left';

  // Rows
  let itemY = tableY + 45;
  items.forEach((item, idx) => {
    // Alternating row background
    if (idx % 2 === 1) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(32, itemY - 14, width - 64, rowHeight);
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const itm = item as any;
    const itemLabel = itm.name
      ? (itm.description ? `${itm.name} (${itm.description})` : itm.name)
      : (itm.description || 'Item');
    ctx.fillText(itemLabel.slice(0, 48), 46, itemY + 6);

    ctx.fillStyle = '#475569';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(item.quantity || 1), 440, itemY + 6);
    ctx.fillText(`${item.taxPercent || 0}%`, 530, itemY + 6);

    ctx.textAlign = 'right';
    ctx.fillText(formatINR(item.unitPrice || 0), 620, itemY + 6);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(formatINR(item.total || 0), width - 46, itemY + 6);
    ctx.textAlign = 'left';

    // Thin row bottom border
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, itemY + 18);
    ctx.lineTo(width - 32, itemY + 18);
    ctx.stroke();

    itemY += rowHeight;
  });

  // --- BOTTOM SECTION ---
  const bottomY = itemY + 10;

  // 1. UPI QR Code (Left)
  if (qrDataUrl) {
    try {
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = qrDataUrl;
      await new Promise((res) => {
        qrImg.onload = () => res(null);
        qrImg.onerror = () => res(null);
        setTimeout(() => res(null), 800);
      });
      if (qrImg.naturalWidth > 0) {
        ctx.drawImage(qrImg, 46, bottomY, 130, 130);
      }
    } catch {}

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Scan to Pay via UPI', 46, bottomY + 148);

    ctx.fillStyle = '#64748B';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    if (upiId) {
      ctx.fillText(`UPI: ${upiId}`, 46, bottomY + 164);
    }
    ctx.fillText('Google Pay • PhonePe • Paytm • BHIM', 46, bottomY + 180);
  } else {
    ctx.fillStyle = '#64748B';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Payment Terms: Immediate Settlement', 46, bottomY + 20);
    if (upiId) ctx.fillText(`UPI ID: ${upiId}`, 46, bottomY + 40);
  }

  // 2. Summary Totals (Right)
  const summaryX = width - 280;
  const summaryValX = width - 46;
  let sumY = bottomY + 10;

  const drawSummaryLine = (label: string, value: string, isBold: boolean = false, color: string = '#0F172A') => {
    ctx.fillStyle = '#475569';
    ctx.font = isBold ? 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(label, summaryX, sumY);

    ctx.fillStyle = color;
    ctx.font = isBold ? 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(value, summaryValX, sumY);
    ctx.textAlign = 'left';

    sumY += 22;
  };

  drawSummaryLine('Subtotal', formatINR(invoice.subtotal || invoice.total));

  if (invoice.discountAmount && invoice.discountAmount > 0) {
    drawSummaryLine('Discount', `- ${formatINR(invoice.discountAmount)}`, false, '#DC2626');
  }

  const cgstVal = invoice.cgst || (invoice as any).cgstAmount || 0;
  const sgstVal = invoice.sgst || (invoice as any).sgstAmount || 0;
  const igstVal = invoice.igst || (invoice as any).igstAmount || 0;
  const taxVal = invoice.taxAmount || (invoice as any).totalTax || 0;

  if (cgstVal > 0) {
    drawSummaryLine('CGST', `+ ${formatINR(cgstVal)}`);
  }
  if (sgstVal > 0) {
    drawSummaryLine('SGST', `+ ${formatINR(sgstVal)}`);
  }
  if (igstVal > 0) {
    drawSummaryLine('IGST', `+ ${formatINR(igstVal)}`);
  }
  if (taxVal > 0 && !cgstVal && !sgstVal && !igstVal) {
    drawSummaryLine('Tax Amount', `+ ${formatINR(taxVal)}`);
  }

  // Grand Total Box
  sumY += 4;
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.roundRect(summaryX - 10, sumY - 14, (summaryValX - summaryX) + 20, 36, 8);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Grand Total', summaryX, sumY + 9);

  ctx.textAlign = 'right';
  ctx.fillText(formatINR(invoice.total), summaryValX, sumY + 9);
  ctx.textAlign = 'left';

  sumY += 38;

  // Paid / Balance status
  if (invoice.paidAmount !== undefined && invoice.paidAmount > 0) {
    drawSummaryLine('Paid Amount', formatINR(invoice.paidAmount), false, '#059669');
  }
  const rawBalance = (invoice as any).balanceAmount;
  const balanceDue = rawBalance !== undefined ? rawBalance : Math.max(0, invoice.total - (invoice.paidAmount || 0));
  if (balanceDue > 0) {
    drawSummaryLine('Balance Due', formatINR(balanceDue), true, '#DC2626');
  } else {
    drawSummaryLine('Balance Due', '₹0.00 (Fully Settled)', true, '#059669');
  }

  // Footer Note
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Thank you for your business! This is a computer-generated tax invoice.', width / 2, height - 24);
  ctx.textAlign = 'left';

  const dataUrl = canvas.toDataURL('image/png');

  // Convert to Blob
  let blob: Blob | undefined = undefined;
  try {
    const byteString = atob(dataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    blob = new Blob([ab], { type: 'image/png' });
  } catch {}

  return { dataUrl, blob };
}
