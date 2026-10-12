// frontend/services/billingService.js
import api from './api';

export const billingService = {
  /**
   * Fetch financial KPIs & KPI summary
   */
  async getSummary() {
    const response = await api.get('/billing/summary');
    return response.data?.data || null;
  },

  /**
   * List invoices with filtering, status & search
   */
  async listInvoices(params = {}) {
    const response = await api.get('/billing/invoices', { params });
    return response.data;
  },

  /**
   * Fetch full invoice details by ID (including items, customer & payments)
   */
  async getInvoiceById(id) {
    const response = await api.get(`/billing/invoices/${id}`);
    return response.data?.data || null;
  },

  /**
   * Fetch unbilled consignments (TBB or delivered LRs) ready for invoicing
   */
  async getUnbilledConsignments(params = {}) {
    const response = await api.get('/billing/unbilled-consignments', { params });
    return response.data?.data || [];
  },

  /**
   * Generate Freight Tax Invoice
   */
  async createInvoice(payload) {
    const response = await api.post('/billing/invoices', payload);
    return response.data?.data || response.data;
  },

  /**
   * Record remittance payment & reconcile invoice
   */
  async recordPayment(payload) {
    const response = await api.post('/billing/payments', payload);
    return response.data?.data || response.data;
  },

  /**
   * Update invoice due date, payment terms, or remarks
   */
  async updateInvoice(id, payload) {
    const response = await api.patch(`/billing/invoices/${id}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Cancel / Void an invoice and release consignments
   */
  async cancelInvoice(id, payload = {}) {
    const response = await api.post(`/billing/invoices/${id}/cancel`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Fetch Customer Ledger statement
   */
  async getCustomerLedger(customerId) {
    const response = await api.get(`/billing/ledger/${customerId}`);
    return response.data?.data || [];
  },

  /**
   * Export GSTR-1 Outward B2B Supply Register
   */
  async exportGSTR1(params = {}) {
    const response = await api.get('/billing/export-gstr1', { params });
    return response.data?.data || [];
  },

  /**
   * Fetch customer list for invoice generation
   */
  async getCustomers() {
    try {
      const response = await api.get('/customers', { params: { limit: 100 } });
      return response.data?.data?.rows || response.data?.data || [];
    } catch (err) {
      console.warn('Failed to fetch customers, falling back', err);
      return [];
    }
  },
};

export default billingService;
