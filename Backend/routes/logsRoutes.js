const express = require('express');
const router  = express.Router();
const LogsController = require('../controllers/logsController');

router.get('/',        LogsController.getAll);
router.get('/stats',   LogsController.getStats);
router.get('/modules', LogsController.getModulos);

module.exports = router;
