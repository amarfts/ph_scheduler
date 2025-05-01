const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }
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

router.post('/add', authenticateToken, authorizeAdmin, (req, res) => {
  let { name, facebookPageId, postingDay, postingFrequency, pharmacyIdForNeighbor, authToken, cookieToken, pageAccessToken, radius, latitude, longitude, address, apiType, location  } = req.body;
  const id = uuidv4();

  if (radius === undefined || radius === null) {
    radius = 1;
  }

  if (!cookieToken) {
    cookieToken = authToken;
  }

  db.run(`
    INSERT INTO pharmacies (id, name, facebookPageId, postingDay, postingFrequency, pharmacyIdForNeighbor, authToken, cookieToken, pageAccessToken, radius, latitude, longitude, address, apiType, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, name, facebookPageId, postingDay, postingFrequency, pharmacyIdForNeighbor, authToken, cookieToken, pageAccessToken, radius, latitude, longitude, address, apiType, location], (err) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to add pharmacy' });
    }
    res.status(201).json({ message: 'Pharmacy added successfully!' });
  });
});


router.get('/list', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM pharmacies`, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to retrieve pharmacies' });
    }
    res.json(rows);
  });
});

router.delete('/delete/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM pharmacies WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to delete pharmacy' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }
    res.json({ message: 'Pharmacy deleted successfully!' });
  });
});

module.exports = router;
