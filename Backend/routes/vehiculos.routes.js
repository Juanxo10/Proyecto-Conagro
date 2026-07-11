'use strict';

const express              = require('express');
const router               = express.Router();
const VehiculoController   = require('../controllers/vehiculos.controller');
const { validateVehiculo } = require('../middleware/validate');

// Rutas estáticas antes de /:id para evitar colisiones
router.get('/search',     VehiculoController.search);
router.get('/con-pesaje', VehiculoController.getConPesaje);

router.get('/',     VehiculoController.getAll);
router.get('/:id',  VehiculoController.getById);
router.post('/',    validateVehiculo, VehiculoController.create);
router.put('/:id',  validateVehiculo, VehiculoController.update);
router.delete('/:id', VehiculoController.delete);

module.exports = router;

