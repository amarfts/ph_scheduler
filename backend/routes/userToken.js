const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { encrypt, decrypt } = require('../utils/encrypt');

const router = express.Router();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function authorizeAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

router.post('/save-token', authenticateToken, authorizeAdmin, (req, res) => {
  const userId = req.user.id;
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  const encryptedToken = encrypt(token);
  db.run(
    `INSERT OR REPLACE INTO user_tokens (userId, encryptedToken) VALUES (?, ?)`,
    [userId, encryptedToken],
    (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save token' });
      res.json({ success: true, message: 'Token saved securely ✅' });
    }
  );
});

router.get('/get-token', authenticateToken, authorizeAdmin, (req, res) => {
  const userId = req.user.id;
  db.get(
    `SELECT encryptedToken FROM user_tokens WHERE userId = ?`,
    [userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch token' });
      if (!row) return res.status(404).json({ token: null });
      try {
        const decrypted = decrypt(row.encryptedToken);
        res.json({ token: decrypted });
      } catch {
        res.status(500).json({ error: 'Decryption error' });
      }
    }
  );
});

module.exports = router;
