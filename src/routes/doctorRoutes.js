const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const statsController = require('../controllers/statsController');

router.get('/', doctorController.getDoctors);
router.post('/', doctorController.createDoctor);
router.get('/:id/stats', statsController.getDoctorStats);
router.get('/:id', doctorController.getDoctorById);
router.put('/:id', doctorController.updateDoctor);
router.delete('/:id', doctorController.deleteDoctor);

module.exports = router;
