const express = require('express');
const router = express.Router();
const { getHealthStatus } = require('../providers');

router.get('/status', (req, res) => {
  res.json(getHealthStatus());
});

module.exports = router;