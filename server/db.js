const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'isuzugo.db');
const db = new sqlite3.Database(dbPath);

// Helper for db operations with promises
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const initDB = async () => {
  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('broker', 'carrier', 'admin')),
      keys_balance INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      is_blocked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // OTP Codes table
  await run(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      is_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders table
  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      broker_id INTEGER NOT NULL,
      broker_name TEXT NOT NULL,
      from_region TEXT NOT NULL,
      from_district TEXT NOT NULL,
      to_region TEXT NOT NULL,
      to_district TEXT NOT NULL,
      cargo_title TEXT NOT NULL,
      cargo_weight TEXT NOT NULL,
      body_type TEXT NOT NULL,
      price TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'closed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (broker_id) REFERENCES users(id)
    )
  `);

  // Unlocked Orders table (for carriers who paid 1 key to see phone)
  await run(`
    CREATE TABLE IF NOT EXISTS unlocked_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      cost_keys INTEGER DEFAULT 1,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, order_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // Payments table (Click, Payme, Paynet)
  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      user_phone TEXT NOT NULL,
      provider TEXT NOT NULL,
      package_keys INTEGER NOT NULL,
      bonus_keys INTEGER DEFAULT 0,
      total_keys INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      receipt_note TEXT,
      receipt_image TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      admin_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Settings table (Card number, Card holder name, phone, etc.)
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Default settings if not exists
  const existingCard = await get(`SELECT value FROM settings WHERE key = 'card_number'`);
  if (!existingCard) {
    await run(`INSERT INTO settings (key, value) VALUES ('card_number', '9860 3501 4452 7890')`);
    await run(`INSERT INTO settings (key, value) VALUES ('card_holder', 'ISUZUGO LOGISTIKA MCHJ')`);
    await run(`INSERT INTO settings (key, value) VALUES ('support_phone', '+998 71 200 45 45')`);
  }

  // Seed default admin account if not exists
  const admin = await get(`SELECT * FROM users WHERE role = 'admin'`);
  if (!admin) {
    await run(`
      INSERT INTO users (full_name, phone, email, role, keys_balance, is_verified)
      VALUES ('Bosh Administrator', '+998901234567', 'admin@isuzugo.uz', 'admin', 999, 1)
    `);
  }
};

module.exports = {
  db,
  query,
  run,
  get,
  initDB
};
