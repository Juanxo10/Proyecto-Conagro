-- =====================================================
-- RESET COMPLETO DE TABLAS — PROYECTO CONAGRO
-- ¡ADVERTENCIA! ELIMINA TODOS LOS DATOS EXISTENTES.
-- Ejecutar UNA SOLA VEZ en pgAdmin cuando se necesite
-- reconstruir el esquema desde cero.
-- =====================================================

-- Extensión necesaria para cifrar contraseñas con bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS certificados  CASCADE;
DROP TABLE IF EXISTS trillas        CASCADE;
DROP TABLE IF EXISTS pesajes        CASCADE;
DROP TABLE IF EXISTS previos        CASCADE;
DROP TABLE IF EXISTS vehiculos      CASCADE;
DROP TABLE IF EXISTS usuarios       CASCADE;

-- ─────────────────────────────────────────────────────
-- USUARIOS  (roles: 'admin' | 'empleado')
-- Contraseñas cifradas con bcrypt (cost=12) via pgcrypto
-- ─────────────────────────────────────────────────────
CREATE TABLE usuarios (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  usuario    VARCHAR(80)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  rol        VARCHAR(20)  NOT NULL DEFAULT 'empleado'
               CHECK (rol IN ('admin', 'empleado')),
  activo     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Usuarios por defecto con contraseñas cifradas (bcrypt cost 12)
INSERT INTO usuarios (nombre, usuario, password, rol) VALUES
  ('Administrador', 'admin',      crypt('admin123', gen_salt('bf', 12)), 'admin'),
  ('Supervisor',    'supervisor', crypt('super456', gen_salt('bf', 12)), 'admin'),
  ('Empleado Demo', 'empleado1',  crypt('emp789',   gen_salt('bf', 12)), 'empleado');

-- ─────────────────────────────────────────────────────
-- VEHÍCULOS
-- ─────────────────────────────────────────────────────
CREATE TABLE vehiculos (
  id                 SERIAL PRIMARY KEY,
  placa              VARCHAR(10)  NOT NULL UNIQUE,
  tipo               VARCHAR(50),
  marca              VARCHAR(60),
  modelo             VARCHAR(60),
  motor              VARCHAR(60),
  chasis             VARCHAR(60),
  color              VARCHAR(30),
  empresa            VARCHAR(120),
  conductor_cedula   VARCHAR(20),
  conductor_nombre   VARCHAR(150),
  propietario_cedula VARCHAR(20),
  propietario_nombre VARCHAR(150),
  telefono           VARCHAR(20),
  centro_costo       VARCHAR(80),
  alerta             TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- PREVIOS  (fecha como DATE; el frontend envía ISO yyyy-mm-dd)
-- ─────────────────────────────────────────────────────
CREATE TABLE previos (
  id                 SERIAL PRIMARY KEY,
  lote_id            VARCHAR(20)  NOT NULL UNIQUE,
  fecha              DATE         NOT NULL,
  propietario        VARCHAR(150),
  cedula_nit         VARCHAR(30),
  placa              VARCHAR(10),
  peso_bruto         NUMERIC(14,2) DEFAULT 0,
  peso_tara          NUMERIC(14,2) DEFAULT 0,
  peso_neto          NUMERIC(14,2) GENERATED ALWAYS AS (peso_bruto - peso_tara) STORED,
  humedad_s          NUMERIC(6,2),
  humedad_l          NUMERIC(6,2),
  impureza           NUMERIC(6,2),
  nombre_conductor   VARCHAR(150),
  cedula_conductor   VARCHAR(20),
  producto           VARCHAR(150),
  estado             VARCHAR(20)  DEFAULT 'PENDIENTE',
  created_at         TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- PESAJES  (fecha como VARCHAR porque el frontend envía dd/mm/yyyy)
-- ─────────────────────────────────────────────────────
CREATE TABLE pesajes (
  id                         SERIAL PRIMARY KEY,

  -- Cabecera
  fecha                      VARCHAR(20),
  hora                       VARCHAR(10),
  tipo_movimiento            VARCHAR(10)   DEFAULT 'ENTRADA',
  lote_id                    VARCHAR(50),

  -- Vehículo / conductor
  placas                     VARCHAR(10),
  conductor                  VARCHAR(20),
  nombre                     VARCHAR(150),
  propietario                VARCHAR(150),
  empresa                    VARCHAR(120),
  nit_propietario            VARCHAR(20),

  -- Producto
  codigo                     VARCHAR(30),
  subcodigo                  VARCHAR(30),
  descripcion                VARCHAR(200),
  nombre_producto            VARCHAR(150),
  transacc                   VARCHAR(50),
  bodega                     VARCHAR(80),
  cantidad                   NUMERIC(14,2),
  presentacion               VARCHAR(60),
  procedencia                VARCHAR(100),
  division                   VARCHAR(60),
  endoso                     VARCHAR(150),
  tipo                       VARCHAR(10),

  -- Pesos
  numero_tiquete             VARCHAR(30),
  peso_bruto                 NUMERIC(14,2) DEFAULT 0,
  peso_tara                  NUMERIC(14,2) DEFAULT 0,
  destare_empaque            NUMERIC(14,2) DEFAULT 0,

  -- Campos adicionales
  observaciones              TEXT,
  procedencia                VARCHAR(100),

  -- Calidad laboratorio (entrada)
  humedad_inicial            NUMERIC(6,2),
  humedad_final              NUMERIC(6,2),
  impureza_inicial           NUMERIC(6,2),
  impureza_final             NUMERIC(6,2),

  -- Liquidación / compra
  compra                     NUMERIC(16,2),
  kilo                       NUMERIC(16,2),
  pilada                     NUMERIC(16,2),

  created_at                 TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_pesajes_placas  ON pesajes(placas);
CREATE INDEX idx_pesajes_fecha   ON pesajes(fecha);
CREATE INDEX idx_pesajes_lote_id ON pesajes(lote_id);

-- ─────────────────────────────────────────────────────
-- TRILLAS  (incluye todos los campos de calidad de salida)
-- ─────────────────────────────────────────────────────
CREATE TABLE trillas (
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
  presentacion                VARCHAR(80),
  cantidad_salida             VARCHAR(80),
  fecha_vencimiento           VARCHAR(20),
  humedad_salida              NUMERIC(6,2),
  grano_partido_salida        NUMERIC(6,2),
  grano_yesado_salida         NUMERIC(6,2),
  grano_dano_hongo_salida     NUMERIC(6,2),
  grano_dano_calor_salida     NUMERIC(6,2),
  semillas_obj_salida         NUMERIC(8,2),
  impureza_salida             NUMERIC(6,2),

  -- Calidad salida — Organolépticos
  olor_resultado              VARCHAR(20),
  sabor_resultado             VARCHAR(20),
  color_resultado             VARCHAR(20),

  -- Calidad salida — Inocuidad
  nivel_infestacion_resultado VARCHAR(20),
  materias_extranas_resultado VARCHAR(20),

  created_at                  TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- CERTIFICADOS
-- ─────────────────────────────────────────────────────
CREATE TABLE certificados (
  id                   SERIAL PRIMARY KEY,
  lote_id              VARCHAR(50) NOT NULL,
  fecha_emision        VARCHAR(20),
  numero_certificado   VARCHAR(30),
  usuario              VARCHAR(100),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- TRILLA SUBPRODUCTOS  (kilogramos por subproducto/lote)
-- ─────────────────────────────────────────────────────
CREATE TABLE trilla_subproductos (
  id          SERIAL PRIMARY KEY,
  lote_id     VARCHAR(50)  NOT NULL,
  subproducto VARCHAR(120) NOT NULL,
  kilos       NUMERIC(14,2) DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_subproductos_lote ON trilla_subproductos(lote_id);

-- ─────────────────────────────────────────────────────
-- LIQUIDACIONES
-- ─────────────────────────────────────────────────────
CREATE TABLE liquidaciones (
  id                   SERIAL PRIMARY KEY,
  lote_id              VARCHAR(50) NOT NULL UNIQUE,
  fecha_liquidacion    VARCHAR(20),
  -- Calidad usada
  humedad              NUMERIC(6,4),
  impureza             NUMERIC(6,4),
  -- Factores calculados
  factor_humedad       NUMERIC(10,8),
  factor_impureza      NUMERIC(10,8),
  factor_total         NUMERIC(10,8),
  -- Pesos
  peso_neto            NUMERIC(14,2),
  peso_ajustado        NUMERIC(14,4),
  -- Precio y total
  unidad_precio        VARCHAR(10)  DEFAULT 'kg',
  precio               NUMERIC(16,4),
  total_pagar          NUMERIC(18,2),
  -- Extras
  observaciones        TEXT,
  usuario              VARCHAR(100),
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW()
);
