/**
 * fix_trilla_consumo.js
 * 
 * Fix retroactivo: para cada lote con trilla registrada pero sin SALIDA TRILLA_CONSUMO,
 * inserta la SALIDA del paddy consumido en trilla.
 * 
 * El pesaje original ya fue renombrado al producto resultante (ej. "Arroz blanco tipo 1"),
 * así que la SALIDA cancela ese ENTRADA, dejando solo los TRILLA_SUBPROD como inventario real.
 * 
 * Uso: cd Backend && node fix_trilla_consumo.js
 */

const pool = require('./config/db');

async function fixTrillasConsumo() {
  const client = await pool.connect();
  try {
    // Lotes que tienen trilla pero no tienen TRILLA_CONSUMO en pesajes
    const { rows: lotesSinConsumo } = await client.query(`
      SELECT t.lote_id, t.fecha_trilla, t.hora_trilla
      FROM trillas t
      WHERE NOT EXISTS (
        SELECT 1 FROM pesajes p
        WHERE p.lote_id = t.lote_id AND p.transacc = 'TRILLA_CONSUMO'
      )
      ORDER BY t.lote_id
    `);

    if (lotesSinConsumo.length === 0) {
      console.log('No hay lotes pendientes de fix.');
      return;
    }

    console.log(`Lotes a corregir: ${lotesSinConsumo.length}`);

    for (const { lote_id, fecha_trilla, hora_trilla } of lotesSinConsumo) {
      // Buscar el pesaje de ENTRADA original (ya fue renombrado al producto resultante)
      const { rows: pesajes } = await client.query(`
        SELECT codigo, descripcion, nombre_producto, bodega, presentacion,
               peso_bruto, peso_tara, destare_empaque, propietario, nit_propietario
        FROM pesajes
        WHERE lote_id = $1
          AND (transacc IS NULL OR transacc NOT IN ('TRILLA_SUBPROD','TRILLA_CONSUMO'))
          AND (tipo_movimiento IS NULL OR tipo_movimiento = 'ENTRADA')
        ORDER BY id ASC LIMIT 1
      `, [lote_id]);

      if (pesajes.length === 0) {
        console.log(`  [${lote_id}] Sin pesaje de entrada encontrado — omitido`);
        continue;
      }

      const p = pesajes[0];
      await client.query(`
        INSERT INTO pesajes
          (tipo_movimiento, transacc, lote_id, fecha, hora,
           codigo, descripcion, nombre_producto, bodega, presentacion,
           peso_bruto, peso_tara, destare_empaque,
           propietario, nit_propietario, observaciones)
        VALUES ('SALIDA','TRILLA_CONSUMO',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `, [
        lote_id,
        fecha_trilla ? (fecha_trilla instanceof Date ? fecha_trilla.toISOString().slice(0, 10) : String(fecha_trilla).slice(0, 10)) : null,
        hora_trilla || '00:00',
        p.codigo, p.descripcion, p.nombre_producto || p.descripcion,
        p.bodega, p.presentacion,
        p.peso_bruto, p.peso_tara, p.destare_empaque || '0',
        p.propietario, p.nit_propietario,
        `Materia prima consumida en trilla - Lote ${lote_id}`,
      ]);

      console.log(`  [${lote_id}] SALIDA TRILLA_CONSUMO insertada — producto: "${p.descripcion}", peso: ${p.peso_bruto}`);
    }

    console.log('Fix completado.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixTrillasConsumo();
