// src/routes/v1/deliveryRoutes.js
const express = require('express');
const router = express.Router();
const deliveryController = require('../../controllers/deliveryController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');

router.use(authenticate, tenantResolver);

// List destination deliveries with metrics, branch filter, status tabs & search
router.get('/', deliveryController.listDeliveryOperations);
router.get('/operations', deliveryController.listDeliveryOperations);

// Create Delivery Run Sheet (DRS) for batch door-delivery dispatch
router.post('/drs/create', deliveryController.createDrs);

// Direct Godown / Counter delivery handover (Self-pickup)
router.post('/godown-handover', deliveryController.markGodownDelivery);

// Get Gate Pass / Delivery Challan
router.get('/:id/gate-pass', deliveryController.getGatePass);

const { getMulterUploader } = require('../../utils/fileStorage');
const podUpload = getMulterUploader('pods');

// Upload POD file directly as multipart form-data
router.post('/upload-pod', podUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = `/uploads/pods/${req.file.filename}`;
  return res.json({
    success: true,
    data: {
      file_url: fileUrl,
      file_name: req.file.originalname,
      file_size: `${(req.file.size / 1024).toFixed(0)} KB`,
    },
  });
});

// Mark delivered & Mark out-for-delivery
router.post('/:id/delivered', deliveryController.markDelivered);
router.post('/:id/out-for-delivery', deliveryController.markOutForDelivery);

module.exports = router;
