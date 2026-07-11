const express = require('express');
const router = express.Router();
const PesajeController = require('../controllers/pesajeController');

router.get('/', PesajeController.getAll);
router.get('/byplaca/:placa',            PesajeController.getByPlaca);
router.get('/:id', PesajeController.getOne);
router.post('/', PesajeController.create);
router.put('/:id', PesajeController.update);
router.delete('/:id', PesajeController.remove);

module.exports = router;

