'use strict';

const pool = require('../config/db');

const NUM = `(COALESCE(peso_bruto::NUMERIC, 0) - COALESCE(peso_tara::NUMERIC, 0) - COALESCE(destare_empaque::NUMERIC, 0))`;
// tipo_movimiento NULL se trata como ENTRADA (pesajes anteriores a la columna)
const TIPO = `COALESCE(tipo_movimiento, 'ENTRADA')`;

const InventarioController = {

  /** GET /api/inventario/resumen — Stock actual por producto + bodega */
  async getResumen(req, res) {
    try {
      const result = await pool.query(`
        SELECT
          COALESCE(NULLIF(TRIM(codigo),''),      'SIN CÓDIGO')  AS codigo,
          COALESCE(NULLIF(TRIM(descripcion),''), 'SIN NOMBRE')  AS descripcion,
          COALESCE(NULLIF(TRIM(bodega),''),      'SIN BODEGA')  AS bodega,
          COALESCE(MAX(NULLIF(TRIM(presentacion),'')),'—')       AS presentacion,

          ROUND(SUM(CASE WHEN ${TIPO} = 'ENTRADA' THEN ${NUM} ELSE 0 END)::NUMERIC, 2)
            AS total_entradas_kg,
          COALESCE(SUM(CASE WHEN ${TIPO} = 'ENTRADA' THEN COALESCE(cantidad::NUMERIC,0) ELSE 0 END),0)::INTEGER
            AS total_entradas_qty,

          ROUND(SUM(CASE WHEN ${TIPO} = 'SALIDA' THEN ${NUM} ELSE 0 END)::NUMERIC, 2)
            AS total_salidas_kg,
          COALESCE(SUM(CASE WHEN ${TIPO} = 'SALIDA' THEN COALESCE(cantidad::NUMERIC,0) ELSE 0 END),0)::INTEGER
            AS total_salidas_qty,

          ROUND((
            SUM(CASE WHEN ${TIPO} = 'ENTRADA' THEN ${NUM} ELSE 0 END) -
            SUM(CASE WHEN ${TIPO} = 'SALIDA'  THEN ${NUM} ELSE 0 END)
          )::NUMERIC, 2) AS stock_kg,
          (
            COALESCE(SUM(CASE WHEN ${TIPO} = 'ENTRADA' THEN COALESCE(cantidad::NUMERIC,0) ELSE 0 END),0) -
            COALESCE(SUM(CASE WHEN ${TIPO} = 'SALIDA'  THEN COALESCE(cantidad::NUMERIC,0) ELSE 0 END),0)
          )::INTEGER AS stock_qty,

          COUNT(*)                                                           AS total_movimientos,
          COUNT(CASE WHEN ${TIPO} = 'ENTRADA' THEN 1 END)                   AS n_entradas,
          COUNT(CASE WHEN ${TIPO} = 'SALIDA'  THEN 1 END)                   AS n_salidas,
          MAX(fecha)                                                         AS ultimo_movimiento
        FROM pesajes
        WHERE ${TIPO} IN ('ENTRADA','SALIDA')
        GROUP BY
          COALESCE(NULLIF(TRIM(codigo),''),      'SIN CÓDIGO'),
          COALESCE(NULLIF(TRIM(descripcion),''), 'SIN NOMBRE'),
          COALESCE(NULLIF(TRIM(bodega),''),      'SIN BODEGA')
        ORDER BY descripcion, bodega
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Error getResumen inventario:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /** GET /api/inventario/movimientos?codigo=&bodega=&tipo=&desde=&hasta= */
  async getMovimientos(req, res) {
    try {
      const { codigo, bodega, tipo, desde, hasta } = req.query;
      const params = [];
      const where  = [`${TIPO} IN ('ENTRADA','SALIDA')`];

      if (codigo) { params.push(codigo); where.push(`TRIM(codigo) = $${params.length}`); }
      if (bodega)  { params.push(bodega);  where.push(`TRIM(bodega)  = $${params.length}`); }
      if (tipo)    { params.push(tipo);    where.push(`${TIPO} = $${params.length}`); }
      if (desde)   { params.push(desde);   where.push(`fecha >= $${params.length}`); }
      if (hasta)   { params.push(hasta);   where.push(`fecha <= $${params.length}`); }

      const result = await pool.query(`
        SELECT
          id,
          fecha,
          hora,
          COALESCE(tipo_movimiento, 'ENTRADA') AS tipo_movimiento,
          lote_id,
          COALESCE(NULLIF(TRIM(codigo),''),       '—') AS codigo,
          COALESCE(NULLIF(TRIM(descripcion),''),  '—') AS descripcion,
          COALESCE(NULLIF(TRIM(bodega),''),       '—') AS bodega,
          COALESCE(NULLIF(TRIM(presentacion),''), '—') AS presentacion,
          placas,
          conductor,
          nombre,
          propietario,
          empresa,
          nit_propietario,
          numero_tiquete,
          cantidad,
          procedencia,
          observaciones,
          peso_bruto,
          peso_tara,
          destare_empaque,
          ROUND(${NUM}::NUMERIC, 2) AS peso_neto_kg
        FROM pesajes
        WHERE ${where.join(' AND ')}
        ORDER BY id DESC
        LIMIT 1000
      `, params);

      res.json(result.rows);
    } catch (err) {
      console.error('Error getMovimientos inventario:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /** GET /api/inventario/totales — Totales globales */
  async getTotales(req, res) {
    try {
      const result = await pool.query(`
        SELECT
          ROUND(SUM(CASE WHEN ${TIPO} = 'ENTRADA' THEN ${NUM} ELSE 0 END)::NUMERIC, 2)
            AS total_entradas_kg,
          ROUND(SUM(CASE WHEN ${TIPO} = 'SALIDA'  THEN ${NUM} ELSE 0 END)::NUMERIC, 2)
            AS total_salidas_kg,
          ROUND((
            SUM(CASE WHEN ${TIPO} = 'ENTRADA' THEN ${NUM} ELSE 0 END) -
            SUM(CASE WHEN ${TIPO} = 'SALIDA'  THEN ${NUM} ELSE 0 END)
          )::NUMERIC, 2) AS stock_total_kg,

          COALESCE(SUM(CASE WHEN ${TIPO} = 'ENTRADA' THEN COALESCE(cantidad::NUMERIC,0) ELSE 0 END),0)::INTEGER
            AS total_entradas_qty,
          COALESCE(SUM(CASE WHEN ${TIPO} = 'SALIDA'  THEN COALESCE(cantidad::NUMERIC,0) ELSE 0 END),0)::INTEGER
            AS total_salidas_qty,
          (
            COALESCE(SUM(CASE WHEN ${TIPO} = 'ENTRADA' THEN COALESCE(cantidad::NUMERIC,0) ELSE 0 END),0) -
            COALESCE(SUM(CASE WHEN ${TIPO} = 'SALIDA'  THEN COALESCE(cantidad::NUMERIC,0) ELSE 0 END),0)
          )::INTEGER AS stock_total_qty,

          COUNT(*)                                                          AS total_movimientos,
          COUNT(CASE WHEN ${TIPO} = 'ENTRADA' THEN 1 END)                  AS n_entradas,
          COUNT(CASE WHEN ${TIPO} = 'SALIDA'  THEN 1 END)                  AS n_salidas,
          COUNT(DISTINCT
            COALESCE(NULLIF(TRIM(codigo),''), NULLIF(TRIM(descripcion),''))
          ) AS n_productos
        FROM pesajes
        WHERE ${TIPO} IN ('ENTRADA','SALIDA')
      `);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error getTotales inventario:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = InventarioController;

