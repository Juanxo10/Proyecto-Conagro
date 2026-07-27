'use strict';

const pool = require('../config/db');

/* Convierte cadenas vacías a null para columnas numeric de PostgreSQL */
function num(v, fallback = null) {
  if (v === null || v === undefined || v === '') return fallback;
  return v;
}

function str(v) {
  if (v === null || v === undefined || v === '') return null;
  return v;
}

function extractFields(body) {
  return {
    fecha:                      str(body.fecha),
    hora:                       str(body.hora),
    placas:                     str(body.placas),
    conductor:                  str(body.conductor),
    nombre:                     str(body.nombre),
    propietario:                str(body.propietario),
    empresa:                    str(body.empresa),
    codigo:                     str(body.codigo),
    subcodigo:                  str(body.subcodigo),
    descripcion:                str(body.descripcion),
    nit_propietario:            str(body.nit_propietario),
    nombre_producto:            str(body.nombre_producto) || str(body.descripcion),
    numero_tiquete:             str(body.numero_tiquete),
    transacc:                   str(body.transacc),
    bodega:                     str(body.bodega),
    cantidad:                   num(body.cantidad),
    peso_bruto:                 num(body.peso_bruto,  '0'),
    peso_tara:                  num(body.peso_tara,   '0'),
    destare_empaque:            num(body.destare_empaque, '0'),
    presentacion:               str(body.presentacion),
    division:                   str(body.division),
    endoso:                     str(body.endoso),
    tipo_movimiento:            str(body.tipo_movimiento) ?? 'ENTRADA',
    observaciones:              str(body.observaciones),
    procedencia:                str(body.procedencia),
    humedad_inicial:            num(body.humedad_inicial),
    humedad_final:              num(body.humedad_final),
    impureza_inicial:           num(body.impureza_inicial),
    impureza_final:             num(body.impureza_final),
    compra:                     num(body.compra),
    kilo:                       num(body.kilo),
    pilada:                     num(body.pilada),
    lote_id:                    str(body.lote_id),
  };
}

const PesajeController = {

  async getAll(req, res) {
    try {
      const { rows } = await pool.query('SELECT * FROM pesajes ORDER BY id DESC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getOne(req, res) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM pesajes WHERE id = $1', [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Pesaje no encontrado' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getByPlaca(req, res) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM pesajes WHERE placas = $1 ORDER BY id DESC LIMIT 1',
        [req.params.placa]
      );
      res.json(rows[0] || null);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async create(req, res) {
    try {
      const f = extractFields(req.body);

      /* ── Validar lote si se envía ─────────────────────────── */
      if (f.lote_id) {
        const { rows: previoRows } = await pool.query(
          'SELECT id, lote_id, estado FROM previos WHERE lote_id = $1',
          [f.lote_id]
        );
        if (!previoRows.length) {
          return res.status(404).json({ error: `Lote ${f.lote_id} no encontrado` });
        }
        const previo = previoRows[0];
        if (!['APROBADO', 'CONDICIONADO'].includes(previo.estado)) {
          return res.status(400).json({
            error: `El lote ${f.lote_id} no está en estado APROBADO o CONDICIONADO (estado actual: ${previo.estado || 'PENDIENTE'})`
          });
        }
        const { rows: yaExiste } = await pool.query(
          'SELECT id FROM pesajes WHERE lote_id = $1', [f.lote_id]
        );
        if (yaExiste.length) {
          return res.status(409).json({
            error: `Ya existe un pesaje para el lote ${f.lote_id} (pesaje #${yaExiste[0].id})`
          });
        }
      } else if (!f.placas) {
        return res.status(400).json({ error: 'La placa o el lote_id son obligatorios' });
      }

      /* ── Validar código de producto ─────────────────────── */
      if (!f.codigo) {
        return res.status(400).json({ error: 'El código de producto es obligatorio' });
      }

      /* ── Validar fecha ───────────────────────────────────── */
      if (!f.fecha) {
        return res.status(400).json({ error: 'La fecha es obligatoria' });
      }

      if (!f.hora) {
        return res.status(400).json({ error: 'La hora es obligatoria' });
      }

      if (!f.nombre) {
        return res.status(400).json({ error: 'El nombre del conductor es obligatorio' });
      }

      if (!f.propietario) {
        return res.status(400).json({ error: 'El propietario es obligatorio' });
      }

      /* ── Validar peso bruto positivo (obligatorio) ───────── */
      const pesoVal = parseFloat(f.peso_bruto);
      if (!f.peso_bruto || isNaN(pesoVal) || pesoVal <= 0) {
        return res.status(400).json({ error: 'El peso bruto es obligatorio y debe ser un valor numérico positivo' });
      }

      const { rows } = await pool.query(
        `INSERT INTO pesajes (
           fecha, hora, placas, conductor, nombre, propietario, empresa,
           codigo, subcodigo, descripcion, nit_propietario, nombre_producto,
           transacc, bodega, cantidad, peso_bruto, peso_tara, destare_empaque,
           presentacion, division, endoso, tipo_movimiento, numero_tiquete,
           observaciones, procedencia,
           humedad_inicial, humedad_final, impureza_inicial, impureza_final,
           compra, kilo, pilada, lote_id
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
           $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
         ) RETURNING *`,
        [
          f.fecha, f.hora, f.placas, f.conductor, f.nombre, f.propietario, f.empresa,
          f.codigo, f.subcodigo, f.descripcion, f.nit_propietario, f.nombre_producto,
          f.transacc, f.bodega, f.cantidad, f.peso_bruto, f.peso_tara, f.destare_empaque,
          f.presentacion, f.division, f.endoso, f.tipo_movimiento, f.numero_tiquete,
          f.observaciones, f.procedencia,
          f.humedad_inicial, f.humedad_final, f.impureza_inicial, f.impureza_final,
          f.compra, f.kilo, f.pilada, f.lote_id
        ]
      );

      /* ── Cambiar lote a PESADO ────────────────────────────── */
      if (f.lote_id) {
        await pool.query(
          "UPDATE previos SET estado = 'PESADO' WHERE lote_id = $1",
          [f.lote_id]
        );
      }

      res.status(201).json({ message: 'Pesaje guardado correctamente', pesaje: rows[0] });
    } catch (err) {
      console.error('Error create pesaje:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async update(req, res) {
    try {
      const f = extractFields(req.body);
      const { id } = req.params;

      const { rows } = await pool.query(
        `UPDATE pesajes SET
           fecha=$1, hora=$2, placas=$3, conductor=$4, nombre=$5,
           propietario=$6, empresa=$7, codigo=$8, subcodigo=$9,
           descripcion=$10, nit_propietario=$11, nombre_producto=$12,
           transacc=$13, bodega=$14, cantidad=$15, peso_bruto=$16,
           peso_tara=$17, destare_empaque=$18, presentacion=$19,
           division=$20, endoso=$21, tipo_movimiento=$22, numero_tiquete=$23,
           observaciones=$24, procedencia=$25,
           humedad_inicial=$26, humedad_final=$27,
           impureza_inicial=$28, impureza_final=$29,
           compra=$30, kilo=$31, pilada=$32
         WHERE id=$33 RETURNING *`,
        [
          f.fecha, f.hora, f.placas, f.conductor, f.nombre,
          f.propietario, f.empresa, f.codigo, f.subcodigo,
          f.descripcion, f.nit_propietario, f.nombre_producto,
          f.transacc, f.bodega, f.cantidad, f.peso_bruto,
          f.peso_tara, f.destare_empaque, f.presentacion,
          f.division, f.endoso, f.tipo_movimiento, f.numero_tiquete,
          f.observaciones, f.procedencia,
          f.humedad_inicial, f.humedad_final,
          f.impureza_inicial, f.impureza_final,
          f.compra, f.kilo, f.pilada,
          id
        ]
      );

      if (!rows.length) return res.status(404).json({ error: 'Pesaje no encontrado' });
      res.json({ message: 'Pesaje actualizado correctamente', pesaje: rows[0] });
    } catch (err) {
      console.error('Error update pesaje:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async remove(req, res) {
    try {
      const { rows } = await pool.query(
        'DELETE FROM pesajes WHERE id = $1 RETURNING id', [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Pesaje no encontrado' });
      res.json({ message: 'Pesaje eliminado correctamente' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = PesajeController;
