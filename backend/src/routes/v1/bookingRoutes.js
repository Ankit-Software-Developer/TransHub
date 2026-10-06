// src/routes/v1/bookingRoutes.js
const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/bookingController');
const authenticate = require('../../middleware/authenticate');
const tenantResolver = require('../../middleware/tenantResolver');
const branchAccess = require('../../middleware/branchAccess');
const authorize = require('../../middleware/authorize');

router.use(authenticate, tenantResolver);

router.post('/', branchAccess, authorize(['booking.create']), bookingController.createBooking);
router.get('/', branchAccess, authorize(['booking.view', 'consignment.view']), bookingController.listBookings);
router.get('/:id', authorize(['booking.view', 'consignment.view']), bookingController.getBookingDetail);
router.put('/:id', branchAccess, authorize(['booking.update', 'consignment.update']), bookingController.updateBooking);
router.delete('/:id', branchAccess, authorize(['booking.cancel', 'consignment.update']), bookingController.deleteBooking);

module.exports = router;
