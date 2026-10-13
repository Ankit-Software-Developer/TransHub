// frontend/services/reportService.js
import api from './api';

const reportService = {
  // 1. Docket & Freight Sales Register
  getDocketFreightReport: async (params = {}) => {
    const response = await api.get('/reports/dockets', { params });
    return response.data;
  },

  // 2. Customer Outstanding & Ageing Report
  getCustomerAgeingReport: async (params = {}) => {
    const response = await api.get('/reports/customer-ageing', { params });
    return response.data;
  },

  // 3. Line-Haul Trip & Settlement Audit
  getTripProfitabilityReport: async (params = {}) => {
    const response = await api.get('/reports/trip-profitability', { params });
    return response.data;
  },

  // 4. Proof of Delivery (POD) Compliance
  getPodComplianceReport: async (params = {}) => {
    const response = await api.get('/reports/pod-compliance', { params });
    return response.data;
  },

  // 5. Daily Branch Cash & Collection Register
  getDailyCollectionReport: async (params = {}) => {
    const response = await api.get('/reports/daily-collections', { params });
    return response.data;
  },

  // 6. GST Sales & Tax Liability Register
  getGstTaxReport: async (params = {}) => {
    const response = await api.get('/reports/gst-register', { params });
    return response.data;
  },
};

export default reportService;
