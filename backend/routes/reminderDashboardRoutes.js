const express = require('express');
const router = express.Router();
const {
    getReminderDashboard,
    updateReminderSettledStatus
} = require('../controllers/reminderDashboardController');

router.get('/', getReminderDashboard);
router.patch('/status', updateReminderSettledStatus);

module.exports = router;
