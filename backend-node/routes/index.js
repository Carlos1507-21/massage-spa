// ============================================
// SANACIÓN CONSCIENTE - API Routes
// ============================================

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const reservationRoutes = require('./reservations');
const therapistRoutes = require('./therapists');
const businessHoursRoutes = require('./business-hours');
const googleCalendarRoutes = require('./googleCalendar');

router.use('/auth', authRoutes);
router.use('/reservations', reservationRoutes);
router.use('/therapists', therapistRoutes);
router.use('/business-hours', businessHoursRoutes);
router.use('/google-calendar', googleCalendarRoutes);

module.exports = router;
