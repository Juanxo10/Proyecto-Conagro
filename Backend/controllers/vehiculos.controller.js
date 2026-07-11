'use strict';

const VehiculoModel = require('../models/vehiculos.model');

const VehiculoController = {

  async getAll(req, res) {
    try {
      res.json(await VehiculoModel.findAll());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getById(req, res) {
    try {
      const v = await VehiculoModel.findById(req.params.id);
      if (!v) return res.status(404).json({ error: 'Vehículo no encontrado' });
      res.json(v);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async search(req, res) {
    try {
      const { q = '' } = req.query;
      if (!q.trim()) return res.json([]);
      res.json(await VehiculoModel.search(q.trim()));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getConPesaje(req, res) {
    try {
      res.json(await VehiculoModel.findWithPesaje());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async create(req, res) {
    try {
      const vehiculo = await VehiculoModel.create(req.body);
      res.status(201).json({ message: 'Vehículo creado correctamente', vehiculo });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: `La placa ${req.body.placa} ya está registrada` });
      }
      res.status(500).json({ error: err.message });
    }
  },

  async update(req, res) {
    try {
      const vehiculo = await VehiculoModel.update(req.params.id, req.body);
      if (!vehiculo) return res.status(404).json({ error: 'Vehículo no encontrado' });
      res.json({ message: 'Vehículo actualizado correctamente', vehiculo });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: `La placa ${req.body.placa} ya está registrada` });
      }
      res.status(500).json({ error: err.message });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await VehiculoModel.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Vehículo no encontrado' });
      res.json({ message: `Vehículo ${deleted.placa} eliminado correctamente` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = VehiculoController;
