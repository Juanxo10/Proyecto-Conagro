const express = require('express');
const router = express.Router();

const { register, login, listUsers, updateUser } = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Rutas
// Crear usuarios requiere sesión de administrador — evita que cualquiera
// se registre a sí mismo con rol "admin".
router.post('/register', verifyToken, requireRole('admin'), register);
router.post('/login', login);

// Gestión de usuarios — solo administradores
router.get('/users',      verifyToken, requireRole('admin'), listUsers);
router.patch('/users/:id',verifyToken, requireRole('admin'), updateUser);

// ←←← ESTA LÍNEA ES LA MÁS IMPORTANTE
module.exports = router;

console.log('✅ Rutas de autenticación cargadas correctamente');