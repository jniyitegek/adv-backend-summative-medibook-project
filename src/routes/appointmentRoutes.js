const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

router.post('/', appointmentController.bookAppointment);
router.post('/waitlist', appointmentController.joinWaitlist);
router.delete('/:id', appointmentController.cancelAppointment);

module.exports = router;
