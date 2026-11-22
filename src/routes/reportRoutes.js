const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/doctors', statsController.getDoctorsReport);
router.get('/busy-days', statsController.getBusyDaysReport);

module.exports = router;
