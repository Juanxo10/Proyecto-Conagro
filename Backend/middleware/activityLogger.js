'use strict';

/**
 * Middleware de auditoría — registra cada petición en activity_logs.
 * Se monta DESPUÉS de verifyToken para tener req.user disponible.
 *
 * Uso en server.js:
 *   const activityLogger = require('./middleware/activityLogger');
 *   app.use('/api/...', verifyToken, activityLogger, routes);
 */

const pool = require('../config/db');

// Mapeo de prefijos de ruta → nombre legible de módulo
const MODULO_MAP = [
  { prefix: '/api/auth',         modulo: 'Autenticación'  },
  { prefix: '/api/pesajes',      modulo: 'Pesajes'        },
  { prefix: '/api/previos',      modulo: 'Previos'        },
  { prefix: '/api/trillas',      modulo: 'Trillas'        },
  { prefix: '/api/liquidaciones',modulo: 'Liquidaciones'  },
  { prefix: '/api/despachos',    modulo: 'Despachos'      },
  { prefix: '/api/inventario',   modulo: 'Inventario'     },
  { prefix: '/api/vehiculos',    modulo: 'Vehículos'      },
  { prefix: '/api/panel',        modulo: 'Panel'          },
  { prefix: '/api/logs',         modulo: 'Logs'           },
];

// Acción según método HTTP
const ACCION_MAP = {
  GET:    'CONSULTA',
  POST:   'CREACIÓN',
  PUT:    'EDICIÓN',
  PATCH:  'EDICIÓN',
  DELETE: 'ELIMINACIÓN',
};

// Rutas de sólo lectura de bajo interés — se omiten para no saturar logs
const SKIP_PATTERNS = [
  /^GET\/api\/panel/,
  /^GET\/api\/inventario/,
  /^GET\/api\/logs/,
];

function getModulo(path) {
  for (const { prefix, modulo } of MODULO_MAP) {
    if (path.startsWith(prefix)) return modulo;
  }
  return 'Sistema';
}

function buildDescripcion(req, statusCode) {
  const accion = ACCION_MAP[req.method] || req.method;
  const modulo = getModulo(req.path);

  // Descripción amigable por módulo y método
  const partes = [`${accion} en ${modulo}`];

  // Añadir detalle útil según ruta
  if (req.params?.id) partes.push(`ID: ${req.params.id}`);
  if (req.body?.lote_id) partes.push(`Lote: ${req.body.lote_id}`);
  if (req.body?.placas)  partes.push(`Placa: ${req.body.placas}`);
  if (req.body?.usuario) partes.push(`Usuario: ${req.body.usuario}`);
  if (statusCode >= 400) partes.push(`(Error ${statusCode})`);

  return partes.join(' · ');
}

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

const activityLogger = (req, res, next) => {
  // Guardar referencia al método original
  const originalEnd = res.end.bind(res);

  res.end = function (...args) {
    // Restaurar para evitar doble llamada
    res.end = originalEnd;
    originalEnd(...args);

    // Omitir rutas de baja relevancia
    const key = `${req.method}${req.path}`;
    if (SKIP_PATTERNS.some(p => p.test(key))) return;

    const statusCode = res.statusCode;
    const user       = req.user || {};
    const modulo     = getModulo(req.path);
    const accion     = ACCION_MAP[req.method] || req.method;
    const descripcion = buildDescripcion(req, statusCode);
    const ip         = getIp(req);

    // Inserción async, no bloquea la respuesta
    pool.query(
      `INSERT INTO activity_logs
         (usuario_id, usuario, nombre, rol, accion, modulo, descripcion, ip, metodo, ruta, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        user.id    || null,
        user.usuario || null,
        user.nombre  || null,
        user.rol     || null,
        accion,
        modulo,
        descripcion,
        ip,
        req.method,
        req.path,
        statusCode,
      ]
    ).catch(err => {
      console.error('⚠ activityLogger insert error:', err.message);
    });
  };

  next();
};

module.exports = activityLogger;
