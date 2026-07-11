const express    = require('express');
const router     = express.Router();
const Despacho   = require('../controllers/despachoController');

router.get('/buscar',              Despacho.buscarLiquidados);
router.get('/lote-datos/:lote_id', Despacho.getLoteDatos);
router.get('/',                    Despacho.listar);
router.get('/:lote_id',            Despacho.getDespacho);
router.post('/',                   Despacho.registrarDespacho);

module.exports = router;
