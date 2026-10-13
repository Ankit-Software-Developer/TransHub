// frontend/services/branchClosureService.js
import api from './api';

const branchClosureService = {
  // 1. Get Live Cash Balance & Unclosed Status
  getCurrentBalance: async (branchId) => {
    const params = branchId ? { branch_id: branchId } : {};
    const response = await api.get('/branch-closures/current-balance', { params });
    return response.data;
  },

  // 2. Remit Cash to Bank & Close Daybook
  remitToBank: async (data) => {
    const response = await api.post('/branch-closures/remit', data);
    return response.data;
  },

  // 3. Remittance & Closure History
  getClosureHistory: async (params = {}) => {
    const response = await api.get('/branch-closures/history', { params });
    return response.data;
  },

  // 4. Verify / Approve Remittance (Admin / Finance)
  verifyClosure: async (id, data) => {
    const response = await api.patch(`/branch-closures/${id}/verify`, data);
    return response.data;
  },
};

export default branchClosureService;
