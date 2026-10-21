// SmartKhata Pro - Business & Visiting Card Templates

export interface BusinessCardMeta {
  id: string;
  name: string;
  theme: string;
  bgGradient: string;
  textColor: string;
  accentColor: string;
  description: string;
}

export const BUSINESS_CARD_TEMPLATES: BusinessCardMeta[] = [
  {
    id: 'card_royal_indigo',
    name: 'Royal Indigo Modern',
    theme: 'indigo',
    bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    textColor: '#ffffff',
    accentColor: '#818cf8',
    description: 'Corporate executive indigo with fine metallic accents and modern typography.',
  },
  {
    id: 'card_matte_gold',
    name: 'Matte Charcoal & Gold',
    theme: 'gold',
    bgGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 60%, #1c1917 100%)',
    textColor: '#fef3c7',
    accentColor: '#f59e0b',
    description: 'Ultra-luxurious matte black finish with brushed champagne gold lettering.',
  },
  {
    id: 'card_fintech_neon',
    name: 'Fintech Cyber Neon',
    theme: 'neon',
    bgGradient: 'linear-gradient(135deg, #090d16 0%, #0f172a 60%, #064e3b 100%)',
    textColor: '#ffffff',
    accentColor: '#10b981',
    description: 'High-tech dark background with glowing neon emerald tech accents.',
  },
  {
    id: 'card_minimalist_white',
    name: 'Swiss Minimalist White',
    theme: 'white',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    textColor: '#0f172a',
    accentColor: '#2563eb',
    description: 'Clean architectural white card with razor-sharp black typography and blue badge.',
  },
  {
    id: 'card_emerald_luxury',
    name: 'Emerald Royale',
    theme: 'emerald',
    bgGradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
    textColor: '#ffffff',
    accentColor: '#a7f3d0',
    description: 'Prestigious deep emerald green tailored for high-trust merchants and jewellers.',
  },
  {
    id: 'card_sunset_coral',
    name: 'Sunset Amber Gradient',
    theme: 'sunset',
    bgGradient: 'linear-gradient(135deg, #831843 0%, #be123c 50%, #f97316 100%)',
    textColor: '#ffffff',
    accentColor: '#fde047',
    description: 'Vibrant and inviting coral-to-amber mesh gradient for creative retail businesses.',
  },
];

export interface BusinessCardData {
  businessName: string;
  tagline: string;
  ownerName: string;
  roleTitle: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  upiId?: string;
  qrUrl?: string;
}

export function generateBusinessCardPrintHtml(
  templateId: string,
  data: BusinessCardData,
  mode: 'single' | 'sheet' = 'single'
): string {
  const t = BUSINESS_CARD_TEMPLATES.find((x) => x.id === templateId) || BUSINESS_CARD_TEMPLATES[0];

  const cardHtml = (side: 'front' | 'back') => {
    const isDark = t.theme !== 'white';
    const textColor = isDark ? '#ffffff' : '#0f172a';
    const subColor = isDark ? 'rgba(255,255,255,0.78)' : '#475569';
    const borderStyle = isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0';

    if (side === 'front') {
      return `
      <div class="biz-card" style="background: ${t.bgGradient}; color: ${textColor}; border: 1px solid ${borderStyle};">
        <div class="card-inner">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="b-name">${data.businessName || 'SmartKhata Merchant'}</div>
              <div class="b-tagline" style="color: ${t.accentColor};">${data.tagline || 'Commercial Merchant & Trader'}</div>
            </div>
            <div class="b-badge" style="background: ${t.accentColor}; color: ${isDark ? '#000000' : '#ffffff'};">
              VERIFIED
            </div>
          </div>

          <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid ${borderStyle};">
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
              <div>
                <div class="b-owner">${data.ownerName || 'Store Proprietor'}</div>
                <div class="b-role" style="color: ${subColor};">${data.roleTitle || 'Founder & Proprietor'}</div>
              </div>
              <div class="b-contacts" style="color: ${subColor}; text-align: right;">
                <div>📞 <strong>${data.phone || '+91 98000 00000'}</strong></div>
                ${data.email ? `<div>✉️ ${data.email}</div>` : ''}
                ${data.address ? `<div>📍 ${data.address}</div>` : ''}
                ${data.gstin ? `<div>🏛️ GSTIN: <span style="font-family: monospace;">${data.gstin}</span></div>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
      `;
    } else {
      // Back side: QR & Payment Focus
      return `
      <div class="biz-card" style="background: ${t.bgGradient}; color: ${textColor}; border: 1px solid ${borderStyle};">
        <div class="card-inner" style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;">
          <div>
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: ${t.accentColor}; text-transform: uppercase;">
              SCAN TO PAY VIA UPI
            </div>
            <div style="font-size: 13px; font-weight: 900; margin-top: 2px;">
              ${data.businessName || 'Instant Digital Pay'}
            </div>
          </div>

          <div style="background: #ffffff; padding: 6px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
            ${data.qrUrl ? `
              <img src="${data.qrUrl}" alt="QR" style="width: 76px; height: 76px; display: block;" />
            ` : `
              <div style="width: 76px; height: 76px; background: #f1f5f9; display: flex; items-center; justify-content: center; font-size: 10px; color: #64748b; font-weight: bold;">
                UPI QR
              </div>
            `}
          </div>

          <div>
            <div style="font-size: 10.5px; font-family: monospace; font-weight: 800; color: ${t.accentColor};">
              UPI ID: ${data.upiId || 'merchant@upi'}
            </div>
            <div style="font-size: 8.5px; color: ${subColor}; margin-top: 2px;">
              Google Pay • PhonePe • Paytm • BHIM
            </div>
          </div>
        </div>
      </div>
      `;
    }
  };

  if (mode === 'single') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Visiting_Card_${data.businessName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    @page {
      size: 3.5in 2in;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .card-page {
      width: 3.5in;
      height: 2in;
      padding: 3mm;
      page-break-after: always;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .biz-card {
      width: 100%;
      height: 100%;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }
    .card-inner {
      width: 100%;
      height: 100%;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .b-name {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }
    .b-tagline {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .b-badge {
      font-size: 7.5px;
      font-weight: 900;
      letter-spacing: 0.08em;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .b-owner {
      font-size: 10.5px;
      font-weight: 800;
    }
    .b-role {
      font-size: 8px;
      margin-top: 1px;
    }
    .b-contacts {
      font-size: 8px;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <!-- Front Side -->
  <div class="card-page">
    ${cardHtml('front')}
  </div>

  <!-- Back Side -->
  <div class="card-page">
    ${cardHtml('back')}
  </div>
</body>
</html>`;
  } else {
    // Sheet Mode: 8 Cards on an A4 Page with Crop Marks
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Visiting_Cards_Sheet_${data.businessName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .sheet-grid {
      display: grid;
      grid-template-columns: repeat(2, 3.5in);
      grid-template-rows: repeat(4, 2in);
      gap: 5mm;
      justify-content: center;
      align-content: center;
      margin: 0 auto;
    }
    .biz-card {
      width: 3.5in;
      height: 2in;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .card-inner {
      width: 100%;
      height: 100%;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .b-name {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }
    .b-tagline {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .b-badge {
      font-size: 7.5px;
      font-weight: 900;
      letter-spacing: 0.08em;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .b-owner {
      font-size: 10.5px;
      font-weight: 800;
    }
    .b-role {
      font-size: 8px;
      margin-top: 1px;
    }
    .b-contacts {
      font-size: 8px;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <div style="text-align: center; font-size: 10px; color: #64748b; margin-bottom: 6px;">
    SmartKhata Pro • Printable Business Card Sheet (8 Cards per A4 Page) • Cut along card borders
  </div>
  <div class="sheet-grid">
    ${Array.from({ length: 8 }).map(() => cardHtml('front')).join('')}
  </div>
</body>
</html>`;
  }
}
