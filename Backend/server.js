const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Mantener el servidor activo ante errores no capturados
process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection:', reason?.message || reason);
});

const authRoutes = require('./routes/auth');
const vehiculosRoutes = require('./routes/vehiculos.routes');
const pesajeRoutes = require('./routes/pesajeRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const previoRoutes = require('./routes/previoRoutes');
const trillaRoutes = require('./routes/trillaRoutes');
const liquidacionRoutes = require('./routes/liquidacionRoutes');
const despachoRoutes    = require('./routes/despachoRoutes');
const panelRoutes       = require('./routes/panelRoutes');
const logsRoutes        = require('./routes/logsRoutes');
const { verifyToken, requireRole } = require('./middleware/auth');
const activityLogger    = require('./middleware/activityLogger');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ Backend funcionando');
});

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas (requieren token válido)
app.use('/api/vehiculos',    verifyToken, activityLogger, vehiculosRoutes);
app.use('/api/pesajes',      verifyToken, activityLogger, pesajeRoutes);
app.use('/api/previos',      verifyToken, activityLogger, previoRoutes);
app.use('/api/trillas',      verifyToken, activityLogger, trillaRoutes);
app.use('/api/liquidaciones',verifyToken, activityLogger, liquidacionRoutes);
app.use('/api/despachos',    verifyToken, activityLogger, despachoRoutes);
app.use('/api/panel',        verifyToken, panelRoutes);

// Rutas exclusivas para admin
app.use('/api/inventario',   verifyToken, requireRole('admin'), inventarioRoutes);
app.use('/api/logs',         verifyToken, requireRole('admin'), logsRoutes);

const PORT = process.env.PORT || 4000;
const pool = require('./config/db');

pool.dbReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error al inicializar la base de datos:', err.message);
    process.exit(1);
  });
