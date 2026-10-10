// src/routes/v1/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const bookingRoutes = require('./bookingRoutes');
const customerRoutes = require('./customerRoutes');
const fleetRoutes = require('./fleetRoutes');
const tripRoutes = require('./tripRoutes');
const deliveryRoutes = require('./deliveryRoutes');
const podRoutes = require('./podRoutes');
const billingRoutes = require('./billingRoutes');
const expenseRoutes = require('./expenseRoutes');
const organizationRoutes = require('./organizationRoutes');
const trackingRoutes = require('./trackingRoutes');
const branchRoutes = require('./branchRoutes');
const roleRoutes = require('./roleRoutes');
const userRoutes = require('./userRoutes');
const approvalRoutes = require('./approvalRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const gpsRoutes = require('./gpsRoutes');

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/bookings', bookingRoutes);
router.use('/consignments', bookingRoutes); // Aliased for flexible API access
router.use('/branches', branchRoutes);
router.use('/hubs', branchRoutes); // Aliased for hubs access
router.use('/customers', customerRoutes);
router.use('/fleet', fleetRoutes);
router.use('/users', userRoutes);
router.use('/trips', tripRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/pods', podRoutes);
router.use('/billing', billingRoutes);
router.use('/expenses', expenseRoutes);
router.use('/approvals', approvalRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/organizations', organizationRoutes);
router.use('/tracking', trackingRoutes);
router.use('/roles', roleRoutes);
router.use('/gps', gpsRoutes);

module.exports = router;
