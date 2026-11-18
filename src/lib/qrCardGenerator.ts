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
 * Generates an ultra-compact, perfectly-proportioned digital Amount UPI QR Card.
 * Designed strictly for digital viewing and sharing (not printed A4), with compact heights,
 * 'AMOUNT: ₹X' pill, center profile logo, customer name, and slim footer.
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
  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 500,
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

  // 2. Setup Compact Fixed Canvas (840px width x 910px height) - perfect for mobile & digital share
  const canvasWidth = 840;
  const canvasHeight = 910;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return qrDataUrl;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // --- Background Card ---
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, canvasWidth, canvasHeight, 26);
  ctx.fill();

  // Subtle outer card border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  roundRect(ctx, 1.5, 1.5, canvasWidth - 3, canvasHeight - 3, 26);
  ctx.stroke();

  // --- Top Decorative Accent Stripe ---
  const accentGrad = ctx.createLinearGradient(0, 0, canvasWidth, 0);
  accentGrad.addColorStop(0, '#06b6d4'); // Cyan
  accentGrad.addColorStop(0.5, '#6366f1'); // Indigo
  accentGrad.addColorStop(1, '#ec4899'); // Pink
  ctx.fillStyle = accentGrad;
  roundRect(ctx, 0, 0, canvasWidth, 7, { tl: 26, tr: 26, bl: 0, br: 0 });
  ctx.fill();

  // --- Top Navy/Indigo Header Banner ---
  const headerHeight = 160;
  const headerGrad = ctx.createLinearGradient(0, 7, 0, 7 + headerHeight);
  headerGrad.addColorStop(0, '#0f172a');
  headerGrad.addColorStop(0.5, '#1e1b4b');
  headerGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 7, canvasWidth, headerHeight);

  // Bharat Interface for Money / NPCI pill
  const npciWidth = 310;
  const npciX = (canvasWidth - npciWidth) / 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ctx, npciX, 18, npciWidth, 24, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Green active dot
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(npciX + 16, 30, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BHARAT INTERFACE FOR MONEY • NPCI UPI 2.0', canvasWidth / 2 + 6, 34);

  // Business Name (TOP)
  const displayBusinessName = (businessName || payeeName || 'BUSINESS DESK').toUpperCase();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  const truncatedName = displayBusinessName.length > 34 ? displayBusinessName.slice(0, 32) + '...' : displayBusinessName;
  ctx.fillText(truncatedName, canvasWidth / 2, 74);

  // Payee Name & UPI ID
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  const upiSubtitle = upiId ? `${payeeName || businessName} • ${upiId}` : 'Accepted here • Scan with any UPI app';
  ctx.fillText(upiSubtitle, canvasWidth / 2, 100);

  // Verified Merchant Badge
  const badgeWidth = 280;
  const badgeX = (canvasWidth - badgeWidth) / 2;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  roundRect(ctx, badgeX, 118, badgeWidth, 26, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('✔ Verified Merchant • Direct Bank Settlement', canvasWidth / 2, 135);

  // --- AMOUNT PILL (RENAME: SIRF "AMOUNT: ₹X") ---
  const amountY = 182;
  if (amount > 0) {
    const pillWidth = 420;
    const pillHeight = 44;
    const pillX = (canvasWidth - pillWidth) / 2;
    const amountGrad = ctx.createLinearGradient(pillX, amountY, pillX + pillWidth, amountY);
    amountGrad.addColorStop(0, '#059669');
    amountGrad.addColorStop(1, '#047857');
    ctx.fillStyle = amountGrad;
    roundRect(ctx, pillX, amountY, pillWidth, pillHeight, 22);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    // User explicitly requested: "AMOUNT LOCKED: RENAME SIRF AMOUNT LIKHA HO"
    ctx.fillText(`AMOUNT: ${formatINR(amount)}`, canvasWidth / 2, amountY + 29);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('Scan to pay exact amount • Pre-filled & Locked in UPI apps', canvasWidth / 2, amountY + 60);
  } else {
    const pillWidth = 300;
    const pillHeight = 36;
    const pillX = (canvasWidth - pillWidth) / 2;
    ctx.fillStyle = '#4f46e5';
    roundRect(ctx, pillX, amountY, pillWidth, pillHeight, 18);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 15px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN & PAY ANY AMOUNT', canvasWidth / 2, amountY + 24);
  }

  // --- CENTER QR CODE CONTAINER ---
  const qrBoxY = amount > 0 ? 256 : 236;
  const qrBoxSize = 440;
  const qrBoxX = (canvasWidth - qrBoxSize) / 2;

  // White inner card
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Corner Crosshairs
  const crosshairColor = amount > 0 ? '#059669' : '#4f46e5';
  ctx.strokeStyle = crosshairColor;
  ctx.lineWidth = 4;

  const chLen = 22;
  const chPad = 10;

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
  const qrDrawSize = 380;
  const qrDrawX = qrBoxX + (qrBoxSize - qrDrawSize) / 2;
  const qrDrawY = qrBoxY + (qrBoxSize - qrDrawSize) / 2;

  if (qrImg) {
    ctx.drawImage(qrImg, qrDrawX, qrDrawY, qrDrawSize, qrDrawSize);
  }

  // --- CENTER USER LOGO (QR KE BICH) ---
  const centerLogoX = canvasWidth / 2;
  const centerLogoY = qrBoxY + qrBoxSize / 2;
  const logoBadgeSize = 80;
  const logoInnerSize = 68;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerLogoX, centerLogoY, logoBadgeSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  if (merchantLogoImg) {
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
    ctx.font = '900 32px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = (businessName || payeeName || 'K')[0].toUpperCase();
    ctx.fillText(initial === '₹' ? '₹' : initial, centerLogoX, centerLogoY + 2);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  // --- CUSTOMER NAME SECTION ---
  const custBoxY = qrBoxY + qrBoxSize + 14;
  const custBoxWidth = 640;
  const custBoxX = (canvasWidth - custBoxWidth) / 2;
  const custBoxHeight = note ? 68 : 58;

  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, custBoxX, custBoxY, custBoxWidth, custBoxHeight, 16);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Left Customer Icon
  ctx.fillStyle = '#e0e7ff';
  ctx.beginPath();
  ctx.arc(custBoxX + 36, custBoxY + custBoxHeight / 2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('👤', custBoxX + 36, custBoxY + custBoxHeight / 2 + 5);

  // Customer Title & Name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('BILLED TO CUSTOMER', custBoxX + 68, custBoxY + 22);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 17px system-ui, -apple-system, sans-serif';
  const displayCustomer = customerName ? customerName : 'Valued Customer (Direct Settlement)';
  const truncatedCustomer = displayCustomer.length > 36 ? displayCustomer.slice(0, 34) + '...' : displayCustomer;
  ctx.fillText(truncatedCustomer, custBoxX + 68, custBoxY + 44);

  if (note) {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 11px system-ui, -apple-system, sans-serif';
    const truncatedNote = note.length > 55 ? note.slice(0, 52) + '...' : note;
    ctx.fillText(`Remark: ${truncatedNote}`, custBoxX + 68, custBoxY + 60);
  }

  // --- PAYMENT APPS STRIP ---
  const appsY = custBoxY + custBoxHeight + 20;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ACCEPTED ON ALL APPS:  GPAY  •  PHONEPE  •  PAYTM  •  BHIM  •  CRED  •  ANY UPI', canvasWidth / 2, appsY);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('0% Convenience Fee  •  Direct to Bank Account  •  Instant Khatabook Record', canvasWidth / 2, appsY + 15);

  // --- SLIM COMPACT FOOTER (EKAM SMALL CHHOTA) ---
  const footerHeight = 56;
  const footerY = canvasHeight - footerHeight;
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, 0, footerY, canvasWidth, footerHeight, { bl: 26, br: 26, tl: 0, tr: 0 });
  ctx.fill();

  // Divider line
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, footerY, canvasWidth, 1);

  // Small Website Brand Logo or Modern Icon
  const brandLogoSize = 26;
  const brandLogoX = 40;
  const brandLogoY = footerY + (footerHeight - brandLogoSize) / 2;

  if (brandLogoImg) {
    ctx.drawImage(brandLogoImg, brandLogoX, brandLogoY, brandLogoSize, brandLogoSize);
  } else {
    ctx.fillStyle = '#38bdf8';
    roundRect(ctx, brandLogoX, brandLogoY, brandLogoSize, brandLogoSize, 6);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', brandLogoX + brandLogoSize / 2, brandLogoY + 18);
  }

  // Website Brand Display Name *
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(brandName, brandLogoX + brandLogoSize + 12, footerY + 24);

  // Website URL / Domain
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText(websiteUrl, brandLogoX + brandLogoSize + 12, footerY + 41);

  // Right Security Tag
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('NPCI UPI UNIFIED QR CODE', canvasWidth - 40, footerY + 24);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 9px system-ui, -apple-system, sans-serif';
  ctx.fillText('100% Secure • ISO 27001 Certified System', canvasWidth - 40, footerY + 40);

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
