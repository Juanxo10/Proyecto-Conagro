-- Tabla de pesajes
-- Ejecutar en PostgreSQL sobre la base de datos proyectoconagro

CREATE TABLE IF NOT EXISTS pesajes (
  id               SERIAL PRIMARY KEY,
  fecha            VARCHAR(20),
  hora             VARCHAR(10),
  placas           VARCHAR(20),
  conductor        VARCHAR(100),
  nombre           VARCHAR(100),
  propietario      VARCHAR(100),
  empresa          VARCHAR(100),
  codigo           VARCHAR(10),
  subcodigo        VARCHAR(10),
  descripcion      VARCHAR(200),
  nit_propietario  VARCHAR(30),
  nombre_producto  VARCHAR(100),
  transacc         VARCHAR(50),
  bodega           VARCHAR(50),
  cantidad         VARCHAR(30),
  peso_bruto       VARCHAR(30),
  peso_tara        VARCHAR(30),
  destare_empaque  VARCHAR(30),
  presentacion     VARCHAR(50),
  division         VARCHAR(50),
  endoso           VARCHAR(100),
  procedencia      VARCHAR(100),
  cultivo_propio   VARCHAR(1),
  bultos_rechazo   VARCHAR(30),
  ubicacion_silo   VARCHAR(100),
  lote_cultivo     VARCHAR(100),
  centro_costos    VARCHAR(100),
  bolsa_agro       VARCHAR(1),
  retencion        VARCHAR(1),
  fomento          VARCHAR(1),
  debe_descargue   VARCHAR(1),
  observaciones    VARCHAR(500),
  humedad_inicial              VARCHAR(20),
  humedad_final                VARCHAR(20),
  impureza_inicial             VARCHAR(20),
  impureza_final               VARCHAR(20),
  yeso_inicial                 VARCHAR(20),
  yeso_final                   VARCHAR(20),
  centro_blanco_inicial        VARCHAR(20),
  centro_blanco_final          VARCHAR(20),
  granos_rojos_inicial         VARCHAR(20),
  granos_rojos_final           VARCHAR(20),
  indice_pilada_inicial        VARCHAR(20),
  indice_pilada_final          VARCHAR(20),
  rendimiento_pilada_inicial   VARCHAR(20),
  rendimiento_pilada_final     VARCHAR(20),
  temperatura                  VARCHAR(20),
  porcentaje_inmadurez         VARCHAR(20),
  olor                         VARCHAR(10),
  analista_laboratorio         VARCHAR(100),
  compra                       VARCHAR(30),
  trece_tres                   VARCHAR(30),
  carga_125k                   VARCHAR(30),
  kilo                         VARCHAR(30),
  velocidad_total_compra       VARCHAR(50),
  factura_venta                VARCHAR(50),
  vr_flete                     VARCHAR(30),
  anticipo                     VARCHAR(30),
  cargo_factor_adic            VARCHAR(30),
  pilada                       VARCHAR(30),
  created_at       TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- EJECUTAR ESTO EN pgAdmin (tabla ya existe en la BD):
-- =====================================================
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS procedencia           VARCHAR(100);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS cultivo_propio        VARCHAR(1);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS bultos_rechazo        VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS ubicacion_silo        VARCHAR(100);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS lote_cultivo          VARCHAR(100);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS centro_costos         VARCHAR(100);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS bolsa_agro            VARCHAR(1);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS retencion             VARCHAR(1);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS fomento               VARCHAR(1);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS debe_descargue        VARCHAR(1);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS observaciones         VARCHAR(500);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS humedad_inicial             VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS humedad_final               VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS impureza_inicial            VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS impureza_final              VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS yeso_inicial                VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS yeso_final                  VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS centro_blanco_inicial       VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS centro_blanco_final         VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS granos_rojos_inicial        VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS granos_rojos_final          VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS indice_pilada_inicial       VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS indice_pilada_final         VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS rendimiento_pilada_inicial  VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS rendimiento_pilada_final    VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS temperatura                 VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS porcentaje_inmadurez        VARCHAR(20);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS olor                        VARCHAR(10);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS analista_laboratorio        VARCHAR(100);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS compra                      VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS trece_tres                  VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS carga_125k                  VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS kilo                        VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS velocidad_total_compra      VARCHAR(50);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS factura_venta               VARCHAR(50);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS vr_flete                    VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS anticipo                    VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS cargo_factor_adic           VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS pilada                      VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS tipo_movimiento             VARCHAR(10) DEFAULT 'ENTRADA';

-- =====================================================
-- TABLA DE INVENTARIO (vista materializada en código)
-- Esta tabla NO es necesaria; el inventario se calcula
-- al vuelo con una query sobre pesajes.
-- =====================================================

-- =====================================================
-- MIGRACIÓN: campos para flujo de pesaje por lote
-- =====================================================
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS lote_id           VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS tipo              VARCHAR(30);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS humedad_inicial   VARCHAR(10);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS impureza_inicial  VARCHAR(10);
ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS observaciones     TEXT;

ALTER TABLE pesajes DROP COLUMN IF EXISTS grano_partido_inicial;
ALTER TABLE pesajes DROP COLUMN IF EXISTS grano_partido_final;

ALTER TABLE previos  ADD COLUMN IF NOT EXISTS estado           VARCHAR(20) DEFAULT 'PENDIENTE';
