const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const logs = await db.listAudit({
      action: req.query.action,
      success: req.query.success,
      email: req.query.email
    });
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
