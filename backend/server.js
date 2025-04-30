const express = require('express');
const cors = require('cors');
const app = express();

require('dotenv').config();

app.use(cors());
app.use(express.json()); 

const authRoutes = require('./routes/auth');
const pharmaciesRoutes = require('./routes/pharmacies');
const postRoutes = require('./routes/posts');

app.use('/api/auth', authRoutes);      
app.use('/api/pharmacies', pharmaciesRoutes);
app.use('/api/posts', postRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
