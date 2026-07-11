const express = require('express');
const router  = express.Router();
const PrevioController = require('../controllers/previoController');

router.get('/nuevo-lote',      PrevioController.nuevoLote);
router.get('/aprobados',       PrevioController.getAprobados);
router.get('/',                PrevioController.getAll);
router.get('/:id',             PrevioController.getOne);
router.post('/',               PrevioController.create);
router.put('/:id',             PrevioController.update);
router.patch('/:id/estado',    PrevioController.updateEstado);
router.delete('/:id',          PrevioController.remove);

module.exports = router;
