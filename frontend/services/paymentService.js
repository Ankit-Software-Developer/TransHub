// frontend/services/paymentService.js
import api from './api';

const paymentService = {
  // 1. Generate standard dynamic NPCI UPI QR code
  generateUpiQr: async (payload) => {
    const response = await api.post('/payments/generate-qr', payload);
    return response.data;
  },

  // 2. Simulate or Auto-Verify UPI Payment (Demo / Live Webhook simulation)
  simulateUpiPayment: async (payload) => {
    const response = await api.post('/payments/simulate-upi-success', payload);
    return response.data;
  },
};

export default paymentService;
