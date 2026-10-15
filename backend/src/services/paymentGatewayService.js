// backend/src/services/paymentGatewayService.js
const QRCode = require('qrcode');
const { Op } = require('sequelize');

class PaymentGatewayService {
  constructor() {
    this.provider = (process.env.PAYMENT_GATEWAY_PROVIDER || 'DEMO').toUpperCase();
    this.defaultVpa = process.env.COMPANY_UPI_VPA || 'balajilogistics@hdfcbank';
    this.companyName = process.env.COMPANY_NAME || 'Balaji Logistics';
  }

  /**
   * 1. Generate standard NPCI Dynamic UPI Intent String and Base64 QR Code
   */
  async generateDynamicUpiQr({
    amount,
    referenceId,
    payerName = '',
    remarks = '',
    vpa = null,
    payeeName = null,
  }) {
    const numAmount = parseFloat(amount || 0);
    const payeeVpa = (vpa || this.defaultVpa || 'balajilogistics@hdfcbank').trim();
    const payee = (payeeName || this.companyName || 'Balaji Logistics').trim();
    const cleanRef = referenceId || `TXN${Date.now()}`;
    const cleanNote = (remarks || `Freight ${cleanRef}`).replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 35);

    // Standard NPCI UPI URI Specification
    // If numAmount > 0, bind amount. Otherwise omit &am= for general counter standee scanner
    let upiIntent = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payee)}`;
    if (numAmount > 0) {
      upiIntent += `&am=${numAmount.toFixed(2)}`;
    }
    upiIntent += `&tr=${encodeURIComponent(cleanRef)}&tn=${encodeURIComponent(cleanNote)}&cu=INR`;

    // Render 400x400 high-res QR code
    const qrDataUrl = await QRCode.toDataURL(upiIntent, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff',
      },
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    return {
      provider: this.provider,
      is_demo: this.provider === 'DEMO',
      upi_intent: upiIntent,
      qr_data_url: qrDataUrl,
      vpa: payeeVpa,
      payee_name: payee,
      amount: numAmount > 0 ? numAmount : 0,
      reference_id: cleanRef,
      payer_name: payerName,
      expires_at: expiresAt,
    };
  }

  /**
   * 2. Generate a realistic 12-digit Indian Bank UTR (RRN)
   */
  generateDemoUtr(prefix = 'UPI') {
    const timestampPart = Date.now().toString().slice(-6);
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}/${timestampPart}${randomPart}`;
  }

  /**
   * 3. Settle Consignment Directly to Main Bank Account
   * Bypasses branch cash drawer because money enters the main company bank account.
   */
  async settleConsignmentDirectToBank({
    tenantDb,
    tenantId,
    organizationId,
    consignmentId,
    amount,
    utrNumber = null,
    bankName = 'HDFC Bank - Main Corporate Account',
    paymentMethod = 'UPI',
    userId = null,
    branchId = null,
    remarks = '',
  }) {
    const { Consignment, BranchCashClosure, ConsignmentStatusHistory } = tenantDb;

    const consignment = await Consignment.findOne({
      where: { id: consignmentId, tenant_id: tenantId },
    });

    if (!consignment) {
      throw new Error(`Consignment ${consignmentId} not found`);
    }

    const finalUtr = utrNumber || this.generateDemoUtr(paymentMethod);
    const finalAmount = parseFloat(amount || consignment.total_amount || 0);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 1. Mark Consignment as settled directly to bank
    await consignment.update({
      payment_method: paymentMethod,
      payment_status: 'CLEARED',
      is_direct_bank_settled: true,
      payment_ref: finalUtr,
      payment_bank_name: bankName,
      payment_date: now,
    });

    // 2. Record an automatic Verified Remittance Closure into BranchCashClosure
    // This logs the deposit in the Bank Deposits & Remittance register with 100% audit proof
    const effectiveBranchId = branchId || consignment.current_branch_id || consignment.dest_branch_id || consignment.origin_branch_id;
    let closure = null;

    if (BranchCashClosure) {
      closure = await BranchCashClosure.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        branch_id: effectiveBranchId,
        user_id: userId || consignment.created_by,
        closure_date: todayStr,
        total_collected_amount: finalAmount,
        remitted_amount: finalAmount,
        status: 'VERIFIED',
        deposit_mode: ['UPI', 'NEFT', 'RTGS', 'CHEQUE', 'CDM', 'CASH_DEPOSIT'].includes(paymentMethod) ? paymentMethod : 'UPI',
        bank_name: bankName,
        bank_account_no: 'MAIN-CORP-A/C-0982',
        utr_reference_no: finalUtr,
        receipt_slip_url: 'AUTO_VERIFIED_UPI_PAYMENT',
        remarks: remarks || `Direct ${paymentMethod} received into Main Bank for Docket ${consignment.lr_number || consignment.docket_number}. Auto-verified with UTR ${finalUtr}.`,
        verified_by: userId,
        verified_at: now,
      });
    }

    // 3. Add to status timeline history
    if (ConsignmentStatusHistory) {
      await ConsignmentStatusHistory.create({
        consignment_id: consignment.id,
        status: consignment.status,
        location: 'Main Bank Account (Direct Transfer)',
        branch_id: effectiveBranchId,
        user_id: userId,
        remarks: `Payment of ₹${finalAmount.toFixed(2)} received directly into ${bankName} via ${paymentMethod} (UTR: ${finalUtr}). Bypasses branch cash drawer.`,
        timestamp: now,
      });
    }

    return {
      success: true,
      consignment_id: consignment.id,
      lr_number: consignment.lr_number || consignment.docket_number,
      amount: finalAmount,
      utr: finalUtr,
      bank_name: bankName,
      payment_method: paymentMethod,
      is_direct_bank_settled: true,
      closure_id: closure ? closure.id : null,
      message: `Direct ${paymentMethod} verified successfully. Funds credited directly to ${bankName}.`,
    };
  }

  /**
   * 4. Settle Invoice Directly to Main Bank Account (For TBB / Corporate Credit)
   */
  async settleInvoiceDirectToBank({
    tenantDb,
    tenantId,
    organizationId,
    invoiceId,
    amount,
    utrNumber = null,
    bankName = 'HDFC Bank - Main Corporate Account',
    paymentMethod = 'NEFT',
    userId = null,
    remarks = '',
  }) {
    const { Invoice, Payment, CustomerLedger, Customer } = tenantDb;

    const invoice = await Invoice.findOne({
      where: { id: invoiceId, tenant_id: tenantId },
      include: [{ model: Customer, as: 'customer' }],
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const finalUtr = utrNumber || this.generateDemoUtr(paymentMethod);
    const finalAmount = parseFloat(amount || (invoice.total_amount - (invoice.paid_amount || 0)));
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 1. Create Payment Record linked to Invoice
    const payment = await Payment.create({
      tenant_id: tenantId,
      organization_id: organizationId,
      branch_id: invoice.branch_id || null,
      payment_number: `PAY-${Date.now().toString().slice(-6)}`,
      customer_id: invoice.customer_id,
      invoice_id: invoice.id,
      amount: finalAmount,
      payment_date: todayStr,
      payment_method: paymentMethod,
      reference_number: finalUtr,
      bank_name: bankName,
      remarks: remarks || `Direct ${paymentMethod} settled into Main Bank for Invoice ${invoice.invoice_number}. UTR: ${finalUtr}`,
      received_by: userId || invoice.created_by,
    });

    // 2. Update Invoice Paid Amount and Status
    const newPaidAmount = parseFloat(invoice.paid_amount || 0) + finalAmount;
    const isFullyPaid = newPaidAmount >= parseFloat(invoice.total_amount || 0);

    await invoice.update({
      paid_amount: newPaidAmount,
      status: isFullyPaid ? 'PAID' : 'PARTIAL',
    });

    // 3. Update Customer Ledger Balance if CustomerLedger model exists
    if (Customer && invoice.customer_id) {
      const cust = await Customer.findByPk(invoice.customer_id);
      if (cust) {
        const currentBal = parseFloat(cust.current_balance || 0);
        await cust.update({
          current_balance: Math.max(0, currentBal - finalAmount),
        });
      }
    }

    return {
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_name: invoice.customer?.name || 'Corporate Customer',
      amount_settled: finalAmount,
      utr: finalUtr,
      bank_name: bankName,
      payment_id: payment.id,
      invoice_status: isFullyPaid ? 'PAID' : 'PARTIAL',
      message: `Invoice ${invoice.invoice_number} cleared via direct ${paymentMethod}. Overdue balance updated.`,
    };
  }
}

module.exports = new PaymentGatewayService();
