'use strict';

const TIPOS_VALIDOS = [
  'Camión', 'Tracto Camión', 'Volqueta', 'Furgón', 'Camioneta',
  'Tractomula', 'Mini Van', 'Bus', 'Otro'
];

const validateVehiculo = (req, res, next) => {
  const { placa, tipo, marca, empresa, conductor_cedula, conductor_nombre } = req.body;
  const errors = [];

  if (!placa || !placa.trim() || placa.trim().length < 3)
    errors.push('Placa inválida (mínimo 3 caracteres)');

  if (!tipo || !TIPOS_VALIDOS.includes(tipo))
    errors.push(`Tipo inválido. Valores: ${TIPOS_VALIDOS.join(', ')}`);

  if (!marca || !marca.trim())
    errors.push('Marca es obligatoria');

  if (!empresa || !empresa.trim())
    errors.push('Empresa es obligatoria');

  if (!conductor_cedula || !conductor_cedula.trim())
    errors.push('Cédula del conductor es obligatoria');

  if (!conductor_nombre || !conductor_nombre.trim())
    errors.push('Nombre del conductor es obligatorio');

  if (errors.length > 0)
    return res.status(400).json({ error: errors.join(', ') });

  req.body.placa = placa.trim().toUpperCase();
  next();
};

module.exports = { validateVehiculo };
