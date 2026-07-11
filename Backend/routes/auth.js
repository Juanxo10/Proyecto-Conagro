const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');

// Rutas
router.post('/register', register);
router.post('/login', login);

// ←←← ESTA LÍNEA ES LA MÁS IMPORTANTE
module.exports = router;

console.log('✅ Rutas de autenticación cargadas correctamente');