// frontend/services/supportService.js
import api from './api';

const supportService = {
  getBadgeCounts: async () => {
    try {
      const response = await api.get('/support/badge-counts');
      return response.data?.data || { pendingTickets: 0 };
    } catch (e) {
      return { pendingTickets: 0 };
    }
  },

  getTickets: async (params = {}) => {
    const response = await api.get('/support/tickets', { params });
    return response.data;
  },

  getTicketById: async (id) => {
    const response = await api.get(`/support/tickets/${id}`);
    return response.data;
  },

  createTicket: async (data) => {
    const response = await api.post('/support/tickets', data);
    return response.data;
  },

  addMessage: async (ticketId, data) => {
    const response = await api.post(`/support/tickets/${ticketId}/messages`, data);
    return response.data;
  },

  escalateToSuperAdmin: async (ticketId, reason) => {
    const response = await api.post(`/support/tickets/${ticketId}/escalate`, { reason });
    return response.data;
  },

  updateStatus: async (ticketId, status, resolution_notes = '') => {
    const response = await api.patch(`/support/tickets/${ticketId}/status`, {
      status,
      resolution_notes,
    });
    return response.data;
  },
};

export default supportService;
