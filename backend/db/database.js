const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./pharmacies.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS pharmacies (
      id TEXT PRIMARY KEY,
      name TEXT,
      facebookPageId TEXT,
      postingDay TEXT,
      postingFrequency TEXT,
      pharmacyIdForNeighbor TEXT,
      authToken TEXT,
      cookieToken TEXT,
      pageAccessToken TEXT,
      radius INTEGER DEFAULT 1,
      latitude REAL,
      longitude REAL,
      address TEXT,
      apiType DEFAULT 'private'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      pharmacyId TEXT,
      imageUrl TEXT,
      scheduledDatetime TEXT,
      status TEXT,
      fbPostId TEXT,
      FOREIGN KEY(pharmacyId) REFERENCES pharmacies(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS postMessages (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
    )
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS user_tokens (
    userId TEXT PRIMARY KEY,
    encryptedToken TEXT
  );
  `);


});

module.exports = db;
