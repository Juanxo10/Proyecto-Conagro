const express = require('express');
const router = express.Router();
const InventarioController = require('../controllers/inventarioController');

router.get('/resumen',      InventarioController.getResumen);
router.get('/movimientos',  InventarioController.getMovimientos);
router.get('/totales',      InventarioController.getTotales);

module.exports = router;
