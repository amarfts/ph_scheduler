const express = require('express');
const cors = require('cors');
const app = express();
const pharmaciesRoutes = require('./routes/pharmacies');
const postRoutes = require('./routes/posts');
const authRoutes = require('./routes/auth');
const db = require('./db/database');

require('dotenv').config();

app.use(cors());
app.use(express.json());

app.use('/api/pharmacies', pharmaciesRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
