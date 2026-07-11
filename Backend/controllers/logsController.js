'use strict';

const pool = require('../config/db');

const PAGE_SIZE = 50;

const LogsController = {

  /**
   * GET /api/logs
   * Query params: page, usuario, modulo, accion, desde, hasta, busqueda
   */
  async getAll(req, res) {
    try {
      const page    = Math.max(1, parseInt(req.query.page)  || 1);
      const limit   = PAGE_SIZE;
      const offset  = (page - 1) * limit;

      const conditions = [];
      const params     = [];

      if (req.query.usuario) {
        params.push(`%${req.query.usuario}%`);
        conditions.push(`(al.usuario ILIKE $${params.length} OR al.nombre ILIKE $${params.length})`);
      }
      if (req.query.modulo) {
        params.push(req.query.modulo);
        conditions.push(`al.modulo = $${params.length}`);
      }
      if (req.query.accion) {
        params.push(req.query.accion);
        conditions.push(`al.accion = $${params.length}`);
      }
      if (req.query.desde) {
        params.push(req.query.desde);
        conditions.push(`al.created_at >= $${params.length}::timestamptz`);
      }
      if (req.query.hasta) {
        params.push(req.query.hasta);
        conditions.push(`al.created_at <= $${params.length}::timestamptz + interval '1 day'`);
      }
      if (req.query.busqueda) {
        params.push(`%${req.query.busqueda}%`);
        conditions.push(`(al.descripcion ILIKE $${params.length} OR al.ruta ILIKE $${params.length} OR al.usuario ILIKE $${params.length})`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      // Total count
      const countSql = `SELECT COUNT(*) FROM activity_logs al ${where}`;
      const { rows: countRows } = await pool.query(countSql, params);
      const total = parseInt(countRows[0].count);

      // Data
      params.push(limit);
      params.push(offset);
      const dataSql = `
        SELECT id, usuario_id, usuario, nombre, rol, accion, modulo, descripcion,
               ip, metodo, ruta, estado, created_at
        FROM activity_logs al
        ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      const { rows } = await pool.query(dataSql, params);

      res.json({
        data: rows,
        total,
        page,
        pages: Math.ceil(total / limit),
        page_size: limit,
      });
    } catch (err) {
      console.error('Error obteniendo logs:', err.message);
      res.status(500).json({ error: 'Error interno al obtener logs' });
    }
  },

  /**
   * GET /api/logs/stats
   * Resumen rápido para tarjetas de KPI
   */
  async getStats(req, res) {
    try {
      const { rows } = await pool.query(`
        SELECT
          COUNT(*)                                                    AS total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')  AS hoy,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS semana,
          COUNT(DISTINCT usuario)                                     AS usuarios_activos,
          COUNT(*) FILTER (WHERE estado >= 400)                       AS errores
        FROM activity_logs
      `);
      res.json(rows[0]);
    } catch (err) {
      console.error('Error obteniendo stats de logs:', err.message);
      res.status(500).json({ error: 'Error interno' });
    }
  },

  /**
   * GET /api/logs/modules
   * Lista de módulos distintos para el filtro
   */
  async getModulos(req, res) {
    try {
      const { rows } = await pool.query(
        `SELECT DISTINCT modulo FROM activity_logs ORDER BY modulo`
      );
      res.json(rows.map(r => r.modulo));
    } catch (err) {
      res.status(500).json({ error: 'Error interno' });
    }
  },
};

module.exports = LogsController;
