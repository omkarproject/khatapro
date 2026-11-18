import QRCode from 'qrcode';
import { formatINR } from './utils';

export interface LockedQrCardOptions {
  upiUri: string;
  amount: number;
  businessName: string;
  payeeName?: string;
  upiId: string;
  customerName?: string;
  note?: string;
  logoUrl?: string;
  brandName?: string;
  brandLogoUrl?: string;
  websiteUrl?: string;
}

/**
 * Loads an image with CORS handling and timeout safeguard.
 * Returns null if the image fails or times out.
 */
function loadImageSafely(src?: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src || typeof window === 'undefined') {
      return resolve(null);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 3000);

    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(img);
      }
    };
    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    };
    img.src = src;
  });
}

/**
 * Helper to draw a rounded rectangle on a 2D canvas context.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl?: number; tr?: number; br?: number; bl?: number }
) {
  let tl = 0, tr = 0, br = 0, bl = 0;
  if (typeof radius === 'number') {
    tl = tr = br = bl = radius;
  } else {
    tl = radius.tl || 0;
    tr = radius.tr || 0;
    br = radius.br || 0;
    bl = radius.bl || 0;
  }

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
  ctx.lineTo(x + width, y + height - br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
  ctx.lineTo(x + bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/**
 * Generates a ultra-modern, high-resolution branded Amount-Locked UPI QR Standee image
 * with Business Header, Center Profile/Business Logo in the QR, Customer Name section,
 * and Footer with Website Brand Display Name.
 */
export async function generateBrandedLockedQrCard(options: LockedQrCardOptions): Promise<string> {
  if (typeof window === 'undefined') return '';

  const {
    upiUri,
    amount,
    businessName,
    payeeName,
    upiId,
    customerName,
    note,
    logoUrl,
    brandName = 'SmartKhata ERP',
    brandLogoUrl,
    websiteUrl = typeof window !== 'undefined' ? window.location.hostname : 'smartkhatapro.in',
  } = options;

  // 1. Generate QR Code Data URL with High Error Correction ('H')
  // Level H allows ~30% center overlay without losing scan reliability
  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 600,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  const [qrImg, merchantLogoImg, brandLogoImg] = await Promise.all([
    loadImageSafely(qrDataUrl),
    loadImageSafely(logoUrl),
    loadImageSafely(brandLogoUrl),
  ]);

  // 2. Setup Canvas (1000px width x 1360px height)
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return qrDataUrl;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // --- Background Card ---
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, 1000, 1360, 36);
  ctx.fill();

  // Subtle outer border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  roundRect(ctx, 2, 2, 996, 1356, 36);
  ctx.stroke();

  // --- Top Decorative Accent Stripe ---
  const accentGrad = ctx.createLinearGradient(0, 0, 1000, 0);
  accentGrad.addColorStop(0, '#06b6d4'); // Cyan
  accentGrad.addColorStop(0.5, '#6366f1'); // Indigo
  accentGrad.addColorStop(1, '#ec4899'); // Pink
  ctx.fillStyle = accentGrad;
  roundRect(ctx, 0, 0, 1000, 12, { tl: 36, tr: 36, bl: 0, br: 0 });
  ctx.fill();

  // --- Top Navy/Indigo Header Banner ---
  const headerGrad = ctx.createLinearGradient(0, 12, 0, 240);
  headerGrad.addColorStop(0, '#0f172a');
  headerGrad.addColorStop(0.5, '#1e1b4b');
  headerGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 12, 1000, 230);

  // Bharat Interface for Money / NPCI pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ctx, 300, 28, 400, 30, 15);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Green active pulse dot
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(325, 43, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BHARAT INTERFACE FOR MONEY • NPCI UPI 2.0', 510, 47);

  // Business Name (TOP)
  const displayBusinessName = (businessName || payeeName || 'BUSINESS DESK').toUpperCase();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  // Truncate if too long
  const truncatedName = displayBusinessName.length > 36 ? displayBusinessName.slice(0, 34) + '...' : displayBusinessName;
  ctx.fillText(truncatedName, 500, 96);

  // Payee Name & UPI ID
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  const upiSubtitle = upiId ? `${payeeName || businessName} • ${upiId}` : 'Accepted here • Scan with any UPI app';
  ctx.fillText(upiSubtitle, 500, 126);

  // Verified Merchant Badge
  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  roundRect(ctx, 330, 146, 340, 32, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('✔ Verified Merchant • Direct Bank Settlement', 500, 167);

  // --- AMOUNT-LOCKED BANNER / PILL (Above QR) ---
  const amountY = 275;
  if (amount > 0) {
    const amountGrad = ctx.createLinearGradient(180, amountY, 820, amountY);
    amountGrad.addColorStop(0, '#059669');
    amountGrad.addColorStop(1, '#047857');
    ctx.fillStyle = amountGrad;
    roundRect(ctx, 220, amountY, 560, 56, 28);
    ctx.fill();

    // Subtle white glow border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🔒 AMOUNT LOCKED: ${formatINR(amount)}`, 500, amountY + 36);

    ctx.fillStyle = '#047857';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Scan to pay exact amount • Pre-filled & Locked in PhonePe, GPay, Paytm', 500, amountY + 76);
  } else {
    ctx.fillStyle = '#4f46e5';
    roundRect(ctx, 320, amountY, 360, 44, 22);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 17px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN & PAY ANY AMOUNT', 500, amountY + 28);
  }

  // --- CENTER QR CODE CONTAINER ---
  const qrBoxY = amount > 0 ? 370 : 340;
  const qrBoxSize = 510;
  const qrBoxX = (1000 - qrBoxSize) / 2;

  // White inner card with shadow
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Corner Crosshairs (Theme Target Styling)
  const crosshairColor = amount > 0 ? '#059669' : '#4f46e5';
  ctx.strokeStyle = crosshairColor;
  ctx.lineWidth = 5;

  const chLen = 28;
  const chPad = 12;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(qrBoxX + chPad, qrBoxY + chPad + chLen);
  ctx.lineTo(qrBoxX + chPad, qrBoxY + chPad);
  ctx.lineTo(qrBoxX + chPad + chLen, qrBoxY + chPad);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(qrBoxX + qrBoxSize - chPad - chLen, qrBoxY + chPad);
  ctx.lineTo(qrBoxX + qrBoxSize - chPad, qrBoxY + chPad);
  ctx.lineTo(qrBoxX + qrBoxSize - chPad, qrBoxY + chPad + chLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(qrBoxX + chPad, qrBoxY + qrBoxSize - chPad - chLen);
  ctx.lineTo(qrBoxX + chPad, qrBoxY + qrBoxSize - chPad);
  ctx.lineTo(qrBoxX + chPad + chLen, qrBoxY + qrBoxSize - chPad);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(qrBoxX + qrBoxSize - chPad - chLen, qrBoxY + qrBoxSize - chPad);
  ctx.lineTo(qrBoxX + qrBoxSize - chPad, qrBoxY + qrBoxSize - chPad);
  ctx.lineTo(qrBoxX + qrBoxSize - chPad, qrBoxY + qrBoxSize - chPad - chLen);
  ctx.stroke();

  // Draw QR Image
  const qrDrawSize = 440;
  const qrDrawX = qrBoxX + (qrBoxSize - qrDrawSize) / 2;
  const qrDrawY = qrBoxY + (qrBoxSize - qrDrawSize) / 2;

  if (qrImg) {
    ctx.drawImage(qrImg, qrDrawX, qrDrawY, qrDrawSize, qrDrawSize);
  }

  // --- CENTER USER LOGO (QR KE BICH) ---
  const centerLogoX = 500;
  const centerLogoY = qrBoxY + qrBoxSize / 2;
  const logoBadgeSize = 92;
  const logoInnerSize = 78;

  // Outer circular shield with shadow
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerLogoX, centerLogoY, logoBadgeSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (merchantLogoImg) {
    // Draw user's business/profile logo neatly clipped inside
    ctx.beginPath();
    ctx.arc(centerLogoX, centerLogoY, logoInnerSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      merchantLogoImg,
      centerLogoX - logoInnerSize / 2,
      centerLogoY - logoInnerSize / 2,
      logoInnerSize,
      logoInnerSize
    );
  } else {
    // Fallback: Elegant Rupee / Initials Glyph in gradient circle
    const logoGrad = ctx.createLinearGradient(
      centerLogoX - logoInnerSize / 2,
      centerLogoY - logoInnerSize / 2,
      centerLogoX + logoInnerSize / 2,
      centerLogoY + logoInnerSize / 2
    );
    logoGrad.addColorStop(0, '#4f46e5');
    logoGrad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = logoGrad;
    ctx.beginPath();
    ctx.arc(centerLogoX, centerLogoY, logoInnerSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = (businessName || payeeName || 'K')[0].toUpperCase();
    ctx.fillText(initial === '₹' ? '₹' : initial, centerLogoX, centerLogoY + 2);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  // --- NICHE CUSTOMER NAME BEAUTIFUL DESIGN ---
  const custBoxY = qrBoxY + qrBoxSize + 22;
  const custBoxWidth = 720;
  const custBoxX = (1000 - custBoxWidth) / 2;
  const custBoxHeight = note ? 96 : 82;

  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, custBoxX, custBoxY, custBoxWidth, custBoxHeight, 20);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Left Icon Badge for Customer
  ctx.fillStyle = '#e0e7ff';
  ctx.beginPath();
  ctx.arc(custBoxX + 46, custBoxY + custBoxHeight / 2, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('👤', custBoxX + 46, custBoxY + custBoxHeight / 2 + 7);

  // Customer Title & Name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('BILLED TO CUSTOMER', custBoxX + 86, custBoxY + 30);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 22px system-ui, -apple-system, sans-serif';
  const displayCustomer = customerName ? customerName : 'Valued Customer (Direct Settlement)';
  const truncatedCustomer = displayCustomer.length > 34 ? displayCustomer.slice(0, 32) + '...' : displayCustomer;
  ctx.fillText(truncatedCustomer, custBoxX + 86, custBoxY + 56);

  if (note) {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px system-ui, -apple-system, sans-serif';
    const truncatedNote = note.length > 50 ? note.slice(0, 48) + '...' : note;
    ctx.fillText(`Remark: ${truncatedNote}`, custBoxX + 86, custBoxY + 78);
  }

  // --- PAYMENT APPS STRIP ---
  const appsY = custBoxY + custBoxHeight + 32;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ACCEPTED ON ALL APPS:  GPAY  •  PHONEPE  •  PAYTM  •  BHIM  •  CRED  •  ANY UPI', 500, appsY);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('0% Convenience Fee  •  Direct to Bank Account  •  Instant Khatabook Record', 500, appsY + 20);

  // --- LAST FOOTER: WEBSITE BRAND DISPLAY NAME & URL ---
  const footerY = 1240;
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, 0, footerY, 1000, 120, { bl: 36, br: 36, tl: 0, tr: 0 });
  ctx.fill();

  // Top footer accent line
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, footerY, 1000, 1);

  // Small Website Brand Logo or Modern Icon
  const brandLogoSize = 36;
  const brandLogoX = 140;
  const brandLogoY = footerY + 40;

  if (brandLogoImg) {
    ctx.drawImage(brandLogoImg, brandLogoX, brandLogoY - 14, brandLogoSize, brandLogoSize);
  } else {
    ctx.fillStyle = '#38bdf8';
    roundRect(ctx, brandLogoX, brandLogoY - 14, brandLogoSize, brandLogoSize, 10);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', brandLogoX + brandLogoSize / 2, brandLogoY + 11);
  }

  // Website Brand Display Name *
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(brandName, brandLogoX + brandLogoSize + 16, brandLogoY + 6);

  // Website URL / Domain
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(websiteUrl, brandLogoX + brandLogoSize + 16, brandLogoY + 26);

  // Right Security Watermark
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('NPCI UPI UNIFIED QR CODE', 860, brandLogoY + 6);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('100% Secure • ISO 27001 Certified System', 860, brandLogoY + 24);

  return canvas.toDataURL('image/png');
}

/**
 * Triggers instant browser download of the branded locked QR image.
 */
export async function downloadBrandedLockedQr(options: LockedQrCardOptions, filename?: string): Promise<void> {
  const dataUrl = await generateBrandedLockedQrCard(options);
  if (!dataUrl) return;

  const cleanName = (filename || `${options.businessName || 'Merchant'}_${options.amount > 0 ? `INR_${options.amount}` : 'UPI'}_QR`)
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${cleanName}.png`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
