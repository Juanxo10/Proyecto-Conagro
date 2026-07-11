const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET no está definido en el archivo .env');
  process.exit(1);
}

const BCRYPT_ROUNDS = 12;

// ==================== LOGIN ====================
exports.login = async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
    }

    const result = await pool.query(
      'SELECT id, nombre, usuario, password, rol, activo FROM usuarios WHERE usuario = $1',
      [usuario]
    );

    const user = result.rows[0];

    // Mismo mensaje para usuario no encontrado y contraseña incorrecta
    // (evita enumeración de usuarios)
    if (!user || !user.activo) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        usuario: user.usuario,
        rol: user.rol
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ==================== REGISTER ====================
exports.register = async (req, res) => {
  try {
    const { nombre, usuario, password, rol = 'empleado' } = req.body;

    if (!nombre || !usuario || !password) {
      return res.status(400).json({ message: 'Nombre, usuario y contraseña son obligatorios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    if (!['admin', 'empleado'].includes(rol)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, usuario, password, rol, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, nombre, usuario, rol`,
      [nombre, usuario, hash, rol]
    );

    res.status(201).json({
      message: 'Usuario creado correctamente',
      user: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'El nombre de usuario ya existe' });
    }
    console.error('Error en register:', error);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
};