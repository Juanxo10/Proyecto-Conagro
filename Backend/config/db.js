const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 0,        // sin timeout — mantiene el pool activo
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL', err);
});

// Migraciones automáticas — una sentencia por paso
async function runMigrations() {
  const steps = [
    {
      name: 'tabla vehiculos',
      sql: `
        CREATE TABLE IF NOT EXISTS vehiculos (
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
        )
      `
    },
    {
      name: 'tabla pesajes',
      sql: `
        CREATE TABLE IF NOT EXISTS pesajes (
          id                         SERIAL PRIMARY KEY,
          fecha                      VARCHAR(20),
          hora                       VARCHAR(10),
          placas                     VARCHAR(10),
          conductor                  VARCHAR(20),
          nombre                     VARCHAR(150),
          propietario                VARCHAR(150),
          empresa                    VARCHAR(120),
          codigo                     VARCHAR(30),
          subcodigo                  VARCHAR(30),
          descripcion                VARCHAR(200),
          nit_propietario            VARCHAR(20),
          nombre_producto            VARCHAR(150),
          transacc                   VARCHAR(50),
          bodega                     VARCHAR(80),
          cantidad                   NUMERIC(14,2),
          peso_bruto                 NUMERIC(14,2) DEFAULT 0,
          peso_tara                  NUMERIC(14,2) DEFAULT 0,
          destare_empaque            NUMERIC(14,2) DEFAULT 0,
          presentacion               VARCHAR(60),
          division                   VARCHAR(60),
          endoso                     VARCHAR(150),
          tipo                       VARCHAR(10),
          tipo_movimiento            VARCHAR(10)  DEFAULT 'ENTRADA',
          observaciones              TEXT,
          procedencia                VARCHAR(100),
          cultivo_propio             VARCHAR(2)   DEFAULT 'N',
          bultos_rechazo             NUMERIC(10,2),
          ubicacion_silo             VARCHAR(80),
          lote_cultivo               VARCHAR(80),
          centro_costos              VARCHAR(80),
          bolsa_agro                 VARCHAR(2)   DEFAULT 'N',
          retencion                  VARCHAR(2)   DEFAULT 'N',
          fomento                    VARCHAR(2)   DEFAULT 'N',
          debe_descargue             VARCHAR(2)   DEFAULT 'N',
          humedad_inicial            NUMERIC(6,2),
          humedad_final              NUMERIC(6,2),
          impureza_inicial           NUMERIC(6,2),
          impureza_final             NUMERIC(6,2),
          yeso_inicial               NUMERIC(6,2),
          yeso_final                 NUMERIC(6,2),
          centro_blanco_inicial      NUMERIC(6,2),
          centro_blanco_final        NUMERIC(6,2),
          granos_rojos_inicial       NUMERIC(6,2),
          granos_rojos_final         NUMERIC(6,2),
          indice_pilada_inicial      NUMERIC(6,2),
          indice_pilada_final        NUMERIC(6,2),
          rendimiento_pilada_inicial NUMERIC(6,2),
          rendimiento_pilada_final   NUMERIC(6,2),
          temperatura                NUMERIC(6,2),
          porcentaje_inmadurez       NUMERIC(6,2),
          olor                       VARCHAR(2)   DEFAULT 'N',
          analista_laboratorio       VARCHAR(150),
          compra                     NUMERIC(16,2),
          trece_tres                 NUMERIC(16,2),
          carga_125k                 NUMERIC(16,2),
          kilo                       NUMERIC(16,2),
          velocidad_total_compra     NUMERIC(16,2),
          factura_venta              VARCHAR(30),
          vr_flete                   NUMERIC(16,2),
          anticipo                   NUMERIC(16,2),
          cargo_factor_adic          NUMERIC(16,2),
          pilada                     NUMERIC(16,2),
          created_at                 TIMESTAMPTZ  DEFAULT NOW()
        )
      `
    },
    {
      name: 'indice pesajes.placas',
      sql: `CREATE INDEX IF NOT EXISTS idx_pesajes_placas ON pesajes(placas)`
    },
    {
      name: 'indice pesajes.fecha',
      sql: `CREATE INDEX IF NOT EXISTS idx_pesajes_fecha  ON pesajes(fecha)`
    },
    {
      name: 'columna lote_id en pesajes',
      sql: `ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS lote_id VARCHAR(50)`
    },
    {
      name: 'columna numero_tiquete en pesajes',
      sql: `ALTER TABLE pesajes ADD COLUMN IF NOT EXISTS numero_tiquete VARCHAR(30)`
    },
    {
      name: 'quitar columnas grano_partido en pesajes',
      sql: `ALTER TABLE pesajes DROP COLUMN IF EXISTS grano_partido_inicial, DROP COLUMN IF EXISTS grano_partido_final`
    },
    {
      name: 'indice pesajes.lote_id',
      sql: `CREATE INDEX IF NOT EXISTS idx_pesajes_lote_id ON pesajes(lote_id)`
    },
    {
      name: 'tabla trillas',
      sql: `
        CREATE TABLE IF NOT EXISTS trillas (
          id                      SERIAL PRIMARY KEY,
          lote_id                 VARCHAR(50) UNIQUE NOT NULL,
          fecha_trilla            VARCHAR(20),
          hora_trilla             VARCHAR(10),
          rendimiento             NUMERIC,
          descuento_humedad       NUMERIC,
          descuento_impureza      NUMERIC,
          descuento_grano_partido NUMERIC,
          kilos_procesados        NUMERIC,
          kilos_resultado         NUMERIC,
          analista                VARCHAR(100),
          observaciones           VARCHAR(500),
          estado                  VARCHAR(20) DEFAULT 'PROCESADO',
          created_at              TIMESTAMP DEFAULT NOW()
        )
      `
    },
    {
      name: 'tabla certificados',
      sql: `
        CREATE TABLE IF NOT EXISTS certificados (
          id                   SERIAL PRIMARY KEY,
          lote_id              VARCHAR(50) NOT NULL,
          fecha_emision        VARCHAR(20),
          numero_certificado   VARCHAR(30),
          usuario              VARCHAR(100),
          created_at           TIMESTAMP DEFAULT NOW()
        )
      `
    },
    {
      name: 'trilla columnas calidad salida',
      sql: `ALTER TABLE trillas
        ADD COLUMN IF NOT EXISTS presentacion               VARCHAR(80),
        ADD COLUMN IF NOT EXISTS cantidad_salida            VARCHAR(80),
        ADD COLUMN IF NOT EXISTS fecha_vencimiento          VARCHAR(20),
        ADD COLUMN IF NOT EXISTS humedad_salida             NUMERIC(6,2),
        ADD COLUMN IF NOT EXISTS grano_partido_salida       NUMERIC(6,2),
        ADD COLUMN IF NOT EXISTS grano_yesado_salida        NUMERIC(6,2),
        ADD COLUMN IF NOT EXISTS grano_dano_hongo_salida    NUMERIC(6,2),
        ADD COLUMN IF NOT EXISTS grano_dano_calor_salida    NUMERIC(6,2),
        ADD COLUMN IF NOT EXISTS semillas_obj_salida        NUMERIC(8,2),
        ADD COLUMN IF NOT EXISTS impureza_salida            NUMERIC(6,2),
        ADD COLUMN IF NOT EXISTS olor_resultado             VARCHAR(20),
        ADD COLUMN IF NOT EXISTS sabor_resultado            VARCHAR(20),
        ADD COLUMN IF NOT EXISTS color_resultado            VARCHAR(20),
        ADD COLUMN IF NOT EXISTS nivel_infestacion_resultado VARCHAR(20),
        ADD COLUMN IF NOT EXISTS materias_extranas_resultado VARCHAR(20)`
    },
    {
      name: 'tabla previos',
      sql: `
        CREATE TABLE IF NOT EXISTS previos (
          id                 SERIAL PRIMARY KEY,
          lote_id            VARCHAR(20) NOT NULL UNIQUE,
          fecha              DATE        NOT NULL,
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
          created_at         TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'tabla liquidaciones',
      sql: `
        CREATE TABLE IF NOT EXISTS liquidaciones (
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
          -- Observaciones
          observaciones        TEXT,
          usuario              VARCHAR(100),
          created_at           TIMESTAMPTZ  DEFAULT NOW(),
          updated_at           TIMESTAMPTZ  DEFAULT NOW()
        )
      `
    },
    {
      name: 'estado en previos',
      sql: `ALTER TABLE previos ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'PENDIENTE'`
    },
    {
      name: 'tabla despachos',
      sql: `
        CREATE TABLE IF NOT EXISTS despachos (
          id                       SERIAL PRIMARY KEY,
          numero_despacho          VARCHAR(30) UNIQUE,
          lote_id                  VARCHAR(50) NOT NULL UNIQUE,
          fecha_despacho           VARCHAR(20),
          hora_despacho            VARCHAR(10),
          -- Transporte de salida
          placa_salida             VARCHAR(10),
          conductor_salida         VARCHAR(150),
          cedula_conductor_salida  VARCHAR(20),
          telefono_conductor_salida VARCHAR(20),
          empresa_transportadora   VARCHAR(150),
          -- Pesaje de salida
          peso_bruto_salida        NUMERIC(14,2) DEFAULT 0,
          peso_tara_salida         NUMERIC(14,2) DEFAULT 0,
          peso_neto_salida         NUMERIC(14,2) DEFAULT 0,
          -- Referencia al peso ajustado de liquidación
          peso_ajustado_liq        NUMERIC(14,4),
          diferencia_peso          NUMERIC(14,4),
          -- Otros
          producto                 VARCHAR(150),
          observaciones            TEXT,
          usuario                  VARCHAR(100),
          created_at               TIMESTAMPTZ DEFAULT NOW()
        )
      `
    },
    {
      name: 'indice despachos.lote_id',
      sql: `CREATE INDEX IF NOT EXISTS idx_despachos_lote_id ON despachos(lote_id)`
    },
    {
      name: 'tabla usuarios',
      sql: `
        CREATE TABLE IF NOT EXISTS usuarios (
          id         SERIAL PRIMARY KEY,
          nombre     VARCHAR(150) NOT NULL,
          usuario    VARCHAR(80)  NOT NULL UNIQUE,
          password   VARCHAR(255) NOT NULL,
          rol        VARCHAR(20)  NOT NULL DEFAULT 'empleado'
                       CHECK (rol IN ('admin', 'empleado')),
          activo     BOOLEAN      NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ  DEFAULT NOW()
        )
      `
    },
    {
      name: 'tabla activity_logs',
      sql: `
        CREATE TABLE IF NOT EXISTS activity_logs (
          id          SERIAL PRIMARY KEY,
          usuario_id  INTEGER,
          usuario     VARCHAR(80),
          nombre      VARCHAR(150),
          rol         VARCHAR(20),
          accion      VARCHAR(30)  NOT NULL,
          modulo      VARCHAR(60)  NOT NULL,
          descripcion TEXT,
          ip          VARCHAR(45),
          metodo      VARCHAR(10),
          ruta        VARCHAR(255),
          estado      SMALLINT,
          created_at  TIMESTAMPTZ  DEFAULT NOW()
        )
      `
    },
    {
      name: 'indice activity_logs.usuario',
      sql: `CREATE INDEX IF NOT EXISTS idx_logs_usuario ON activity_logs(usuario)`
    },
    {
      name: 'indice activity_logs.created_at',
      sql: `CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs(created_at DESC)`
    },
    {
      name: 'tabla trilla_subproductos',
      sql: `
        CREATE TABLE IF NOT EXISTS trilla_subproductos (
          id          SERIAL PRIMARY KEY,
          lote_id     VARCHAR(50)   NOT NULL,
          subproducto VARCHAR(120)  NOT NULL,
          kilos       NUMERIC(14,2) DEFAULT 0,
          created_at  TIMESTAMPTZ   DEFAULT NOW()
        )
      `
    },
    {
      name: 'indice trilla_subproductos.lote_id',
      sql: `CREATE INDEX IF NOT EXISTS idx_subproductos_lote ON trilla_subproductos(lote_id)`
    },
    {
      name: 'trilla columnas trazabilidad modificaciones',
      sql: `ALTER TABLE trillas
        ADD COLUMN IF NOT EXISTS kilos_resultado_original NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS modificado_por           VARCHAR(150),
        ADD COLUMN IF NOT EXISTS fecha_modificacion       TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS motivo_modificacion      TEXT`
    }
  ];

  for (const step of steps) {
    try {
      await pool.query(step.sql);
      console.log(`✔ Migración OK: ${step.name}`);
    } catch (err) {
      console.warn(`⚠ Migración omitida (${step.name}): ${err.message}`);
    }
  }
}

// Inserta usuarios por defecto con contraseñas cifradas con bcrypt
async function seedUsuarios() {
  const ROUNDS = 12;

  const usuarios = [
    { nombre: 'Administrador',  usuario: 'admin',      password: 'admin123',   rol: 'admin'    },
    { nombre: 'Supervisor',     usuario: 'supervisor', password: 'super456',   rol: 'admin'    },
    { nombre: 'Empleado Demo',  usuario: 'empleado1',  password: 'emp789',     rol: 'empleado' },
  ];

  for (const u of usuarios) {
    try {
      const existe = await pool.query(
        'SELECT id FROM usuarios WHERE usuario = $1', [u.usuario]
      );
      if (existe.rows.length > 0) {
        console.log(`⏭ Seed omitido (ya existe): ${u.usuario}`);
        continue;
      }
      const hash = await bcrypt.hash(u.password, ROUNDS);
      await pool.query(
        `INSERT INTO usuarios (nombre, usuario, password, rol) VALUES ($1, $2, $3, $4)`,
        [u.nombre, u.usuario, hash, u.rol]
      );
      console.log(`✔ Seed OK: usuario '${u.usuario}' (${u.rol})`);
    } catch (err) {
      console.warn(`⚠ Seed omitido (${u.usuario}): ${err.message}`);
    }
  }
}

const dbReady = runMigrations().then(seedUsuarios);

module.exports = pool;
module.exports.dbReady = dbReady;