// frontend/services/auditService.js
import api from './api';

export const auditService = {
  /**
   * Fetch paginated audit logs with search and filter parameters
   */
  async listLogs(params = {}) {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  },

  /**
   * Fetch audit statistics (total, today, deletions, updates, creates)
   */
  async getStats() {
    const response = await api.get('/audit-logs/stats');
    return response.data?.data || {};
  },

  /**
   * Fetch single audit log detail by ID
   */
  async getLogDetail(id) {
    const response = await api.get(`/audit-logs/${id}`);
    return response.data?.data || null;
  },
};

export default auditService;
