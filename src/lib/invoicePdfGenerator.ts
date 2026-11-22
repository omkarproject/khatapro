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

/**
 * Creates an official, high-resolution vector Tax Invoice PDF document.
 */
export async function generateInvoicePdfBlob(
  invoice: Invoice,
  settings: SystemSettings,
  profile: Partial<UserProfile> = {},
  qrDataUrl?: string
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const businessName = settings.businessName || profile.businessName || 'SmartKhata Merchant';
  const businessAddress = settings.businessAddress || (profile as any)?.address || '';
  const businessPhone = settings.businessPhone || profile.phone || '';
  const businessEmail = settings.businessEmail || profile.email || '';
  const businessGst = (settings as any).businessGst || settings.paymentSettings?.businessGst || (settings as any)?.gstin || '';
  const upiId = settings.paymentSettings?.upiId || '';

  // Left & Right Page Margins
  const marginX = 14;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginX * 2;
  let currentY = 16;

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
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text('TAX INVOICE', rightX, currentY + 4, { align: 'right' });

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
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, tableHeaderY, contentWidth, 8, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
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
    doc.text((item.description || 'Item').slice(0, 42), colDescX, rowY);

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
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(sumStartX - 2, sumY - 1, (sumValX - sumStartX) + 4, 9, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Amount:', sumStartX, sumY + 5.5);
  doc.setTextColor(79, 70, 229);
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
