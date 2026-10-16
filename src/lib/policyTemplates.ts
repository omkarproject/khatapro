// Default compliance templates for Legal Policies (Terms, Refunds, Privacy)
// Used across Settings Editor, Policy Pages, and Fallbacks

export interface PolicyBrandContext {
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  websiteName?: string;
}

export function isHtmlPolicy(text: string): boolean {
  if (!text) return false;
  return /<[a-z][\s\S]*>/i.test(text);
}

export function getDefaultTermsTemplate(ctx?: PolicyBrandContext): string {
  const bName = ctx?.businessName || ctx?.websiteName || 'Business';
  const bPhone = ctx?.businessPhone || '+91 9876543210';
  const bEmail = ctx?.businessEmail || 'support@khatapro.in';
  const bAddress = ctx?.businessAddress || 'Mumbai, Maharashtra, India';
  const wName = ctx?.websiteName || bName;

  return `<h2>1. Introduction & Acceptance</h2>
<p>
  Welcome to <strong>${bName}</strong> ("Company", "we", "our", "us"). By accessing our website, digital ledger services, invoicing portals, or making payments through our official links (including via Cashfree Payment Gateway), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services or execute transactions.
</p>

<h2>2. Description of Products & Services</h2>
<p>
  ${bName} provides enterprise billing software, business ledger systems (${wName}), customer khata management, hardware inventory items, and electronic invoice settlement facilities. All commercial invoices issued represent lawful transactions for supplies or software services rendered.
</p>

<h2>3. Pricing & Currency (INR)</h2>
<p>
  All prices, dues, and transaction fees listed on our website, invoices, and payment checkout screens are denominated strictly in <strong>Indian National Rupees (INR / ₹)</strong>, including applicable Goods and Services Tax (GST) unless explicitly stated otherwise. We reserve the right to revise product pricing at any time prior to invoice issuance.
</p>

<h2>4. Online Payments & Gateway Processing</h2>
<p>
  Online payments on our website are facilitated through authorized third-party payment aggregator partner <strong>Cashfree Payments India Pvt. Ltd. (Cashfree PG)</strong>, NPCI Unified Payments Interface (UPI), and compliant banking channels.
</p>
<ul>
  <li>We do not store your confidential card numbers, CVVs, or Netbanking passwords on our servers.</li>
  <li>All checkout transmissions are encrypted via 256-Bit SSL/TLS under PCI-DSS Level 1 compliance.</li>
  <li>You agree to provide accurate and authorized billing information during checkout.</li>
  <li>Upon successful authorization by the banking gateway, an electronic receipt/confirmation is generated instantly.</li>
</ul>

<h2>5. Customer Obligations</h2>
<p>
  You agree to use our website and invoice payment links solely for lawful commercial settlements. Unauthorized attempts to alter payment amounts, bypass security parameters, reverse-engineer checkout code, or execute fraudulent transactions are strictly prohibited and subject to legal prosecution under Indian Law.
</p>

<h2>6. Refunds & Cancellations</h2>
<p>
  All refund, cancellation, and chargeback requests are governed by our dedicated Refund and Cancellation Policy. Approved refunds are credited directly to the original payment method within 5 to 7 business days via Cashfree PG.
</p>

<h2>7. Limitation of Liability</h2>
<p>
  To the maximum extent permitted by applicable law, ${bName} and its payment partners shall not be held liable for indirect, incidental, or consequential damages resulting from banking network downtimes, customer device malfunctions, or unauthorized access outside our control.
</p>

<h2>8. Governing Law & Jurisdiction</h2>
<p>
  These Terms shall be interpreted and enforced in accordance with the laws of the Republic of India. Any disputes arising in connection with transactions shall be subject to the exclusive jurisdiction of the competent courts in Mumbai, Maharashtra, India.
</p>

<h2>9. Contact & Grievance Redressal</h2>
<p>For inquiries or legal notices regarding these Terms, please contact our Compliance Officer at:</p>
<div style="background: rgba(148, 163, 184, 0.1); padding: 16px; border-radius: 12px; margin-top: 8px;">
  <p><strong>Entity:</strong> ${bName}</p>
  <p><strong>Address:</strong> ${bAddress}</p>
  <p><strong>Helpline:</strong> ${bPhone}</p>
  <p><strong>Official Email:</strong> ${bEmail}</p>
</div>`;
}

export function getDefaultRefundsTemplate(ctx?: PolicyBrandContext): string {
  const bName = ctx?.businessName || ctx?.websiteName || 'Business';
  const bPhone = ctx?.businessPhone || '+91 9876543210';
  const bEmail = ctx?.businessEmail || 'support@khatapro.in';
  const bAddress = ctx?.businessAddress || 'Mumbai, Maharashtra, India';

  return `<h2>1. Cancellation Policy</h2>
<p>
  At <strong>${bName}</strong>, customer satisfaction is our prime priority. You may cancel your order or service subscription under the following guidelines:
</p>
<ul>
  <li><strong>Software & Digital Services:</strong> Subscription cancellations can be requested within 24 hours of purchase if the service or ledger configuration has not been activated.</li>
  <li><strong>Goods / Hardware Supplies:</strong> Orders for physical supplies (such as thermal printers, power equipment, or QR standees) can be cancelled at zero charge before dispatch from our warehouse. Once dispatched, cancellation will be subject to courier reverse transit fees.</li>
  <li><strong>Duplicate Orders:</strong> If an order or invoice was mistakenly paid more than once, cancellation of the redundant invoice is processed immediately upon intimation.</li>
</ul>

<h2>2. Eligibility Criteria for Refunds</h2>
<p>A full or partial refund will be approved under the following conditions:</p>
<ul>
  <li><strong>Transaction Deducted but Order Failed:</strong> In case amount was debited from your bank/UPI app but the invoice status shows unpaid or gateway session timed out, the payment gateway auto-reconciles and refunds the sum.</li>
  <li><strong>Duplicate or Excess Charge:</strong> You were charged twice or paid an excess amount for a single invoice.</li>
  <li><strong>Defective Goods or Non-Delivery:</strong> If physical items delivered are found damaged or not as per invoice specifications, report within 48 hours of receipt for a replacement or full refund.</li>
  <li><strong>Mutual Settlement Agreement:</strong> When both merchant and client formally agree on an invoice revision or commercial settlement credit.</li>
</ul>

<h2>3. Refund Processing Timeline (5 to 7 Business Days)</h2>
<p>
  Once a refund request is verified and approved by our billing team:
</p>
<div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px; margin: 12px 0;">
  <strong>Standard Banking Settlement Duration:</strong>
  <p style="margin-top: 4px;">
    The refund will be processed through <strong>Cashfree Payment Gateway</strong> back to the customer's original payment method (Bank Account, UPI ID, Credit Card, or Debit Card) within <strong>5 to 7 business days</strong>, subject to your card issuer or banking institution's settlement schedule.
  </p>
</div>

<h2>4. Method of Refund</h2>
<p>All refunds are credited strictly to the <strong>original source of payment</strong> used during checkout:</p>
<ul>
  <li><strong>UPI Transactions:</strong> Refunded to the paying VPA/Bank Account linked to UPI.</li>
  <li><strong>Debit / Credit Cards:</strong> Credited to the respective card account.</li>
  <li><strong>Net Banking:</strong> Returned to the originating savings/current bank account.</li>
  <li>No cash or third-party transfer refunds are issued to maintain strict RBI compliance and fraud prevention.</li>
</ul>

<h2>5. How to Initiate a Refund or Cancellation</h2>
<p>To request a cancellation or refund, please reach out to our Helpdesk with your Invoice Number, Transaction ID, and reason for cancellation:</p>
<div style="background: rgba(99, 102, 241, 0.1); padding: 16px; border-radius: 12px; margin-top: 8px;">
  <p><strong>Email:</strong> ${bEmail} (Subject: Refund Request - [Your Invoice #])</p>
  <p><strong>Helpline / WhatsApp:</strong> ${bPhone}</p>
  <p><strong>Registered Office:</strong> ${bAddress}</p>
  <p><strong>Working Hours:</strong> Monday to Saturday, 9:00 AM – 7:00 PM IST</p>
</div>`;
}

export function getDefaultPrivacyTemplate(ctx?: PolicyBrandContext): string {
  const bName = ctx?.businessName || ctx?.websiteName || 'Business';
  const bPhone = ctx?.businessPhone || '+91 9876543210';
  const bEmail = ctx?.businessEmail || 'support@khatapro.in';
  const bAddress = ctx?.businessAddress || 'Mumbai, Maharashtra, India';
  const wName = ctx?.websiteName || bName;

  return `<h2>1. Overview</h2>
<p>
  At <strong>${bName}</strong>, we are committed to safeguarding the privacy and security of your personal and business financial data. This Privacy Policy describes how we collect, process, and protect your information when you access ${wName} and execute online payments through our portals.
</p>

<h2>2. Information We Collect</h2>
<p>We only collect information necessary to facilitate business ledger accounting and commercial invoice settlements:</p>
<ul>
  <li><strong>Personal & Business Details:</strong> Name, phone number, email address, business name, and GSTIN.</li>
  <li><strong>Billing & Delivery Information:</strong> Shipping/billing address for physical product fulfillment or invoices.</li>
  <li><strong>Transaction Metadata:</strong> Order ID, payment amount in INR (₹), timestamp, and gateway reference (UTR/CF Payment ID).</li>
</ul>

<h2>3. Payment Security & No Card Storage</h2>
<div style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 8px; margin: 12px 0;">
  <strong>PCI-DSS Level 1 Encrypted Payment Processing</strong>
  <p style="margin-top: 4px;">
    We <strong>NEVER store, process, or view your full credit/debit card numbers, CVVs, expiry dates, or banking passwords</strong> on our servers. All sensitive financial transactions are securely tokenized and processed through RBI-approved payment aggregators (including <strong>Cashfree Payments India Pvt. Ltd.</strong>) utilizing 256-Bit SSL military-grade encryption.
  </p>
</div>

<h2>4. How We Use Your Data</h2>
<p>Your information is used strictly to:</p>
<ul>
  <li>Generate authentic tax invoices and manage your customer ledger balance.</li>
  <li>Deliver automated transaction notifications and receipts via WhatsApp or Email.</li>
  <li>Verify successful payments and facilitate legitimate refund requests.</li>
  <li>Prevent fraudulent transactions and comply with legal or taxation reporting mandates.</li>
</ul>

<h2>5. Non-Disclosure & Third-Party Sharing</h2>
<p>
  We do not sell, rent, or trade your personal or business data to marketing agencies or unauthorized third parties. Information is only shared with authorized entities (such as Cashfree Payment Gateway and banking networks) solely for executing the authorized payment transaction.
</p>

<h2>6. Data Retention & Security Measures</h2>
<p>
  We deploy strict physical, electronic, and organizational safeguards to protect customer data from unauthorized disclosure, loss, or alteration. Data is stored on secure cloud clusters with periodic encrypted backups.
</p>

<h2>7. Grievance Officer & Contact Details</h2>
<p>In accordance with the Information Technology Act 2000 and rules made thereunder, the contact details of our Compliance Desk are provided below:</p>
<div style="background: rgba(148, 163, 184, 0.1); padding: 16px; border-radius: 12px; margin-top: 8px;">
  <p><strong>Compliance Officer:</strong> Compliance & Data Security Desk</p>
  <p><strong>Business Entity:</strong> ${bName}</p>
  <p><strong>Registered Address:</strong> ${bAddress}</p>
  <p><strong>Email:</strong> ${bEmail}</p>
  <p><strong>Phone Helpline:</strong> ${bPhone}</p>
</div>`;
}
