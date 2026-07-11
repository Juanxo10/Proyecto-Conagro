'use strict';
const pool = require('./config/db');
(async () => {
  try {
    await pool.query(`
      ALTER TABLE trillas
        ADD COLUMN IF NOT EXISTS presentacion                VARCHAR(100),
        ADD COLUMN IF NOT EXISTS cantidad_salida             VARCHAR(100),
        ADD COLUMN IF NOT EXISTS fecha_vencimiento           VARCHAR(20),
        ADD COLUMN IF NOT EXISTS humedad_salida              NUMERIC,
        ADD COLUMN IF NOT EXISTS grano_partido_salida        NUMERIC,
        ADD COLUMN IF NOT EXISTS grano_yesado_salida         NUMERIC,
        ADD COLUMN IF NOT EXISTS grano_dano_hongo_salida     NUMERIC,
        ADD COLUMN IF NOT EXISTS grano_dano_calor_salida     NUMERIC,
        ADD COLUMN IF NOT EXISTS semillas_obj_salida         NUMERIC,
        ADD COLUMN IF NOT EXISTS impureza_salida             NUMERIC,
        ADD COLUMN IF NOT EXISTS olor_resultado              VARCHAR(50) DEFAULT 'CUMPLE',
        ADD COLUMN IF NOT EXISTS sabor_resultado             VARCHAR(50) DEFAULT 'CUMPLE',
        ADD COLUMN IF NOT EXISTS color_resultado             VARCHAR(50) DEFAULT 'CUMPLE',
        ADD COLUMN IF NOT EXISTS nivel_infestacion_resultado VARCHAR(50) DEFAULT 'CUMPLE',
        ADD COLUMN IF NOT EXISTS materias_extranas_resultado VARCHAR(50) DEFAULT 'CUMPLE'
    `);
    console.log('OK - columnas agregadas');
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
