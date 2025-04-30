const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database'); 
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/login', (req, res) => {
  console.log("🚨 req.body received:", req.body);
  if (!req.body || !req.body.username || !req.body.password) {
    return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });
  }
  
  const { username, password } = req.body;
  
  
    if (!username || !password) return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });
  
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
      if (err) {
        console.error('❌ Database error:', err.message);
        return res.status(500).json({ error: "Erreur serveur." });
      }
  
      if (!user) {
        return res.status(401).json({ error: "Identifiants invalides." });
      }
  
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Identifiants invalides." });
      }
  
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
  
      res.json({ token });
    });
  });
  
module.exports = router;
