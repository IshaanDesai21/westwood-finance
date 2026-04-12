const express = require('express');
const router = express.Router();
const { ADMIN_PASSWORD } = require('../config');

// ── POST /api/auth/verify ──────────────────────────────────────────────────
router.post('/verify', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

module.exports = router;
