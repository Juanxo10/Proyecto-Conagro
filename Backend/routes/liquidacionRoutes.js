const express = require('express');
const router  = express.Router();
const LiquidacionController = require('../controllers/liquidacionController');

router.get('/buscar',              LiquidacionController.buscarLotes);
router.get('/lote-datos/:lote_id', LiquidacionController.getLoteDatos);
router.get('/',                    LiquidacionController.listar);
router.get('/:lote_id',            LiquidacionController.getLiquidacion);
router.post('/',                   LiquidacionController.guardarLiquidacion);

module.exports = router;
