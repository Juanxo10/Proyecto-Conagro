'use strict';
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

/* GET /api/panel/lotes
   Devuelve todos los previos con su estado actual + datos de cada etapa */
router.get('/lotes', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.*,
        CASE
          WHEN d.id IS NOT NULL THEN 'DESPACHADO'
          WHEN l.id IS NOT NULL THEN 'LIQUIDADO'
          WHEN t.id IS NOT NULL THEN 'PROCESADO'
          WHEN pe.id IS NOT NULL THEN 'PESADO'
          ELSE COALESCE(p.estado, 'PENDIENTE')
        END AS estado_calculado,
        pe.id      AS pesaje_id,
        pe.peso_bruto AS peso_bruto_pesaje,
        t.id       AS trilla_id,
        t.kilos_resultado,
        l.id       AS liquidacion_id,
        l.total_pagar,
        l.peso_ajustado,
        d.id       AS despacho_id,
        d.numero_despacho,
        d.fecha_despacho
      FROM previos p
      LEFT JOIN pesajes       pe ON pe.lote_id = p.lote_id
      LEFT JOIN trillas        t  ON t.lote_id  = p.lote_id
      LEFT JOIN liquidaciones  l  ON l.lote_id  = p.lote_id
      LEFT JOIN despachos      d  ON d.lote_id  = p.lote_id
      ORDER BY p.id DESC
    `);

    // Usar estado_calculado si el estado de previos no refleja la realidad
    const data = rows.map(r => ({
      ...r,
      estado: r.estado_calculado || r.estado || 'PENDIENTE',
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
