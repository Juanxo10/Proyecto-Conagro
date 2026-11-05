'use strict';

const pool = require('../config/db');

function str(v) { return (v === null || v === undefined || v === '') ? null : String(v).trim(); }
function num(v, fb = null) { return (v === null || v === undefined || v === '') ? fb : Number(v); }

/* Kg de `producto` que la trilla del lote generó y aún no se han despachado */
async function kilosDisponibles(db, lote_id, producto) {
  const { rows } = await db.query(
    `SELECT
       (SELECT COALESCE(SUM(kilos::NUMERIC),0) FROM trilla_subproductos WHERE lote_id=$1 AND subproducto=$2) AS producido,
       (SELECT COALESCE(SUM(COALESCE(peso_bruto::NUMERIC,0)-COALESCE(peso_tara::NUMERIC,0)),0)
          FROM pesajes WHERE lote_id=$1 AND transacc='DESPACHO' AND descripcion=$2) AS despachado`,
    [lote_id, producto]
  );
  return Math.max(0, parseFloat(rows[0].producido) - parseFloat(rows[0].despachado));
}

const DespachoController = {

  /* GET /api/despachos/buscar?q=
     Solo lotes con estado LIQUIDADO (existen en liquidaciones) y aún sin despacho */
  async buscarLiquidados(req, res) {
    try {
      const { q } = req.query;
      let sql = `
        SELECT p.*, l.peso_ajustado, l.total_pagar, l.precio, l.unidad_precio
        FROM previos p
        INNER JOIN liquidaciones l ON l.lote_id = p.lote_id
        LEFT JOIN despachos d ON d.lote_id = p.lote_id
        WHERE d.id IS NULL
          AND p.estado = 'LIQUIDADO'
      `;
      const params = [];
      if (q?.trim()) {
        sql += ' AND (p.lote_id ILIKE $1 OR p.placa ILIKE $1 OR p.propietario ILIKE $1)';
        params.push(`%${q.trim()}%`);
      }
      sql += ' ORDER BY p.id DESC LIMIT 60';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* GET /api/despachos/lote-datos/:lote_id
     Devuelve previo + pesaje + trilla + liquidación para poblar el formulario */
  async getLoteDatos(req, res) {
    try {
      const { lote_id } = req.params;
      const [previoRes, pesajeRes, trillaRes, liqRes] = await Promise.all([
        pool.query('SELECT * FROM previos       WHERE lote_id = $1', [lote_id]),
        pool.query(
          `SELECT * FROM pesajes WHERE lote_id = $1
             AND (transacc IS NULL OR transacc NOT IN ('TRILLA_SUBPROD','TRILLA_CONSUMO'))
           ORDER BY id DESC LIMIT 1`,
          [lote_id]
        ),
        pool.query('SELECT * FROM trillas       WHERE lote_id = $1 ORDER BY id DESC LIMIT 1', [lote_id]),
        pool.query('SELECT * FROM liquidaciones WHERE lote_id = $1 ORDER BY id DESC LIMIT 1', [lote_id]),
      ]);
      const previo = previoRes.rows[0] || null;
      if (!previo) return res.status(404).json({ error: `Lote ${lote_id} no encontrado` });
      const liq = liqRes.rows[0] || null;
      if (!liq) return res.status(400).json({ error: `El lote ${lote_id} no tiene liquidación registrada` });
      // Si hubo trilla se despacha producto molido: el tope es lo que la trilla produjo
      // de ese producto (menos lo ya despachado), no el peso ajustado del paddy.
      let referencia_kg = parseFloat(liq.peso_ajustado) || 0;
      if (trillaRes.rows[0]) {
        referencia_kg = await kilosDisponibles(pool, lote_id, previo.producto);
      }
      res.json({
        previo,
        pesaje:      pesajeRes.rows[0] || null,
        trilla:      trillaRes.rows[0] || null,
        liquidacion: liq,
        referencia_kg,
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* GET /api/despachos/:lote_id — obtener despacho existente */
  async getDespacho(req, res) {
    try {
      const { lote_id } = req.params;
      const { rows } = await pool.query(
        'SELECT * FROM despachos WHERE lote_id = $1 ORDER BY id DESC LIMIT 1',
        [lote_id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Sin despacho para este lote' });
      res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* GET /api/despachos — listar todos */
  async listar(req, res) {
    try {
      const { rows } = await pool.query(`
        SELECT d.*,
               p.propietario, p.placa AS placa_entrada,
               p.producto, p.nombre_conductor AS conductor_entrada,
               l.peso_ajustado, l.total_pagar
        FROM despachos d
        LEFT JOIN previos      p ON p.lote_id = d.lote_id
        LEFT JOIN liquidaciones l ON l.lote_id = d.lote_id
        ORDER BY d.id DESC LIMIT 100
      `);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  /* POST /api/despachos — registrar despacho */
  async registrarDespacho(req, res) {
    const client = await pool.connect();
    try {
      const {
        lote_id,
        fecha_despacho, hora_despacho,
        placa_salida, conductor_salida, cedula_conductor_salida,
        telefono_conductor_salida, empresa_transportadora,
        peso_bruto_salida, peso_tara_salida, peso_neto_salida,
        peso_ajustado_liq,
        producto,
        observaciones, usuario,
      } = req.body;

      if (!lote_id) return res.status(400).json({ error: 'lote_id es obligatorio' });

      await client.query('BEGIN');

      // Verificar que existe liquidación y que el estado sea LIQUIDADO
      const liqCheck = await client.query(
        'SELECT l.id, l.peso_ajustado, p.estado FROM liquidaciones l INNER JOIN previos p ON p.lote_id = l.lote_id WHERE l.lote_id = $1',
        [lote_id]
      );
      if (!liqCheck.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El lote no está liquidado, no puede despacharse' });
      }
      if (liqCheck.rows[0].estado !== 'LIQUIDADO') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `El lote debe estar en estado LIQUIDADO para despacharse (estado actual: ${liqCheck.rows[0].estado})` });
      }

      // Verificar que no fue despachado ya
      const despCheck = await client.query(
        'SELECT id FROM despachos WHERE lote_id = $1',
        [lote_id]
      );
      if (despCheck.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Este lote ya fue despachado' });
      }

      // Validar tope de peso: con trilla, lo producido del producto; sin trilla, el peso ajustado
      const trillaCheck = await client.query('SELECT id FROM trillas WHERE lote_id = $1', [lote_id]);
      const huboTrilla = trillaCheck.rows.length > 0;
      const prodDesp = str(producto);
      let tope = parseFloat(liqCheck.rows[0].peso_ajustado) || 0;
      if (huboTrilla) {
        if (!prodDesp) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'El producto a despachar es obligatorio' });
        }
        const { rows: gen } = await client.query(
          'SELECT 1 FROM trilla_subproductos WHERE lote_id=$1 AND subproducto=$2 AND kilos > 0', [lote_id, prodDesp]
        );
        if (!gen.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `La trilla del lote ${lote_id} no generó "${prodDesp}"` });
        }
        tope = await kilosDisponibles(client, lote_id, prodDesp);
      }
      const pesoAjustado = tope;
      const pesoNetoSal  = parseFloat(peso_neto_salida) || 0;
      if (pesoNetoSal <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El peso neto de salida debe ser mayor a 0' });
      }
      if (pesoNetoSal > pesoAjustado + 0.001) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Peso neto de salida (${pesoNetoSal} kg) excede lo disponible para despachar (${pesoAjustado} kg)`
        });
      }

      // Generar número de despacho correlativo
      const seqRes = await client.query(
        "SELECT COALESCE(MAX(CAST(SUBSTRING(numero_despacho FROM 4) AS INTEGER)), 0) + 1 AS next FROM despachos WHERE numero_despacho ~ '^DSP[0-9]+$'"
      );
      const nextNum = seqRes.rows[0].next;
      const numeroDespacho = `DSP${String(nextNum).padStart(6, '0')}`;

      const diferencia = pesoAjustado - pesoNetoSal;

      const { rows } = await client.query(
        `INSERT INTO despachos (
           numero_despacho, lote_id,
           fecha_despacho, hora_despacho,
           placa_salida, conductor_salida, cedula_conductor_salida,
           telefono_conductor_salida, empresa_transportadora,
           peso_bruto_salida, peso_tara_salida, peso_neto_salida,
           peso_ajustado_liq, diferencia_peso,
           producto, observaciones, usuario
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          numeroDespacho, str(lote_id),
          str(fecha_despacho), str(hora_despacho),
          str(placa_salida), str(conductor_salida), str(cedula_conductor_salida),
          str(telefono_conductor_salida), str(empresa_transportadora),
          num(peso_bruto_salida, 0), num(peso_tara_salida, 0), num(peso_neto_salida, 0),
          num(liqCheck.rows[0].peso_ajustado), diferencia,
          str(producto), str(observaciones), str(usuario),
        ]
      );

      // Actualizar estado del previo a DESPACHADO
      await client.query(
        "UPDATE previos SET estado = 'DESPACHADO' WHERE lote_id = $1",
        [lote_id]
      );

      // ── Insertar movimiento SALIDA en pesajes (descuenta inventario) ──
      // Tomar datos del pesaje de ENTRADA original del lote (excluir subproductos de trilla)
      const pesajeOrig = await client.query(
        `SELECT codigo, descripcion, nombre_producto, bodega, presentacion, propietario, nit_propietario
         FROM pesajes
         WHERE lote_id = $1
           AND (transacc IS NULL OR transacc <> 'TRILLA_SUBPROD')
           AND (tipo_movimiento IS NULL OR tipo_movimiento = 'ENTRADA')
         ORDER BY id ASC LIMIT 1`,
        [lote_id]
      );

      // Si el lote paso por trilla, lo que se despacha es el producto MOLIDO
      // (ej. Arroz blanco tipo 1), no el paddy crudo que entro originalmente
      // — el paddy ya se descuenta del inventario con la SALIDA de
      // TRILLA_CONSUMO. Usar el codigo/descripcion del pesaje de entrada
      // aqui haria que el despacho vuelva a restar del paddy (dejandolo en
      // negativo) y nunca descuente el producto molido realmente enviado.
      if (pesajeOrig.rows.length > 0) {
        const p = pesajeOrig.rows[0];
        const codigoSalida       = huboTrilla ? null : p.codigo;
        const descripcionSalida  = huboTrilla ? str(producto) : p.descripcion;
        const nombreProdSalida   = huboTrilla ? str(producto) : (p.nombre_producto || p.descripcion);
        // Las salidas de trilla viven en la bodega SUBPRODUCTOS (donde entraron)
        const bodegaSalida = huboTrilla ? 'SUBPRODUCTOS' : p.bodega;
        await client.query(
          `INSERT INTO pesajes (
             tipo_movimiento, transacc, lote_id,
             fecha, hora,
             codigo, descripcion, nombre_producto, bodega, presentacion,
             placas, conductor, empresa, propietario, nit_propietario,
             numero_tiquete,
             peso_bruto, peso_tara, destare_empaque,
             observaciones
           ) VALUES (
             'SALIDA', 'DESPACHO', $1,
             $2, $3,
             $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13,
             $14,
             $15, $16, '0',
             $17
           )`,
          [
            str(lote_id),
            str(fecha_despacho), str(hora_despacho),
            codigoSalida, descripcionSalida, nombreProdSalida, bodegaSalida, p.presentacion,
            str(placa_salida), str(conductor_salida), str(empresa_transportadora),
            p.propietario, p.nit_propietario,
            numeroDespacho,
            String(num(peso_bruto_salida, 0)), String(num(peso_tara_salida, 0)),
            str(observaciones),
          ]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Despacho registrado', despacho: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error registrarDespacho:', err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  },
};

module.exports = DespachoController;
