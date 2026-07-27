'use strict';

const pool = require('../config/db');

function str(v) { return (v === null || v === undefined || v === '') ? null : v; }
function num(v, fb = null) { return (v === null || v === undefined || v === '') ? fb : v; }

// Determina el producto resultante principal a partir de los subproductos de trilla.
// Prioriza los productos comerciales; si no hay, usa el de mayor kilos.
const COMERCIALES_TRILLA = ['Arroz blanco tipo 1', 'Arroz blanco tipo 2', 'Cristal', 'Arroz amarillo', 'Grano 1/4', '1/2 grano'];
function productoResultante(subproductos) {
  if (!Array.isArray(subproductos) || !subproductos.length) return null;
  const conKilos = subproductos
    .map(sp => ({ nombre: sp.subproducto, kilos: parseFloat(sp.kilos) || 0 }))
    .filter(sp => sp.kilos > 0);
  if (!conKilos.length) return null;
  const comerciales = conKilos.filter(sp => COMERCIALES_TRILLA.includes(sp.nombre));
  const lista = comerciales.length ? comerciales : conKilos;
  return lista.reduce((max, sp) => sp.kilos > max.kilos ? sp : max).nombre;
}

const TrillaController = {

  /* GET /api/trillas/lotes-pesados?q= */
  async getLotesPesados(req, res) {
    try {
      const { q } = req.query;
      let sql = "SELECT * FROM previos WHERE estado = 'PESADO'";
      const params = [];
      if (q?.trim()) {
        sql += ' AND (lote_id ILIKE $1 OR placa ILIKE $1)';
        params.push(`%${q.trim()}%`);
      }
      sql += ' ORDER BY id DESC LIMIT 50';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* GET /api/trillas/lotes-procesados?q= */
  async getLotesProcesados(req, res) {
    try {
      const { q } = req.query;
      let sql = "SELECT * FROM previos WHERE estado = 'PROCESADO'";
      const params = [];
      if (q?.trim()) {
        sql += ' AND (lote_id ILIKE $1 OR placa ILIKE $1)';
        params.push(`%${q.trim()}%`);
      }
      sql += ' ORDER BY id DESC LIMIT 50';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* GET /api/trillas/lote-completo/:lote_id */
  async getLoteCompleto(req, res) {
    try {
      const { lote_id } = req.params;
      const [previoRes, pesajeRes, trillaRes, subprodRes] = await Promise.all([
        pool.query('SELECT * FROM previos WHERE lote_id = $1', [lote_id]),
        pool.query(
          `SELECT * FROM pesajes WHERE lote_id = $1
             AND (transacc IS NULL OR transacc NOT IN ('TRILLA_SUBPROD','TRILLA_CONSUMO'))
           ORDER BY id DESC LIMIT 1`,
          [lote_id]
        ),
        pool.query('SELECT * FROM trillas WHERE lote_id = $1 ORDER BY id DESC LIMIT 1', [lote_id]),
        pool.query('SELECT subproducto, kilos FROM trilla_subproductos WHERE lote_id = $1 ORDER BY id', [lote_id]),
      ]);
      const previo = previoRes.rows[0] || null;
      if (!previo) return res.status(404).json({ error: `Lote ${lote_id} no encontrado` });
      res.json({
        previo,
        pesaje:       pesajeRes.rows[0]  || null,
        trilla:       trillaRes.rows[0]  || null,
        subproductos: subprodRes.rows,
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* POST /api/trillas — registrar procesamiento */
  async registrarTrilla(req, res) {
    try {
      const {
        lote_id, fecha_trilla, hora_trilla,
        rendimiento, descuento_humedad, descuento_impureza,
        descuento_grano_partido, kilos_procesados, kilos_resultado,
        analista, observaciones,
        presentacion, cantidad_salida, fecha_vencimiento,
        humedad_salida, grano_partido_salida, grano_yesado_salida,
        grano_dano_hongo_salida, grano_dano_calor_salida,
        semillas_obj_salida, impureza_salida,
        olor_resultado, sabor_resultado, color_resultado,
        nivel_infestacion_resultado, materias_extranas_resultado,
        subproductos
      } = req.body;

      if (!lote_id) return res.status(400).json({ error: 'lote_id es obligatorio' });

      const { rows: previoRows } = await pool.query(
        'SELECT estado FROM previos WHERE lote_id = $1', [lote_id]
      );
      if (!previoRows.length)
        return res.status(404).json({ error: 'Lote no encontrado' });
      if (previoRows[0].estado !== 'PESADO')
        return res.status(400).json({
          error: `El lote debe estar en estado PESADO para trilla (estado actual: ${previoRows[0].estado})`
        });

      const { rows: existing } = await pool.query(
        'SELECT id FROM trillas WHERE lote_id = $1', [lote_id]
      );
      if (existing.length)
        return res.status(409).json({ error: `El lote ${lote_id} ya tiene registro de trilla` });

      const { rows } = await pool.query(
        `INSERT INTO trillas (
           lote_id, fecha_trilla, hora_trilla, rendimiento,
           descuento_humedad, descuento_impureza, descuento_grano_partido,
           kilos_procesados, kilos_resultado, analista, observaciones,
           presentacion, cantidad_salida, fecha_vencimiento,
           humedad_salida, grano_partido_salida, grano_yesado_salida,
           grano_dano_hongo_salida, grano_dano_calor_salida,
           semillas_obj_salida, impureza_salida,
           olor_resultado, sabor_resultado, color_resultado,
           nivel_infestacion_resultado, materias_extranas_resultado
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING *`,
        [
          lote_id,
          str(fecha_trilla), str(hora_trilla),
          num(rendimiento), num(descuento_humedad), num(descuento_impureza),
          num(descuento_grano_partido), num(kilos_procesados), num(kilos_resultado),
          str(analista), str(observaciones),
          str(presentacion), str(cantidad_salida), str(fecha_vencimiento),
          num(humedad_salida), num(grano_partido_salida), num(grano_yesado_salida),
          num(grano_dano_hongo_salida), num(grano_dano_calor_salida),
          num(semillas_obj_salida), num(impureza_salida),
          str(olor_resultado), str(sabor_resultado),
          str(color_resultado),
          str(nivel_infestacion_resultado),
          str(materias_extranas_resultado)
        ]
      );

      await pool.query(
        "UPDATE previos SET estado = 'PROCESADO' WHERE lote_id = $1", [lote_id]
      );

      // Insertar subproductos si se enviaron
      if (Array.isArray(subproductos) && subproductos.length) {
        for (const sp of subproductos) {
          const kilosVal = (sp.kilos === '' || sp.kilos === null || sp.kilos === undefined) ? 0 : sp.kilos;
          await pool.query(
            'INSERT INTO trilla_subproductos (lote_id, subproducto, kilos) VALUES ($1,$2,$3)',
            [lote_id, str(sp.subproducto), kilosVal]
          );
          // Registrar en inventario como ENTRADA si tiene kilos > 0
          const kNum = parseFloat(kilosVal) || 0;
          if (kNum > 0) {
            await pool.query(
              `INSERT INTO pesajes
                 (fecha, hora, lote_id, descripcion, nombre_producto,
                  tipo_movimiento, transacc, peso_bruto, peso_tara,
                  destare_empaque, bodega, observaciones)
               VALUES ($1,$2,$3,$4,$4,'ENTRADA','TRILLA_SUBPROD',$5,'0','0','SUBPRODUCTOS',$6)`,
              [
                str(fecha_trilla), str(hora_trilla), lote_id,
                str(sp.subproducto), String(kNum),
                `Subproducto de trilla - Lote ${lote_id}`
              ]
            );
          }
        }
      }

      // Registrar SALIDA del paddy consumido en trilla (descuenta el paddy del inventario)
      const { rows: pesajeEntrada } = await pool.query(
        `SELECT codigo, descripcion, nombre_producto, bodega, presentacion,
                peso_bruto, peso_tara, destare_empaque, propietario, nit_propietario
         FROM pesajes
         WHERE lote_id = $1
           AND (transacc IS NULL OR transacc NOT IN ('TRILLA_SUBPROD','TRILLA_CONSUMO'))
           AND (tipo_movimiento IS NULL OR tipo_movimiento = 'ENTRADA')
         ORDER BY id ASC LIMIT 1`,
        [lote_id]
      );
      if (pesajeEntrada.length > 0) {
        const p = pesajeEntrada[0];
        await pool.query(
          `INSERT INTO pesajes
             (tipo_movimiento, transacc, lote_id, fecha, hora,
              codigo, descripcion, nombre_producto, bodega, presentacion,
              peso_bruto, peso_tara, destare_empaque,
              propietario, nit_propietario, observaciones)
           VALUES ('SALIDA','TRILLA_CONSUMO',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            lote_id, str(fecha_trilla), str(hora_trilla),
            p.codigo, p.descripcion, p.nombre_producto || p.descripcion,
            p.bodega, p.presentacion,
            p.peso_bruto, p.peso_tara, p.destare_empaque || '0',
            p.propietario, p.nit_propietario,
            `Materia prima consumida en trilla - Lote ${lote_id}`,
          ]
        );
      }

      // Actualizar el producto resultante en previos (para reportes/consulta).
      // OJO: no renombrar el pesaje de ENTRADA original — su descripcion/codigo
      // identifican la materia prima (ej. Paddy Verde) y deben coincidir con los
      // de la SALIDA de TRILLA_CONSUMO para que el inventario los cancele a cero;
      // si se renombra solo la entrada, el paddy queda con salidas sin su entrada
      // correspondiente (stock negativo) y el producto molido queda mezclado con
      // el peso crudo original.
      const prodFinal = productoResultante(subproductos);
      if (prodFinal) {
        await pool.query(
          'UPDATE previos SET producto = $1 WHERE lote_id = $2',
          [prodFinal, lote_id]
        );
      }

      res.status(201).json({ message: 'Trilla registrada. Estado → PROCESADO', trilla: rows[0] });
    } catch (err) {
      console.error('Error registrarTrilla:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /* PUT /api/trillas/:lote_id — actualizar (solo admin) */
  async actualizarTrilla(req, res) {
    try {
      const { lote_id } = req.params;
      const {
        fecha_trilla, hora_trilla,
        rendimiento, descuento_humedad, descuento_impureza,
        descuento_grano_partido, kilos_procesados, kilos_resultado,
        analista, observaciones,
        presentacion, cantidad_salida, fecha_vencimiento,
        humedad_salida, grano_partido_salida, grano_yesado_salida,
        grano_dano_hongo_salida, grano_dano_calor_salida,
        semillas_obj_salida, impureza_salida,
        olor_resultado, sabor_resultado, color_resultado,
        nivel_infestacion_resultado, materias_extranas_resultado,
        subproductos,
        motivo_modificacion
      } = req.body;

      if (!motivo_modificacion || !motivo_modificacion.trim()) {
        return res.status(400).json({ error: 'El motivo de modificación es obligatorio' });
      }

      const modificado_por = req.user.usuario;

      // Guardar kilos_resultado_original solo en la primera modificación
      const { rows: currentRows } = await pool.query(
        'SELECT kilos_resultado, kilos_resultado_original FROM trillas WHERE lote_id = $1',
        [lote_id]
      );
      if (!currentRows.length) return res.status(404).json({ error: 'Registro de trilla no encontrado' });

      const kilosOriginalAGuardar = currentRows[0].kilos_resultado_original !== null
        ? currentRows[0].kilos_resultado_original  // ya fue modificado antes, conservar el original
        : currentRows[0].kilos_resultado;          // primera modificación: guardar valor actual

      const { rows } = await pool.query(
        `UPDATE trillas SET
           fecha_trilla=$1, hora_trilla=$2, rendimiento=$3,
           descuento_humedad=$4, descuento_impureza=$5,
           descuento_grano_partido=$6, kilos_procesados=$7,
           kilos_resultado=$8, analista=$9, observaciones=$10,
           presentacion=$12, cantidad_salida=$13, fecha_vencimiento=$14,
           humedad_salida=$15, grano_partido_salida=$16, grano_yesado_salida=$17,
           grano_dano_hongo_salida=$18, grano_dano_calor_salida=$19,
           semillas_obj_salida=$20, impureza_salida=$21,
           olor_resultado=$22, sabor_resultado=$23, color_resultado=$24,
           nivel_infestacion_resultado=$25, materias_extranas_resultado=$26,
           kilos_resultado_original=$27, modificado_por=$28,
           fecha_modificacion=NOW(), motivo_modificacion=$29
         WHERE lote_id=$11 RETURNING *`,
        [
          str(fecha_trilla), str(hora_trilla),
          num(rendimiento), num(descuento_humedad), num(descuento_impureza),
          num(descuento_grano_partido), num(kilos_procesados), num(kilos_resultado),
          str(analista), str(observaciones),
          lote_id,
          str(presentacion), str(cantidad_salida), str(fecha_vencimiento),
          num(humedad_salida), num(grano_partido_salida), num(grano_yesado_salida),
          num(grano_dano_hongo_salida), num(grano_dano_calor_salida),
          num(semillas_obj_salida), num(impureza_salida),
          str(olor_resultado), str(sabor_resultado), str(color_resultado),
          str(nivel_infestacion_resultado), str(materias_extranas_resultado),
          kilosOriginalAGuardar, modificado_por,
          motivo_modificacion.trim()
        ]
      );

      // Reemplazar subproductos si se enviaron
      if (Array.isArray(subproductos)) {
        await pool.query('DELETE FROM trilla_subproductos WHERE lote_id = $1', [lote_id]);
        // Eliminar entradas de inventario previas generadas por esta trilla
        await pool.query(
          "DELETE FROM pesajes WHERE lote_id = $1 AND transacc = 'TRILLA_SUBPROD'",
          [lote_id]
        );
        for (const sp of subproductos) {
          const kilosVal = (sp.kilos === '' || sp.kilos === null || sp.kilos === undefined) ? 0 : sp.kilos;
          await pool.query(
            'INSERT INTO trilla_subproductos (lote_id, subproducto, kilos) VALUES ($1,$2,$3)',
            [lote_id, str(sp.subproducto), kilosVal]
          );
          // Registrar en inventario como ENTRADA si tiene kilos > 0
          const kNum = parseFloat(kilosVal) || 0;
          if (kNum > 0) {
            await pool.query(
              `INSERT INTO pesajes
                 (fecha, hora, lote_id, descripcion, nombre_producto,
                  tipo_movimiento, transacc, peso_bruto, peso_tara,
                  destare_empaque, bodega, observaciones)
               VALUES ($1,$2,$3,$4,$4,'ENTRADA','TRILLA_SUBPROD',$5,'0','0','SUBPRODUCTOS',$6)`,
              [
                str(fecha_trilla), str(hora_trilla), lote_id,
                str(sp.subproducto), String(kNum),
                `Subproducto de trilla - Lote ${lote_id}`
              ]
            );
          }
        }

        // Actualizar producto en previos al resultado de la trilla.
        // No renombrar el pesaje de ENTRADA original (ver nota en registrarTrilla).
        const prodFinal = productoResultante(subproductos);
        if (prodFinal) {
          await pool.query(
            'UPDATE previos SET producto = $1 WHERE lote_id = $2',
            [prodFinal, lote_id]
          );
        }
      }

      res.json({ message: 'Trilla actualizada', trilla: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /* GET /api/trillas/certificados?lote_id= */
  async getCertificados(req, res) {
    try {
      const { lote_id } = req.query;
      let sql = 'SELECT * FROM certificados';
      const params = [];
      if (lote_id) {
        sql += ' WHERE lote_id = $1';
        params.push(lote_id);
      }
      sql += ' ORDER BY id DESC';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* PATCH /api/trillas/:lote_id/certificado — actualizar campos del certificado de calidad */
  async actualizarCertificado(req, res) {
    try {
      const { lote_id } = req.params;
      const {
        presentacion, cantidad_salida, fecha_vencimiento,
        grano_yesado_salida, grano_dano_hongo_salida, grano_dano_calor_salida,
        semillas_obj_salida, olor_resultado, sabor_resultado, color_resultado,
        nivel_infestacion_resultado, materias_extranas_resultado,
      } = req.body;

      const { rows: existing } = await pool.query(
        'SELECT id FROM trillas WHERE lote_id = $1', [lote_id]
      );
      if (!existing.length)
        return res.status(404).json({ error: `No existe registro de trilla para el lote ${lote_id}` });

      const { rows } = await pool.query(
        `UPDATE trillas SET
           presentacion=$1, cantidad_salida=$2, fecha_vencimiento=$3,
           grano_yesado_salida=$4, grano_dano_hongo_salida=$5, grano_dano_calor_salida=$6,
           semillas_obj_salida=$7, olor_resultado=$8, sabor_resultado=$9,
           color_resultado=$10, nivel_infestacion_resultado=$11, materias_extranas_resultado=$12
         WHERE lote_id=$13 RETURNING *`,
        [
          str(presentacion), str(cantidad_salida), str(fecha_vencimiento),
          num(grano_yesado_salida), num(grano_dano_hongo_salida), num(grano_dano_calor_salida),
          num(semillas_obj_salida), str(olor_resultado), str(sabor_resultado),
          str(color_resultado), str(nivel_infestacion_resultado), str(materias_extranas_resultado),
          lote_id,
        ]
      );
      res.json({ message: 'Certificado actualizado', trilla: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /* POST /api/trillas/certificados — guardar registro de emisión */
  async guardarCertificado(req, res) {
    const client = await pool.connect();
    try {
      const { lote_id, fecha_emision, usuario } = req.body;
      if (!lote_id) return res.status(400).json({ error: 'lote_id es obligatorio' });

      await client.query('BEGIN');

      // Bloquea la tabla de certificados hasta el COMMIT para evitar que dos
      // solicitudes concurrentes lean el mismo último número y generen duplicados.
      const { rows: last } = await client.query(
        `SELECT numero_certificado FROM certificados
         WHERE numero_certificado LIKE 'CC - %'
         ORDER BY id DESC LIMIT 1 FOR UPDATE`
      );
      let siguiente = 1;
      if (last.length) {
        const n = parseInt(last[0].numero_certificado.replace('CC - ', '').trim(), 10);
        if (!isNaN(n)) siguiente = n + 1;
      }
      const numero_certificado = `CC - ${String(siguiente).padStart(5, '0')}`;

      const { rows } = await client.query(
        `INSERT INTO certificados (lote_id, fecha_emision, numero_certificado, usuario)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [lote_id, str(fecha_emision), numero_certificado, str(usuario)]
      );

      await client.query('COMMIT');
      res.status(201).json({ message: 'Certificado registrado', certificado: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error guardarCertificado:', err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  },
};

module.exports = TrillaController;
