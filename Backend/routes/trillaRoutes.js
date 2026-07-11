const express = require('express');
const router  = express.Router();
const TrillaController = require('../controllers/trillaController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/lotes-pesados',            TrillaController.getLotesPesados);
router.get('/lotes-procesados',         TrillaController.getLotesProcesados);
router.get('/lote-completo/:lote_id',   TrillaController.getLoteCompleto);
router.get('/certificados',             TrillaController.getCertificados);

router.post('/certificados',            TrillaController.guardarCertificado);
router.post('/',                        TrillaController.registrarTrilla);
router.patch('/:lote_id/certificado', verifyToken, TrillaController.actualizarCertificado);
router.put('/:lote_id', verifyToken, requireRole('admin'), TrillaController.actualizarTrilla);

module.exports = router;
