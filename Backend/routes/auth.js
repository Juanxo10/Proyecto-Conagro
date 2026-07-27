const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Rutas
// Crear usuarios requiere sesión de administrador — evita que cualquiera
// se registre a sí mismo con rol "admin".
router.post('/register', verifyToken, requireRole('admin'), register);
router.post('/login', login);

// ←←← ESTA LÍNEA ES LA MÁS IMPORTANTE
module.exports = router;

console.log('✅ Rutas de autenticación cargadas correctamente');