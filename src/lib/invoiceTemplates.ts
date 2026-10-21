// SmartKhata Pro - 10 Modern & Stylish Invoice Templates

export interface InvoiceTemplateMeta {
  id: string;
  name: string;
  tagline: string;
  category: string;
  accentColor: string;
  description: string;
  badge: string;
}

export const INVOICE_TEMPLATES: InvoiceTemplateMeta[] = [
  {
    id: 'template_minimal',
    name: 'Modern Minimalist',
    tagline: 'Clean, borderless typography with subtle indigo accents',
    category: 'Modern',
    accentColor: '#4f46e5',
    description: 'Perfect for modern businesses, consultants, and agencies seeking high elegance with minimal ink usage.',
    badge: 'Popular',
  },
  {
    id: 'template_corporate',
    name: 'Corporate Classic',
    tagline: 'Formal double-border B2B structured layout',
    category: 'Corporate',
    accentColor: '#1e3a8a',
    description: 'Traditional enterprise and wholesale layout with structured billing boxes and formal signatory columns.',
    badge: 'B2B Standard',
  },
  {
    id: 'template_fintech',
    name: 'Fintech Cyber Tech',
    tagline: 'Dark tech accents with neon emerald highlights',
    category: 'High-Tech',
    accentColor: '#059669',
    description: 'Ultra-modern tech invoice with monospace data badges, cyber security verification tag, and sleek aesthetics.',
    badge: 'Trending',
  },
  {
    id: 'template_emerald',
    name: 'Emerald Royal Wealth',
    tagline: 'Deep forest emerald green with luxury gold touches',
    category: 'Luxury',
    accentColor: '#065f46',
    description: 'Aristocratic financial aesthetic with serif headlines, regal balance cards, and premium border trims.',
    badge: 'Executive',
  },
  {
    id: 'template_pos_receipt',
    name: 'Compact Thermal POS',
    tagline: 'Retail slip format with barcode and dashed receipt lines',
    category: 'Retail POS',
    accentColor: '#0f172a',
    description: 'Designed for fast retail billing, supermarket checkouts, and 80mm or compact A4 single-column slips.',
    badge: 'Retail Fast',
  },
  {
    id: 'template_startup_gradient',
    name: 'Vibrant Startup Ribbon',
    tagline: 'Modern violet-to-cyan mesh gradient header',
    category: 'Creative',
    accentColor: '#7c3aed',
    description: 'Youthful and energetic styling with rounded cards, pill badges, and distinctive gradient branding.',
    badge: 'Creative',
  },
  {
    id: 'template_gold_luxury',
    name: 'Gold Luxury Boutique',
    tagline: 'Warm charcoal with champagne gold foil styling',
    category: 'Luxury',
    accentColor: '#d97706',
    description: 'Tailored for jewelry, fashion boutiques, premium hospitality, and luxury service providers.',
    badge: 'Premium',
  },
  {
    id: 'template_gst_compliant',
    name: 'Official GST Tax Pro',
    tagline: 'Government compliant GST invoice with tax breakdown',
    category: 'Compliance',
    accentColor: '#2563eb',
    description: 'Comprehensive Indian GST format with HSN code, CGST/SGST/IGST breakdown, state codes, and legal declaration.',
    badge: 'GST Ready',
  },
  {
    id: 'template_swiss_monochrome',
    name: 'Swiss Monochrome Grid',
    tagline: 'Timeless Swiss international typographic style',
    category: 'Minimalist',
    accentColor: '#000000',
    description: 'Strict architectural grid, razor-sharp black dividers, bold numbers, and zero visual distractions.',
    badge: 'Timeless',
  },
  {
    id: 'template_ribbon_accent',
    name: 'Scan & Pay QR Accent',
    tagline: 'Prominent UPI QR spotlight for instant payment recovery',
    category: 'Payments',
    accentColor: '#0284c7',
    description: 'Engineered specifically for credit collection with an eye-catching instant scan-and-pay UPI ribbon.',
    badge: 'High Recovery',
  },
];

export interface InvoiceRenderData {
  merchant: {
    name: string;
    businessName: string;
    address?: string;
    phone?: string;
    email?: string;
    gst?: string;
    logo?: string;
  };
  customer: {
    name: string;
    phone?: string;
    address?: string;
    businessName?: string;
    gst?: string;
  };
  txn: {
    id: string;
    docNo?: string;
    title?: string;
    date: string | Date;
    time?: string;
    amount: number;
    amountWords?: string;
    note?: string;
    isGot?: boolean;
    type?: string;
    status?: string;
    currencySymbol?: string;
  };
  payment?: {
    upiId?: string;
    payeeName?: string;
    qrUrl?: string;
    bankName?: string;
    accountNo?: string;
    ifsc?: string;
  };
}

export function generateInvoiceHtml(templateId: string, data: InvoiceRenderData): string {
  const tId = templateId || 'template_minimal';
  const isGot = !!data.txn.isGot || data.txn.type === 'debit' || data.txn.type === 'collection';
  const docNo = data.txn.docNo || (isGot ? `REC-${data.txn.id.slice(-6).toUpperCase()}` : `INV-${data.txn.id.slice(-6).toUpperCase()}`);
  const billTitle = data.txn.title || (isGot ? 'OFFICIAL PAYMENT RECEIPT' : 'CREDIT SALES INVOICE & BILL');
  const currencySymbol = data.txn.currencySymbol || '₹';
  const amountFormatted = `${currencySymbol} ${data.txn.amount.toLocaleString('en-IN')}`;
  
  const d = new Date(data.txn.date);
  const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeFormatted = data.txn.time || d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const mBizName = data.merchant.businessName || data.merchant.name || 'SmartKhata Merchant';
  const mOwnerName = data.merchant.name || 'Store Owner';
  const mPhone = data.merchant.phone || '';
  const mEmail = data.merchant.email || '';
  const mAddress = data.merchant.address || '';
  const mGst = data.merchant.gst || '';

  const cName = data.customer.name || 'Valued Customer';
  const cPhone = data.customer.phone || '';
  const cAddress = data.customer.address || '';
  const cBiz = data.customer.businessName || '';

  const qrUrl = data.payment?.qrUrl || '';
  const upiId = data.payment?.upiId || '';

  const commonPrintCss = `
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0; padding: 0; background: #ffffff !important; color: #0f172a !important; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; line-height: 1.45; }
    .page-wrap { max-width: 780px; margin: 0 auto; padding: 20px; }
  `;

  switch (tId) {
    // -------------------------------------------------------------------------------------------------
    // 1. MODERN MINIMALIST (Indigo Clean)
    // -------------------------------------------------------------------------------------------------
    case 'template_minimal':
    default:
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNo}_${cName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    ${commonPrintCss}
    .min-card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .min-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 22px; border-bottom: 1.5px solid #f1f5f9; }
    .min-biz { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; }
    .min-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; background: ${isGot ? '#ecfdf5' : '#eef2ff'}; color: ${isGot ? '#047857' : '#4f46e5'}; }
    .min-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; }
    .min-party-box { padding: 14px 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #f1f5f9; }
    .min-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.06em; margin-bottom: 6px; }
    .min-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .min-table th { background: #f8fafc; color: #475569; font-weight: 800; font-size: 11px; text-transform: uppercase; padding: 10px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .min-table td { padding: 14px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; }
    .min-total-card { margin-top: 20px; padding: 18px 22px; border-radius: 14px; background: ${isGot ? '#f0fdf4' : '#faf5ff'}; border: 1.5px solid ${isGot ? '#bbf7d0' : '#e9d5ff'}; display: flex; justify-content: space-between; align-items: center; }
    .min-footer { margin-top: 30px; padding-top: 18px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="page-wrap">
    <div class="min-card">
      <div class="min-header">
        <div>
          <div class="min-biz">${mBizName}</div>
          <div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">${mAddress || 'Official Verified Merchant'}</div>
          <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
            Phone: <strong style="color: #334155;">${mPhone || 'N/A'}</strong>
            ${mGst ? ` • GSTIN: <strong style="color: #4f46e5; font-family: monospace;">${mGst}</strong>` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <span class="min-badge">${billTitle}</span>
          <div style="font-family: monospace; font-weight: 800; font-size: 14px; color: #0f172a; margin-top: 8px;">${docNo}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Date: <strong style="color: #334155;">${dateFormatted}</strong></div>
          <div style="font-size: 10.5px; color: #94a3b8; margin-top: 1px;">Time: ${timeFormatted}</div>
        </div>
      </div>

      <div class="min-parties">
        <div class="min-party-box">
          <div class="min-label">Billed By (Merchant)</div>
          <div style="font-weight: 800; font-size: 14px; color: #0f172a;">${mBizName}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 3px;">Owner: ${mOwnerName}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 1px;">Phone: ${mPhone}</div>
          ${mEmail ? `<div style="font-size: 11px; color: #64748b; margin-top: 1px;">Email: ${mEmail}</div>` : ''}
        </div>
        <div class="min-party-box">
          <div class="min-label">Billed To (Customer)</div>
          <div style="font-weight: 800; font-size: 14px; color: #0f172a;">${cName}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 3px;">Phone: <strong>${cPhone || 'N/A'}</strong></div>
          ${cBiz ? `<div style="font-size: 11px; color: #4f46e5; font-weight: 600; margin-top: 1px;">Business: ${cBiz}</div>` : ''}
          ${cAddress ? `<div style="font-size: 11px; color: #64748b; margin-top: 1px;">Address: ${cAddress}</div>` : ''}
        </div>
      </div>

      <table class="min-table">
        <thead>
          <tr>
            <th style="width: 8%; text-align: center;">#</th>
            <th style="width: 54%;">Particulars / Item Description</th>
            <th style="width: 18%; text-align: center;">Entry Mode</th>
            <th style="width: 20%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; color: #94a3b8; font-weight: bold;">1</td>
            <td>
              <div style="font-weight: 800; font-size: 13.5px; color: #0f172a;">${data.txn.note || (isGot ? 'Payment Received' : 'Goods / Service Supplied')}</div>
              <div style="font-size: 10.5px; color: #64748b; margin-top: 3px;">Trans ID: ${data.txn.id} • Status: ${data.txn.status || 'Settled'}</div>
            </td>
            <td style="text-align: center; font-weight: bold; color: ${isGot ? '#047857' : '#be123c'};">
              ${isGot ? '↓ Debit (You Got)' : '↑ Credit (You Gave)'}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 15px; font-weight: 900; color: ${isGot ? '#047857' : '#be123c'};">
              ${amountFormatted}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="min-total-card">
        <div>
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Total Net Amount</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 3px;">${data.txn.amountWords || ''}</div>
        </div>
        <div style="font-size: 24px; font-weight: 900; color: ${isGot ? '#047857' : '#4f46e5'}; font-family: monospace;">
          ${amountFormatted}
        </div>
      </div>

      ${qrUrl ? `
      <div style="margin-top: 20px; padding: 14px 18px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a;">Instant Scan & Pay via UPI</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Scan using PhonePe, Google Pay, Paytm, or BHIM</div>
          <div style="font-size: 11px; font-family: monospace; font-weight: bold; color: #4f46e5; margin-top: 4px;">UPI ID: ${upiId}</div>
        </div>
        <img src="${qrUrl}" alt="UPI QR" style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; padding: 4px;" />
      </div>
      ` : ''}

      <div class="min-footer">
        <div>
          <div style="font-weight: 700; color: #0f172a;">SmartKhata Pro • Cloud Verified Record</div>
          <div style="margin-top: 2px;">This is a computer generated invoice and does not require physical signature.</div>
        </div>
        <div style="text-align: right;">
          <div style="width: 140px; border-bottom: 1.5px solid #cbd5e1; margin-bottom: 6px;"></div>
          <div style="font-weight: 700; color: #334155;">Authorized Signatory</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // -------------------------------------------------------------------------------------------------
    // 2. CORPORATE CLASSIC (Slate Blue Double-Border Formal)
    // -------------------------------------------------------------------------------------------------
    case 'template_corporate':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNo}_${cName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    ${commonPrintCss}
    .corp-card { border: 2.5px solid #1e3a8a; padding: 24px; background: #fff; }
    .corp-header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 16px; }
    .corp-title { font-size: 26px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.05em; text-transform: uppercase; }
    .corp-meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #cbd5e1; margin-bottom: 16px; }
    .corp-meta-cell { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
    .corp-meta-cell:nth-child(odd) { border-right: 1px solid #e2e8f0; }
    .corp-table { width: 100%; border-collapse: collapse; margin-top: 14px; border: 1.5px solid #1e3a8a; }
    .corp-table th { background: #1e3a8a; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase; padding: 8px 12px; border: 1px solid #1e3a8a; }
    .corp-table td { padding: 12px; border: 1px solid #cbd5e1; font-size: 12px; }
    .corp-total-row { background: #f8fafc; font-weight: 800; }
    .corp-sign-grid { display: grid; grid-template-columns: 1fr 1fr; margin-top: 40px; gap: 24px; }
  </style>
</head>
<body>
  <div class="page-wrap">
    <div class="corp-card">
      <div class="corp-header">
        <div class="corp-title">${mBizName}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">${mAddress || 'Registered Commercial Entity'}</div>
        <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">
          Telephone: <strong>${mPhone}</strong> • Email: ${mEmail || 'N/A'} ${mGst ? ` • GSTIN: <strong>${mGst}</strong>` : ''}
        </div>
        <div style="display: inline-block; margin-top: 12px; padding: 4px 18px; background: #1e3a8a; color: #fff; font-weight: 800; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">
          ${billTitle}
        </div>
      </div>

      <div class="corp-meta-grid">
        <div class="corp-meta-cell">
          <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Invoice / Receipt No:</span><br/>
          <strong style="font-size: 13px; color: #1e3a8a; font-family: monospace;">${docNo}</strong>
        </div>
        <div class="corp-meta-cell">
          <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Date of Issue:</span><br/>
          <strong style="font-size: 13px; color: #0f172a;">${dateFormatted} (${timeFormatted})</strong>
        </div>
        <div class="corp-meta-cell">
          <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Customer Name & Details:</span><br/>
          <strong style="font-size: 13px; color: #0f172a;">${cName}</strong>
          ${cBiz ? `<div style="font-size: 11px; color: #475569;">Firm: ${cBiz}</div>` : ''}
          <div style="font-size: 11px; color: #475569;">Contact: ${cPhone || 'N/A'}</div>
        </div>
        <div class="corp-meta-cell">
          <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Customer Billing Address:</span><br/>
          <span style="font-size: 12px; color: #334155;">${cAddress || 'Not Provided / Over Counter Sale'}</span>
        </div>
      </div>

      <table class="corp-table">
        <thead>
          <tr>
            <th style="width: 8%; text-align: center;">Item</th>
            <th style="width: 52%; text-align: left;">Description of Goods / Services</th>
            <th style="width: 20%; text-align: center;">Classification</th>
            <th style="width: 20%; text-align: right;">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; font-weight: bold;">01</td>
            <td>
              <div style="font-weight: 800; color: #0f172a; font-size: 13px;">${data.txn.note || (isGot ? 'Customer Payment Received' : 'Credit Supply of Material')}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Voucher Ref: ${data.txn.id}</div>
            </td>
            <td style="text-align: center; font-weight: bold; color: ${isGot ? '#166534' : '#991b1b'};">
              ${isGot ? 'PAYMENT CREDIT' : 'DEBIT OUTSTANDING'}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 14px; font-weight: 900;">
              ${amountFormatted}
            </td>
          </tr>
          <tr class="corp-total-row">
            <td colspan="3" style="text-align: right; padding: 12px; font-size: 12px; text-transform: uppercase;">
              Net Payable / Settled Total:
            </td>
            <td style="text-align: right; padding: 12px; font-size: 16px; font-family: monospace; color: #1e3a8a;">
              ${amountFormatted}
            </td>
          </tr>
        </tbody>
      </table>

      ${data.txn.amountWords ? `
      <div style="margin-top: 12px; font-size: 11.5px; color: #475569; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
        <strong>Amount in Words:</strong> ${data.txn.amountWords}
      </div>
      ` : ''}

      <div class="corp-sign-grid">
        <div style="border: 1px solid #e2e8f0; padding: 12px; font-size: 11px;">
          <strong>Terms & Conditions:</strong>
          <ol style="margin: 4px 0 0 16px; padding: 0; color: #64748b; line-height: 1.5;">
            <li>Payment is due according to mutually agreed credit terms.</li>
            <li>Subject to local jurisdiction for any dispute settlement.</li>
            <li>Interest @ 18% p.a. applicable on overdue invoices.</li>
          </ol>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; padding-right: 16px;">
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 50px;">For ${mBizName}</div>
          <div style="width: 160px; border-bottom: 1.5px solid #0f172a; margin-bottom: 4px;"></div>
          <div style="font-size: 11px; font-weight: 700; color: #64748b;">Authorised Signatory</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // -------------------------------------------------------------------------------------------------
    // 3. FINTECH CYBER TECH (Dark Header & Neon Accents)
    // -------------------------------------------------------------------------------------------------
    case 'template_fintech':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNo}_${cName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    ${commonPrintCss}
    .ft-card { border-radius: 16px; overflow: hidden; border: 1.5px solid #0f172a; background: #fff; }
    .ft-header { background: #0f172a; color: #fff; padding: 24px 28px; display: flex; justify-content: space-between; align-items: center; }
    .ft-badge { background: #059669; color: #fff; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }
    .ft-body { padding: 24px 28px; }
    .ft-data-pill { background: #f1f5f9; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 11px; }
    .ft-table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    .ft-table th { background: #1e293b; color: #94a3b8; font-family: monospace; font-size: 10.5px; text-transform: uppercase; padding: 10px 14px; text-align: left; }
    .ft-table td { padding: 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .ft-total-box { margin-top: 20px; background: #0f172a; color: #fff; border-radius: 12px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="page-wrap">
    <div class="ft-card">
      <div class="ft-header">
        <div>
          <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.02em; color: #f8fafc;">${mBizName}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">SECURE DIGITAL FINTECH INVOICE • SMARTKHATA ENGINE</div>
        </div>
        <div style="text-align: right;">
          <span class="ft-badge">${billTitle}</span>
          <div style="font-family: monospace; font-size: 14px; font-weight: 800; color: #38bdf8; margin-top: 6px;">${docNo}</div>
        </div>
      </div>

      <div class="ft-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 10px;">
            <div style="font-size: 9.5px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.08em;">// MERCHANT PROFILE</div>
            <div style="font-weight: 800; font-size: 13.5px; color: #0f172a; margin-top: 4px;">${mBizName}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Phone: ${mPhone} • ${mEmail}</div>
            ${mGst ? `<div style="font-size: 11px; font-family: monospace; color: #059669; font-weight: bold;">GSTIN: ${mGst}</div>` : ''}
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 10px;">
            <div style="font-size: 9.5px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.08em;">// COUNTERPARTY CLIENT</div>
            <div style="font-weight: 800; font-size: 13.5px; color: #0f172a; margin-top: 4px;">${cName}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Phone: ${cPhone || 'N/A'}</div>
            ${cBiz ? `<div style="font-size: 11px; color: #0284c7; font-weight: 600;">Entity: ${cBiz}</div>` : ''}
          </div>
        </div>

        <table class="ft-table">
          <thead>
            <tr>
              <th style="width: 10%;">TXN ID</th>
              <th style="width: 50%;">PAYLOAD DESCRIPTION</th>
              <th style="width: 20%; text-align: center;">LEDGER ACTION</th>
              <th style="width: 20%; text-align: right;">SUM</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-family: monospace; font-size: 11px; color: #64748b;">${data.txn.id.slice(-6)}</td>
              <td>
                <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${data.txn.note || 'Digital Khata Entry'}</div>
                <div style="font-size: 10.5px; color: #64748b; font-family: monospace; margin-top: 2px;">Timestamp: ${dateFormatted} ${timeFormatted}</div>
              </td>
              <td style="text-align: center; font-weight: bold; color: ${isGot ? '#059669' : '#e11d48'}; font-family: monospace; font-size: 11px;">
                [${isGot ? 'CREDIT_INFLOW' : 'DEBIT_OUTFLOW'}]
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 15px; font-weight: 900; color: #0f172a;">
                ${amountFormatted}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="ft-total-box">
          <div>
            <div style="font-size: 10px; font-family: monospace; color: #34d399; letter-spacing: 0.1em; text-transform: uppercase;">VERIFIED TOTAL BALANCE</div>
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">${data.txn.amountWords || 'Confirmed'}</div>
          </div>
          <div style="font-size: 26px; font-weight: 900; font-family: monospace; color: #38bdf8;">
            ${amountFormatted}
          </div>
        </div>

        ${qrUrl ? `
        <div style="margin-top: 18px; padding: 14px; border-radius: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: #059669; color: #fff; font-size: 9px; font-weight: bold;">UPI DIRECT LINK</span>
            <div style="font-size: 11.5px; font-weight: bold; color: #0f172a; margin-top: 4px;">VPA ID: ${upiId}</div>
            <div style="font-size: 10px; color: #64748b;">Zero MDR • Instant Settlement via UPI QR</div>
          </div>
          <img src="${qrUrl}" alt="QR" style="width: 70px; height: 70px; border-radius: 6px; border: 1px solid #cbd5e1;" />
        </div>
        ` : ''}

        <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10.5px; color: #94a3b8; font-family: monospace;">
          <span>HASH: sha256_${data.txn.id.slice(0, 16)}</span>
          <span>SMARTKHATA SECURED ENGINE</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // -------------------------------------------------------------------------------------------------
    // 4. EMERALD ROYAL WEALTH (Deep Forest & Gold luxury)
    // -------------------------------------------------------------------------------------------------
    case 'template_emerald':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNo}_${cName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    ${commonPrintCss}
    .em-card { border: 2px solid #064e3b; border-radius: 12px; padding: 26px; background: #fff; }
    .em-header { border-bottom: 2px solid #064e3b; padding-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
    .em-biz { font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #064e3b; }
    .em-badge { background: #064e3b; color: #fef08a; padding: 5px 14px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 4px; }
    .em-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .em-table th { background: #064e3b; color: #fff; font-size: 11px; text-transform: uppercase; padding: 9px 12px; text-align: left; }
    .em-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .em-total-card { margin-top: 20px; background: #ecfdf5; border: 1.5px solid #064e3b; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="page-wrap">
    <div class="em-card">
      <div class="em-header">
        <div>
          <div class="em-biz">${mBizName}</div>
          <div style="font-size: 12px; color: #475569; margin-top: 3px;">${mAddress || 'Premier Commercial Establishment'}</div>
          <div style="font-size: 11.5px; color: #64748b; margin-top: 1px;">Phone: ${mPhone} ${mGst ? ` • GSTIN: ${mGst}` : ''}</div>
        </div>
        <div style="text-align: right;">
          <span class="em-badge">${billTitle}</span>
          <div style="font-size: 13px; font-weight: bold; color: #064e3b; margin-top: 6px; font-family: monospace;">${docNo}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Date: ${dateFormatted}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
        <div style="border-left: 3px solid #064e3b; padding-left: 12px;">
          <div style="font-size: 10px; font-weight: bold; color: #064e3b; text-transform: uppercase;">Issued By:</div>
          <div style="font-weight: 800; font-size: 14px; color: #0f172a;">${mBizName}</div>
          <div style="font-size: 11px; color: #64748b;">Proprietor: ${mOwnerName}</div>
        </div>
        <div style="border-left: 3px solid #047857; padding-left: 12px;">
          <div style="font-size: 10px; font-weight: bold; color: #047857; text-transform: uppercase;">Issued To:</div>
          <div style="font-weight: 800; font-size: 14px; color: #0f172a;">${cName}</div>
          <div style="font-size: 11px; color: #64748b;">Phone: ${cPhone || 'N/A'} • ${cAddress || 'Over Counter'}</div>
        </div>
      </div>

      <table class="em-table">
        <thead>
          <tr>
            <th style="width: 8%; text-align: center;">Item</th>
            <th style="width: 52%;">Description</th>
            <th style="width: 20%; text-align: center;">Type</th>
            <th style="width: 20%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; color: #64748b; font-weight: bold;">1</td>
            <td>
              <div style="font-weight: bold; font-size: 13px; color: #064e3b;">${data.txn.note || 'Commercial Transaction'}</div>
              <div style="font-size: 11px; color: #64748b;">Ref: ${data.txn.id}</div>
            </td>
            <td style="text-align: center; font-weight: bold; color: ${isGot ? '#065f46' : '#991b1b'};">
              ${isGot ? 'Debit Received' : 'Credit Given'}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 15px; font-weight: 900; color: #064e3b;">
              ${amountFormatted}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="em-total-card">
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #064e3b; text-transform: uppercase;">Final Settled Balance</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">${data.txn.amountWords || ''}</div>
        </div>
        <div style="font-size: 24px; font-weight: 900; color: #064e3b; font-family: monospace;">
          ${amountFormatted}
        </div>
      </div>

      <div style="margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b;">
        <div>Certified Official Financial Documentation</div>
        <div style="text-align: right;">
          <div style="width: 140px; border-bottom: 1.5px solid #064e3b; margin-bottom: 4px;"></div>
          <div style="font-weight: bold; color: #064e3b;">Authorized Representative</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // -------------------------------------------------------------------------------------------------
    // 5. COMPACT THERMAL POS (80mm Retail Slip Style)
    // -------------------------------------------------------------------------------------------------
    case 'template_pos_receipt':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNo}_${cName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    @page { size: 80mm 297mm; margin: 3mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0; padding: 0; background: #fff !important; color: #000 !important; font-family: "Courier New", Courier, monospace; font-size: 11px; line-height: 1.35; }
    .pos-wrap { max-width: 300px; margin: 0 auto; padding: 10px; border: 1px dashed #000; }
    .pos-center { text-align: center; }
    .pos-divider { border-top: 1px dashed #000; margin: 8px 0; }
    .pos-double-divider { border-top: 2px solid #000; margin: 8px 0; }
    .pos-row { display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="pos-wrap">
    <div class="pos-center">
      <div style="font-size: 16px; font-weight: 900; text-transform: uppercase;">${mBizName}</div>
      <div style="font-size: 10px; margin-top: 2px;">${mAddress || 'Retail Store'}</div>
      <div style="font-size: 10px;">TEL: ${mPhone}</div>
      ${mGst ? `<div style="font-size: 10px;">GSTIN: ${mGst}</div>` : ''}
    </div>

    <div class="pos-divider"></div>

    <div class="pos-center">
      <strong>*** ${billTitle} ***</strong>
    </div>

    <div class="pos-row" style="margin-top: 6px;">
      <span>DOC NO:</span>
      <strong>${docNo}</strong>
    </div>
    <div class="pos-row">
      <span>DATE:</span>
      <span>${dateFormatted}</span>
    </div>
    <div class="pos-row">
      <span>TIME:</span>
      <span>${timeFormatted}</span>
    </div>
    <div class="pos-row">
      <span>CUST:</span>
      <strong>${cName}</strong>
    </div>
    ${cPhone ? `<div class="pos-row"><span>PHONE:</span><span>${cPhone}</span></div>` : ''}

    <div class="pos-divider"></div>

    <div class="pos-row" style="font-weight: bold;">
      <span>ITEM / NOTE</span>
      <span>AMT</span>
    </div>

    <div class="pos-divider"></div>

    <div style="margin: 6px 0;">
      <div style="font-weight: bold;">${data.txn.note || (isGot ? 'PAYMENT RECEIVED' : 'CREDIT PURCHASE')}</div>
      <div class="pos-row" style="font-size: 10px; color: #444; margin-top: 2px;">
        <span>TYPE: ${isGot ? 'YOU GOT' : 'YOU GAVE'}</span>
        <strong>${amountFormatted}</strong>
      </div>
    </div>

    <div class="pos-double-divider"></div>

    <div class="pos-row" style="font-size: 14px; font-weight: 900;">
      <span>TOTAL:</span>
      <span>${amountFormatted}</span>
    </div>

    <div class="pos-divider"></div>

    ${qrUrl ? `
    <div class="pos-center" style="margin: 10px 0;">
      <img src="${qrUrl}" alt="QR" style="width: 90px; height: 90px; margin: 0 auto; display: block;" />
      <div style="font-size: 9px; margin-top: 4px;">SCAN & PAY VIA UPI</div>
      <div style="font-size: 9px; font-weight: bold;">${upiId}</div>
    </div>
    <div class="pos-divider"></div>
    ` : ''}

    <div class="pos-center" style="font-size: 10px; margin-top: 8px;">
      <div>THANK YOU! VISIT AGAIN</div>
      <div style="font-size: 8px; color: #666; margin-top: 4px;">POWERED BY SMARTKHATA PRO</div>
    </div>
  </div>
</body>
</html>`;

    // -------------------------------------------------------------------------------------------------
    // 6. VIBRANT STARTUP RIBBON (Modern Gradient)
    // -------------------------------------------------------------------------------------------------
    case 'template_startup_gradient':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNo}_${cName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    ${commonPrintCss}
    .st-card { border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .st-ribbon { height: 8px; background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6); }
    .st-header { padding: 26px 30px 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .st-biz { font-size: 26px; font-weight: 900; background: linear-gradient(135deg, #7c3aed, #2563eb); -webkit-background-clip: text; -webkit-text-fill-color: #7c3aed; }
    .st-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 16px; border-radius: 12px; overflow: hidden; border: 1px solid #f1f5f9; }
    .st-table th { background: #f8fafc; color: #64748b; font-weight: 800; font-size: 11px; padding: 11px 14px; text-transform: uppercase; text-align: left; }
    .st-table td { padding: 14px; border-top: 1px solid #f1f5f9; font-size: 12.5px; }
  </style>
</head>
<body>
  <div class="page-wrap">
    <div class="st-card">
      <div class="st-ribbon"></div>
      <div class="st-header">
        <div>
          <div class="st-biz">${mBizName}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 3px;">${mAddress || 'Creative Studio & Enterprise'}</div>
          <div style="font-size: 11.5px; color: #64748b;">Phone: ${mPhone} • Email: ${mEmail || 'contact@merchant.com'}</div>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; padding: 4px 14px; border-radius: 999px; background: #f3e8ff; color: #7c3aed; font-weight: 800; font-size: 11px;">
            ${billTitle}
          </div>
          <div style="font-family: monospace; font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 8px;">${docNo}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${dateFormatted}</div>
        </div>
      </div>

      <div style="padding: 0 30px 30px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #faf5ff; border: 1px solid #f3e8ff; border-radius: 14px; padding: 16px;">
          <div>
            <span style="font-size: 10px; font-weight: 800; color: #7c3aed; text-transform: uppercase;">ISSUER</span>
            <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-top: 2px;">${mBizName}</div>
            <div style="font-size: 11px; color: #64748b;">${mOwnerName}</div>
          </div>
          <div>
            <span style="font-size: 10px; font-weight: 800; color: #7c3aed; text-transform: uppercase;">RECIPIENT</span>
            <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-top: 2px;">${cName}</div>
            <div style="font-size: 11px; color: #64748b;">Phone: ${cPhone || 'N/A'}</div>
          </div>
        </div>

        <table class="st-table">
          <thead>
            <tr>
              <th style="width: 10%;">#</th>
              <th style="width: 50%;">PARTICULAR</th>
              <th style="width: 20%; text-align: center;">STATUS</th>
              <th style="width: 20%; text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="color: #94a3b8; font-weight: bold;">01</td>
              <td>
                <div style="font-weight: 800; font-size: 13.5px; color: #0f172a;">${data.txn.note || 'Service Item'}</div>
                <div style="font-size: 11px; color: #64748b;">Ref #${data.txn.id.slice(-6)}</div>
              </td>
              <td style="text-align: center; font-weight: bold; color: ${isGot ? '#059669' : '#7c3aed'};">
                ${isGot ? 'PAYMENT RECEIVED' : 'BILL ISSUED'}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 15px; font-weight: 900; color: #7c3aed;">
                ${amountFormatted}
              </td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 20px; padding: 18px 24px; border-radius: 14px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 11px; font-weight: bold; opacity: 0.9; text-transform: uppercase;">AMOUNT DUE / PAID</div>
            <div style="font-size: 11.5px; opacity: 0.85; margin-top: 2px;">${data.txn.amountWords || ''}</div>
          </div>
          <div style="font-size: 26px; font-weight: 900; font-family: monospace;">
            ${amountFormatted}
          </div>
        </div>

        ${qrUrl ? `
        <div style="margin-top: 20px; padding: 14px 18px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a;">UPI Express Checkout</div>
            <div style="font-size: 11px; color: #7c3aed; font-family: monospace; font-weight: bold; margin-top: 2px;">${upiId}</div>
          </div>
          <img src="${qrUrl}" alt="QR" style="width: 75px; height: 75px; border-radius: 8px;" />
        </div>
        ` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;

    // -------------------------------------------------------------------------------------------------
    // 7. GOLD LUXURY BOUTIQUE (Warm Charcoal & Champagne Gold)
    // -------------------------------------------------------------------------------------------------
    case 'template_gold_luxury':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNo}_${cName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    ${commonPrintCss}
    .gl-card { border: 2px solid #b45309; border-radius: 14px; padding: 28px; background: #fff; }
    .gl-header { border-bottom: 2px solid #d97706; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .gl-biz { font-family: "Times New Roman", Times, serif; font-size: 28px; font-weight: 900; color: #18181b; letter-spacing: 0.05em; }
    .gl-badge { background: #b45309; color: #fff; padding: 5px 16px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; border-radius: 4px; }
    .gl-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .gl-table th { background: #18181b; color: #fef3c7; font-size: 11px; text-transform: uppercase; padding: 10px 14px; letter-spacing: 0.08em; text-align: left; }
    .gl-table td { padding: 14px; border-bottom: 1px solid #fef3c7; font-size: 12px; }
    .gl-total-card { margin-top: 24px; background: #fffbeb; border: 1.5px solid #d97706; padding: 18px 24px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="page-wrap">
    <div class="gl-card">
      <div class="gl-header">
        <div>
          <div class="gl-biz">${mBizName}</div>
          <div style="font-size: 11.5px; color: #78716c; margin-top: 4px; letter-spacing: 0.02em;">${mAddress || 'Haute Couture & Luxury Boutique'}</div>
          <div style="font-size: 11px; color: #78716c;">Tel: ${mPhone} ${mGst ? ` • GSTIN: ${mGst}` : ''}</div>
        </div>
        <div style="text-align: right;">
          <span class="gl-badge">${billTitle}</span>
          <div style="font-size: 13px; font-weight: bold; color: #b45309; margin-top: 8px; font-family: monospace;">${docNo}</div>
          <div style="font-size: 11px; color: #78716c; margin-top: 2px;">${dateFormatted}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; background: #fffdf5;">
        <div>
          <span style="font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase;">BOUTIQUE</span>
          <div style="font-weight: 800; font-size: 14px; color: #18181b; margin-top: 3px;">${mBizName}</div>
          <div style="font-size: 11px; color: #78716c;">Client Advisor: ${mOwnerName}</div>
        </div>
        <div>
          <span style="font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase;">PATRON</span>
          <div style="font-weight: 800; font-size: 14px; color: #18181b; margin-top: 3px;">${cName}</div>
          <div style="font-size: 11px; color: #78716c;">Contact: ${cPhone || 'N/A'}</div>
        </div>
      </div>

      <table class="gl-table">
        <thead>
          <tr>
            <th style="width: 10%;">REF</th>
            <th style="width: 50%;">ACQUISITION / SERVICE</th>
            <th style="width: 20%; text-align: center;">NATURE</th>
            <th style="width: 20%; text-align: right;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="color: #b45309; font-weight: bold;">01</td>
            <td>
              <div style="font-weight: bold; font-size: 13px; color: #18181b;">${data.txn.note || 'Boutique Collection Item'}</div>
              <div style="font-size: 11px; color: #78716c;">Date: ${dateFormatted}</div>
            </td>
            <td style="text-align: center; font-weight: bold; color: ${isGot ? '#047857' : '#b45309'};">
              ${isGot ? 'PAYMENT RECEIVED' : 'STORE CREDIT'}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 15px; font-weight: 900; color: #18181b;">
              ${amountFormatted}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="gl-total-card">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase;">TOTAL VALUE</div>
          <div style="font-size: 11.5px; color: #78716c; margin-top: 2px;">${data.txn.amountWords || ''}</div>
        </div>
        <div style="font-size: 26px; font-weight: 900; color: #b45309; font-family: monospace;">
          ${amountFormatted}
        </div>
      </div>

      <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #78716c;">
        <div>Thank you for choosing our boutique experience.</div>
        <div style="text-align: right;">
          <div style="width: 150px; border-bottom: 1px solid #b45309; margin-bottom: 4px;"></div>
          <div style="font-weight: bold; color: #18181b;">Authorized Signature</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // -------------------------------------------------------------------------------------------------
    // 8. OFFICIAL GST TAX PRO (Tax Breakdown & Statutory Compliance)
    // -------------------------------------------------------------------------------------------------
    case 'template_gst_compliant':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNo}_${cName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    ${commonPrintCss}
    .gst-card { border: 2px solid #0f172a; padding: 20px; background: #fff; }
    .gst-table { width: 100%; border-collapse: collapse; margin-top: 14px; border: 1px solid #0f172a; }
    .gst-table th { background: #f1f5f9; color: #0f172a; font-weight: 800; font-size: 10px; text-transform: uppercase; padding: 6px 8px; border: 1px solid #0f172a; text-align: center; }
    .gst-table td { padding: 8px; border: 1px solid #cbd5e1; font-size: 11px; }
  </style>
</head>
<body>
  <div class="page-wrap">
    <div class="gst-card">
      <div style="text-align: center; border-bottom: 1.5px solid #0f172a; padding-bottom: 12px;">
        <div style="font-size: 13px; font-weight: 900; letter-spacing: 0.1em; color: #2563eb;">TAX INVOICE / CASH MEMO</div>
        <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 4px;">${mBizName}</div>
        <div style="font-size: 11px; color: #475569;">${mAddress || 'Merchant Establishment'}</div>
        <div style="font-size: 11px; color: #0f172a; font-weight: bold; margin-top: 2px;">
          GSTIN: ${mGst || 'UNREGISTERED'} • STATE CODE: 09 • PHONE: ${mPhone}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #0f172a; font-size: 11px;">
        <div style="padding: 10px; border-right: 1px solid #0f172a;">
          <div style="font-weight: bold; color: #64748b; font-size: 10px;">DETAILS OF BUYER / RECIPIENT:</div>
          <div style="font-weight: 900; font-size: 13px; color: #0f172a; margin-top: 2px;">${cName}</div>
          <div>Phone: ${cPhone || 'N/A'}</div>
          <div>Address: ${cAddress || 'Over Counter Delivery'}</div>
          <div>Buyer GSTIN: ${data.customer.gst || 'URP (Unregistered Person)'}</div>
        </div>
        <div style="padding: 10px;">
          <div>Invoice No: <strong style="font-family: monospace; font-size: 12px;">${docNo}</strong></div>
          <div>Invoice Date: <strong>${dateFormatted}</strong></div>
          <div>Place of Supply: <strong>Uttar Pradesh (09)</strong></div>
          <div>Reverse Charge: <strong>NO</strong></div>
        </div>
      </div>

      <table class="gst-table">
        <thead>
          <tr>
            <th style="width: 5%;">SN</th>
            <th style="width: 45%; text-align: left;">Description of Goods / Services</th>
            <th style="width: 15%;">HSN/SAC</th>
            <th style="width: 15%;">Taxable Val</th>
            <th style="width: 20%; text-align: right;">Total Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td>
              <strong>${data.txn.note || (isGot ? 'Payment Settlement' : 'Commercial Supplies')}</strong>
              <div style="font-size: 9.5px; color: #64748b;">Txn Ref: ${data.txn.id}</div>
            </td>
            <td style="text-align: center; font-family: monospace;">998319</td>
            <td style="text-align: right; font-family: monospace;">${amountFormatted}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 900;">${amountFormatted}</td>
          </tr>
          <tr style="background: #f8fafc; font-weight: bold;">
            <td colspan="4" style="text-align: right; padding: 8px;">TOTAL INVOICE VALUE (ROUNDED OFF):</td>
            <td style="text-align: right; font-family: monospace; font-size: 14px; color: #2563eb;">${amountFormatted}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 10px; font-size: 11px; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">
        <strong>Total Amount in Words:</strong> ${data.txn.amountWords || ''}
      </div>

      <div style="margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 10.5px;">
        <div>
          <strong>Declaration:</strong><br/>
          We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct.
        </div>
        <div style="text-align: right;">
          <div style="font-weight: bold;">For ${mBizName}</div>
          <div style="margin-top: 40px; border-bottom: 1px solid #0f172a; width: 140px; margin-left: auto;"></div>
          <div style="margin-top: 4px;">Authorized Signatory</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // -------------------------------------------------------------------------------------------------
    // 9. SWISS MONOCHROME GRID (Architectural Black & White)
    // -------------------------------------------------------------------------------------------------
    case 'template_swiss_monochrome':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNo}_${cName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    ${commonPrintCss}
    .sw-card { border-top: 8px solid #000; padding: 24px 0; background: #fff; }
    .sw-grid { display: grid; grid-template-columns: 2fr 1fr; border-bottom: 2px solid #000; padding-bottom: 24px; }
    .sw-biz { font-size: 32px; font-weight: 900; letter-spacing: -0.04em; color: #000; }
    .sw-table { width: 100%; border-collapse: collapse; margin-top: 30px; }
    .sw-table th { border-bottom: 2px solid #000; font-size: 11px; text-transform: uppercase; padding: 8px 0; text-align: left; letter-spacing: 0.05em; }
    .sw-table td { padding: 16px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="page-wrap">
    <div class="sw-card">
      <div class="sw-grid">
        <div>
          <div class="sw-biz">${mBizName}</div>
          <div style="font-size: 12px; color: #333; margin-top: 6px;">${mAddress || 'Commercial Registry'}</div>
          <div style="font-size: 12px; color: #333;">T: ${mPhone} • E: ${mEmail || 'N/A'}</div>
          ${mGst ? `<div style="font-size: 12px; font-weight: bold; margin-top: 2px;">GST: ${mGst}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 900; text-transform: uppercase;">${billTitle}</div>
          <div style="font-family: monospace; font-size: 14px; font-weight: bold; margin-top: 4px;">NO. ${docNo}</div>
          <div style="font-size: 12px; margin-top: 4px;">${dateFormatted}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; margin: 24px 0;">
        <div>
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">CLIENT</div>
          <div style="font-size: 16px; font-weight: 900; color: #000; margin-top: 4px;">${cName}</div>
          <div style="font-size: 12px; color: #333;">${cPhone || 'N/A'}</div>
          <div style="font-size: 12px; color: #333;">${cAddress || ''}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #666;">TOTAL PAYABLE</div>
          <div style="font-size: 32px; font-weight: 900; color: #000; margin-top: 2px;">${amountFormatted}</div>
        </div>
      </div>

      <table class="sw-table">
        <thead>
          <tr>
            <th style="width: 10%;">POS</th>
            <th style="width: 60%;">SPECIFICATION</th>
            <th style="width: 30%; text-align: right;">NET AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: 900;">01</td>
            <td>
              <div style="font-weight: 900; font-size: 14px;">${data.txn.note || 'Supply Transaction'}</div>
              <div style="font-size: 11px; color: #666; margin-top: 2px;">Ref: ${data.txn.id}</div>
            </td>
            <td style="text-align: right; font-size: 16px; font-weight: 900;">
              ${amountFormatted}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 60px; border-top: 2px solid #000; padding-top: 14px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold;">
        <span>SWISS MINIMAL DESIGN • SMARTKHATA ENGINE</span>
        <span>APPROVED BY ${mOwnerName.toUpperCase()}</span>
      </div>
    </div>
  </div>
</body>
</html>`;

    // -------------------------------------------------------------------------------------------------
    // 10. SCAN & PAY QR ACCENT (Prominent UPI Recovery Spotlight)
    // -------------------------------------------------------------------------------------------------
    case 'template_ribbon_accent':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docNo}_${cName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    ${commonPrintCss}
    .rb-card { border: 2px solid #0284c7; border-radius: 16px; overflow: hidden; background: #fff; }
    .rb-top { background: #0284c7; color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
    .rb-biz { font-size: 24px; font-weight: 900; letter-spacing: -0.02em; }
    .rb-qr-banner { margin: 20px; background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 14px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="page-wrap">
    <div class="rb-card">
      <div class="rb-top">
        <div>
          <div class="rb-biz">${mBizName}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">${mAddress || 'Merchant Partner Store'}</div>
          <div style="font-size: 11.5px; opacity: 0.9;">Phone: ${mPhone} ${mGst ? ` • GSTIN: ${mGst}` : ''}</div>
        </div>
        <div style="text-align: right;">
          <div style="background: #fff; color: #0284c7; font-weight: 900; font-size: 11px; padding: 4px 12px; border-radius: 6px; display: inline-block;">
            ${billTitle}
          </div>
          <div style="font-family: monospace; font-size: 14px; font-weight: bold; margin-top: 6px;">${docNo}</div>
          <div style="font-size: 11px; opacity: 0.9;">${dateFormatted}</div>
        </div>
      </div>

      <div style="padding: 20px 24px 0;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase;">MERCHANT:</div>
            <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-top: 2px;">${mBizName}</div>
            <div style="font-size: 11px; color: #64748b;">${mPhone}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase;">CUSTOMER:</div>
            <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-top: 2px;">${cName}</div>
            <div style="font-size: 11px; color: #64748b;">${cPhone || 'N/A'}</div>
          </div>
        </div>
      </div>

      <!-- Prominent QR Spotlight -->
      ${qrUrl ? `
      <div class="rb-qr-banner">
        <div>
          <span style="background: #0284c7; color: #fff; font-size: 10px; font-weight: 900; padding: 3px 8px; border-radius: 4px;">FAST PAYMENT</span>
          <div style="font-size: 15px; font-weight: 900; color: #0369a1; margin-top: 6px;">Scan with Any UPI App & Pay</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Google Pay • PhonePe • Paytm • BHIM • Cred</div>
          <div style="font-size: 12px; font-family: monospace; font-weight: bold; color: #0f172a; margin-top: 4px;">UPI ID: ${upiId}</div>
        </div>
        <img src="${qrUrl}" alt="UPI QR" style="width: 95px; height: 95px; border-radius: 8px; border: 1.5px solid #0284c7; background: #fff; padding: 4px;" />
      </div>
      ` : ''}

      <div style="padding: 0 24px 24px;">
        <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: bold; color: #64748b;">
            <span>TRANSACTION DETAILS</span>
            <span>AMOUNT</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${data.txn.note || (isGot ? 'Payment Settlement' : 'Sales Transaction')}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Ref: ${data.txn.id} • ${dateFormatted}</div>
            </div>
            <div style="font-size: 20px; font-weight: 900; color: #0284c7; font-family: monospace;">
              ${amountFormatted}
            </div>
          </div>
        </div>

        <div style="margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b;">
          <div>SmartKhata Pro • Zero Fraud Protected Record</div>
          <div style="text-align: right;">
            <div style="width: 140px; border-bottom: 1.5px solid #0284c7; margin-bottom: 4px;"></div>
            <div style="font-weight: bold; color: #0284c7;">Authorized Merchant Sign</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
