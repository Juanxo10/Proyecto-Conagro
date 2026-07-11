'use strict';

const pool = require('../config/db');

function str(v) { return (v === null || v === undefined || v === '') ? null : v; }
function num(v, fb = null) { return (v === null || v === undefined || v === '') ? fb : Number(v); }

const LiquidacionController = {

  /* GET /api/liquidaciones/lote-datos/:lote_id
     Devuelve previo + pesaje + trilla juntos para poblar el formulario */
  async getLoteDatos(req, res) {
    try {
      const { lote_id } = req.params;
      const [previoRes, pesajeRes, trillaRes] = await Promise.all([
        pool.query('SELECT * FROM previos  WHERE lote_id = $1', [lote_id]),
        pool.query(
          `SELECT * FROM pesajes WHERE lote_id = $1
             AND (transacc IS NULL OR transacc NOT IN ('TRILLA_SUBPROD','TRILLA_CONSUMO'))
           ORDER BY id DESC LIMIT 1`,
          [lote_id]
        ),
        pool.query('SELECT * FROM trillas  WHERE lote_id = $1 ORDER BY id DESC LIMIT 1', [lote_id]),
      ]);
      const previo = previoRes.rows[0] || null;
      if (!previo) return res.status(404).json({ error: `Lote ${lote_id} no encontrado` });
      res.json({
        previo,
        pesaje: pesajeRes.rows[0] || null,
        trilla: trillaRes.rows[0] || null,
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* GET /api/liquidaciones/buscar?q= — busca lotes listos para liquidar (sin liquidación aún) */
  async buscarLotes(req, res) {
    try {
      const { q } = req.query;
      let sql = `SELECT p.* FROM previos p
        LEFT JOIN liquidaciones l ON l.lote_id = p.lote_id
        WHERE l.id IS NULL
          AND p.estado IN ('PESADO','PROCESADO')`;
      const params = [];
      if (q?.trim()) {
        sql += ' AND (p.lote_id ILIKE $1 OR p.placa ILIKE $1 OR p.propietario ILIKE $1)';
        params.push(`%${q.trim()}%`);
      }
      sql += ' ORDER BY p.id DESC LIMIT 50';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* GET /api/liquidaciones/:lote_id — obtener liquidación existente */
  async getLiquidacion(req, res) {
    try {
      const { lote_id } = req.params;
      const { rows } = await pool.query(
        'SELECT * FROM liquidaciones WHERE lote_id = $1 ORDER BY id DESC LIMIT 1',
        [lote_id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Sin liquidación para este lote' });
      res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* POST /api/liquidaciones — crear o actualizar liquidación */
  async guardarLiquidacion(req, res) {
    try {
      const {
        lote_id, fecha_liquidacion,
        humedad, impureza,
        factor_humedad, factor_impureza, factor_total,
        peso_neto, peso_ajustado,
        unidad_precio, precio, total_pagar,
        observaciones, usuario,
      } = req.body;

      if (!lote_id) return res.status(400).json({ error: 'lote_id es obligatorio' });

      // Verificar que el lote existe
      const { rows: previoRows } = await pool.query(
        'SELECT estado FROM previos WHERE lote_id = $1', [lote_id]
      );
      if (!previoRows.length)
        return res.status(404).json({ error: 'Lote no encontrado' });

      const estadoActual = previoRows[0].estado;
      if (estadoActual === 'DESPACHADO')
        return res.status(409).json({ error: `El lote ya fue despachado, no se puede modificar la liquidación` });
      if (!['PESADO', 'PROCESADO', 'LIQUIDADO'].includes(estadoActual))
        return res.status(400).json({
          error: `El lote debe estar al menos en estado PESADO para liquidar (estado actual: ${estadoActual})`
        });

      // Upsert
      const { rows } = await pool.query(
        `INSERT INTO liquidaciones (
           lote_id, fecha_liquidacion,
           humedad, impureza,
           factor_humedad, factor_impureza, factor_total,
           peso_neto, peso_ajustado,
           unidad_precio, precio, total_pagar,
           observaciones, usuario, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
         ON CONFLICT (lote_id) DO UPDATE SET
           fecha_liquidacion    = EXCLUDED.fecha_liquidacion,
           humedad              = EXCLUDED.humedad,
           impureza             = EXCLUDED.impureza,
           factor_humedad       = EXCLUDED.factor_humedad,
           factor_impureza      = EXCLUDED.factor_impureza,
           factor_total         = EXCLUDED.factor_total,
           peso_neto            = EXCLUDED.peso_neto,
           peso_ajustado        = EXCLUDED.peso_ajustado,
           unidad_precio        = EXCLUDED.unidad_precio,
           precio               = EXCLUDED.precio,
           total_pagar          = EXCLUDED.total_pagar,
           observaciones        = EXCLUDED.observaciones,
           usuario              = EXCLUDED.usuario,
           updated_at           = NOW()
         RETURNING *`,
        [
          lote_id,
          str(fecha_liquidacion),
          num(humedad), num(impureza),
          num(factor_humedad), num(factor_impureza), num(factor_total),
          num(peso_neto), num(peso_ajustado),
          str(unidad_precio) || 'kg',
          num(precio), num(total_pagar),
          str(observaciones), str(usuario),
        ]
      );

      // Actualizar estado del previo a LIQUIDADO
      await pool.query(
        "UPDATE previos SET estado = 'LIQUIDADO' WHERE lote_id = $1",
        [lote_id]
      );

      res.status(201).json({ message: 'Liquidación guardada', liquidacion: rows[0] });
    } catch (err) {
      console.error('Error guardarLiquidacion:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /* GET /api/liquidaciones — listar todas */
  async listar(req, res) {
    try {
      const { rows } = await pool.query(
        `SELECT l.*, p.propietario, p.placa, p.producto, p.nombre_conductor
         FROM liquidaciones l
         LEFT JOIN previos p ON p.lote_id = l.lote_id
         ORDER BY l.id DESC LIMIT 100`
      );
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
};

module.exports = LiquidacionController;
