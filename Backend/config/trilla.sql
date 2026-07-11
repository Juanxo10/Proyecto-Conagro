-- =====================================================
-- MÓDULO TRILLA & CERTIFICADOS DE CALIDAD
-- Ejecutar en PostgreSQL sobre la base proyectoconagro
-- =====================================================

CREATE TABLE IF NOT EXISTS trillas (
  id                          SERIAL PRIMARY KEY,
  lote_id                     VARCHAR(50)  UNIQUE NOT NULL,

  -- Procesamiento
  fecha_trilla                VARCHAR(20),
  hora_trilla                 VARCHAR(10),
  rendimiento                 NUMERIC(8,4),
  descuento_humedad           NUMERIC(14,2),
  descuento_impureza          NUMERIC(14,2),
  descuento_grano_partido     NUMERIC(14,2),
  kilos_procesados            NUMERIC(14,2),
  kilos_resultado             NUMERIC(14,2),
  analista                    VARCHAR(150),
  observaciones               TEXT,
  estado                      VARCHAR(20)  DEFAULT 'PROCESADO',

  -- Calidad salida — Físicos
  presentacion                VARCHAR(100),
  cantidad_salida             VARCHAR(100),
  fecha_vencimiento           VARCHAR(20),
  humedad_salida              NUMERIC(6,2),
  grano_partido_salida        NUMERIC(6,2),
  grano_yesado_salida         NUMERIC(6,2),
  grano_dano_hongo_salida     NUMERIC(6,2),
  grano_dano_calor_salida     NUMERIC(6,2),
  semillas_obj_salida         NUMERIC(8,2),
  impureza_salida             NUMERIC(6,2),

  -- Calidad salida — Organolépticos
  olor_resultado              VARCHAR(50)  DEFAULT 'CUMPLE',
  sabor_resultado             VARCHAR(50)  DEFAULT 'CUMPLE',
  color_resultado             VARCHAR(50)  DEFAULT 'CUMPLE',

  -- Calidad salida — Inocuidad
  nivel_infestacion_resultado VARCHAR(50)  DEFAULT 'CUMPLE',
  materias_extranas_resultado VARCHAR(50)  DEFAULT 'CUMPLE',

  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificados (
  id                   SERIAL PRIMARY KEY,
  lote_id              VARCHAR(50) NOT NULL,
  fecha_emision        VARCHAR(20),
  numero_certificado   VARCHAR(30),
  usuario              VARCHAR(100),
  created_at           TIMESTAMP DEFAULT NOW()
);

-- Columna lote_id en pesajes (si no existe)
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS lote_id VARCHAR(50);
-- Índice para búsqueda por lote_id
CREATE INDEX IF NOT EXISTS idx_pesajes_lote_id ON pesajes(lote_id);

-- =====================================================
-- TRAZABILIDAD DE MODIFICACIONES EN TRILLAS
-- =====================================================
ALTER TABLE trillas ADD COLUMN IF NOT EXISTS kilos_resultado_original NUMERIC(14,2);
ALTER TABLE trillas ADD COLUMN IF NOT EXISTS modificado_por           VARCHAR(150);
ALTER TABLE trillas ADD COLUMN IF NOT EXISTS fecha_modificacion       TIMESTAMPTZ;
ALTER TABLE trillas ADD COLUMN IF NOT EXISTS motivo_modificacion      TEXT;
