// frontend/services/approvalService.js
import api from './api';

export const approvalService = {
  /**
   * Fetch paginated approval requests with tab filtering
   */
  async listApprovals(params = {}) {
    const response = await api.get('/approvals', { params });
    return response.data;
  },

  /**
   * Fetch approval counter badges (pending actions, approved, rejected, etc.)
   */
  async getBadgeCounts() {
    const response = await api.get('/approvals/badge-counts');
    return response.data?.data || {};
  },

  /**
   * Fetch approval request details by ID
   */
  async getApprovalById(id) {
    const response = await api.get(`/approvals/${id}`);
    return response.data?.data || null;
  },

  /**
   * Submit a new approval request
   */
  async createApproval(data) {
    const response = await api.post('/approvals', data);
    return response.data;
  },

  /**
   * Execute action: APPROVE, REJECT, or ESCALATE
   */
  async handleAction(id, action, reviewer_comments = '') {
    const response = await api.patch(`/approvals/${id}/action`, {
      action,
      reviewer_comments,
    });
    return response.data;
  },
};

export default approvalService;
