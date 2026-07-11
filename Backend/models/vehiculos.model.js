'use strict';

const pool = require('../config/db');

const VehiculoModel = {

  async findAll() {
    const { rows } = await pool.query(
      'SELECT * FROM vehiculos ORDER BY id DESC'
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM vehiculos WHERE id = $1', [id]
    );
    return rows[0] || null;
  },

  async search(q) {
    const { rows } = await pool.query(
      `SELECT * FROM vehiculos
       WHERE placa ILIKE $1
       ORDER BY placa LIMIT 15`,
      [`%${q}%`]
    );
    return rows;
  },

  async findWithPesaje() {
    const { rows } = await pool.query(`
      SELECT DISTINCT v.placa, v.conductor_cedula, v.conductor_nombre,
             v.propietario_nombre, v.empresa
      FROM vehiculos v
      INNER JOIN pesajes p ON p.placas = v.placa
      ORDER BY v.placa ASC
    `);
    return rows;
  },

  async create(data) {
    const {
      placa, tipo, marca, modelo, motor, chasis, color, empresa,
      conductor_cedula, conductor_nombre,
      propietario_cedula, propietario_nombre,
      telefono, centro_costo, alerta
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO vehiculos
         (placa, tipo, marca, modelo, motor, chasis, color, empresa,
          conductor_cedula, conductor_nombre,
          propietario_cedula, propietario_nombre,
          telefono, centro_costo, alerta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        placa, tipo, marca, modelo, motor, chasis, color, empresa,
        conductor_cedula, conductor_nombre,
        propietario_cedula, propietario_nombre,
        telefono, centro_costo, alerta
      ]
    );
    return rows[0];
  },

  async update(id, data) {
    const {
      placa, tipo, marca, modelo, motor, chasis, color, empresa,
      conductor_cedula, conductor_nombre,
      propietario_cedula, propietario_nombre,
      telefono, centro_costo, alerta
    } = data;

    const { rows } = await pool.query(
      `UPDATE vehiculos SET
         placa=$1, tipo=$2, marca=$3, modelo=$4, motor=$5, chasis=$6,
         color=$7, empresa=$8,
         conductor_cedula=$9,  conductor_nombre=$10,
         propietario_cedula=$11, propietario_nombre=$12,
         telefono=$13, centro_costo=$14, alerta=$15,
         updated_at=NOW()
       WHERE id=$16 RETURNING *`,
      [
        placa, tipo, marca, modelo, motor, chasis, color, empresa,
        conductor_cedula, conductor_nombre,
        propietario_cedula, propietario_nombre,
        telefono, centro_costo, alerta, id
      ]
    );
    return rows[0] || null;
  },

  async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM vehiculos WHERE id = $1 RETURNING placa', [id]
    );
    return rows[0] || null;
  }
};

module.exports = VehiculoModel;
