'use strict';

const pool = require('../config/db');

/* Genera el siguiente lote_id para el año actual: LOT-YYYY-XXXX */
async function generarLoteId() {
  const year = new Date().getFullYear();
  const prefix = `LOT-${year}-`;

  const { rows } = await pool.query(
    `SELECT lote_id FROM previos
     WHERE lote_id LIKE $1
     ORDER BY lote_id DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  let siguiente = 1;
  if (rows.length) {
    const ultimo = rows[0].lote_id; // LOT-2026-0023
    const num = parseInt(ultimo.split('-')[2], 10);
    if (!isNaN(num)) siguiente = num + 1;
  }

  return `${prefix}${String(siguiente).padStart(4, '0')}`;
}

const PrevioController = {

  /* GET /api/previos/nuevo-lote  →  { lote_id: "LOT-2026-0001" } */
  async nuevoLote(req, res) {
    try {
      const lote_id = await generarLoteId();
      res.json({ lote_id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /* GET /api/previos */
  async getAll(req, res) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM previos ORDER BY id DESC'
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /* GET /api/previos/:id */
  async getOne(req, res) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM previos WHERE id = $1', [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Previo no encontrado' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /* POST /api/previos */
  async create(req, res) {
    try {
      const {
        lote_id, fecha, propietario, cedula_nit, placa,
        peso_bruto, peso_tara,
        humedad_s, humedad_l, impureza,
        nombre_conductor, cedula_conductor, producto
      } = req.body;

      if (!lote_id) return res.status(400).json({ error: 'lote_id es obligatorio' });
      if (!fecha)   return res.status(400).json({ error: 'fecha es obligatoria' });

      const { rows } = await pool.query(
        `INSERT INTO previos (
           lote_id, fecha, propietario, cedula_nit, placa,
           peso_bruto, peso_tara,
           humedad_s, humedad_l, impureza,
           nombre_conductor, cedula_conductor, producto
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          lote_id, fecha, propietario ?? null, cedula_nit ?? null, placa ?? null,
          peso_bruto ?? 0, peso_tara ?? 0,
          humedad_s ?? null, humedad_l ?? null, impureza ?? null,
          nombre_conductor ?? null, cedula_conductor ?? null, producto ?? null
        ]
      );

      res.status(201).json({ message: 'Previo guardado', previo: rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'El lote_id ya existe' });
      }
      console.error('Error create previo:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /* PUT /api/previos/:id */
  async update(req, res) {
    try {
      const {
        fecha, propietario, cedula_nit, placa,
        peso_bruto, peso_tara,
        humedad_s, humedad_l, impureza,
        nombre_conductor, cedula_conductor, producto
      } = req.body;

      const { rows } = await pool.query(
        `UPDATE previos SET
           fecha=$1, propietario=$2, cedula_nit=$3, placa=$4,
           peso_bruto=$5, peso_tara=$6,
           humedad_s=$7, humedad_l=$8, impureza=$9,
           nombre_conductor=$10, cedula_conductor=$11, producto=$12
         WHERE id=$13 RETURNING *`,
        [
          fecha, propietario ?? null, cedula_nit ?? null, placa ?? null,
          peso_bruto ?? 0, peso_tara ?? 0,
          humedad_s ?? null, humedad_l ?? null, impureza ?? null,
          nombre_conductor ?? null, cedula_conductor ?? null, producto ?? null,
          req.params.id
        ]
      );

      if (!rows.length) return res.status(404).json({ error: 'Previo no encontrado' });
      res.json({ message: 'Previo actualizado', previo: rows[0] });
    } catch (err) {
      console.error('Error update previo:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /* DELETE /api/previos/:id */
  async remove(req, res) {
    try {
      // Obtener el lote_id antes de eliminar
      const { rows: prev } = await pool.query(
        'SELECT lote_id, estado FROM previos WHERE id = $1', [req.params.id]
      );
      if (!prev.length) return res.status(404).json({ error: 'Previo no encontrado' });

      const { lote_id, estado } = prev[0];

      // Bloquear si ya tiene datos asociados
      const [pesajes, trillas, liqRows, despachos] = await Promise.all([
        pool.query('SELECT id FROM pesajes       WHERE lote_id = $1 LIMIT 1', [lote_id]),
        pool.query('SELECT id FROM trillas        WHERE lote_id = $1 LIMIT 1', [lote_id]),
        pool.query('SELECT id FROM liquidaciones  WHERE lote_id = $1 LIMIT 1', [lote_id]),
        pool.query('SELECT id FROM despachos      WHERE lote_id = $1 LIMIT 1', [lote_id]),
      ]);

      const motivos = [];
      if (pesajes.rows.length)  motivos.push('pesaje registrado');
      if (trillas.rows.length)  motivos.push('trilla registrada');
      if (liqRows.rows.length)  motivos.push('liquidación registrada');
      if (despachos.rows.length) motivos.push('despacho registrado');

      if (motivos.length)
        return res.status(409).json({
          error: `No se puede eliminar el lote ${lote_id}: tiene ${motivos.join(', ')}`
        });

      const { rows } = await pool.query(
        'DELETE FROM previos WHERE id = $1 RETURNING id', [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Previo no encontrado' });
      res.json({ message: 'Previo eliminado' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /* GET /api/previos/aprobados?q=<lote_id|placa> */
  async getAprobados(req, res) {
    try {
      const { q } = req.query;
      let query = "SELECT * FROM previos WHERE estado IN ('APROBADO', 'CONDICIONADO')";
      const params = [];
      if (q && q.trim()) {
        query += ' AND (lote_id ILIKE $1 OR placa ILIKE $1)';
        params.push(`%${q.trim()}%`);
      }
      query += ' ORDER BY id DESC LIMIT 50';
      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /* PATCH /api/previos/:id/estado  body: { estado } */
  async updateEstado(req, res) {
    try {
      const { estado } = req.body;
      const allowed = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'CONDICIONADO', 'PESADO'];
      if (!allowed.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${allowed.join(', ')}` });
      }
      const { rows } = await pool.query(
        'UPDATE previos SET estado=$1 WHERE id=$2 RETURNING *',
        [estado, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Previo no encontrado' });
      res.json({ message: 'Estado actualizado', previo: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = PrevioController;
