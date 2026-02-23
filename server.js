const fs = require('fs');
const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = Number(process.env.PORT || 3000);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'leads.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT NOT NULL,
    service TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const insertLead = db.prepare(`
  INSERT INTO leads (name, email, phone, company, service, details)
  VALUES (@name, @email, @phone, @company, @service, @details)
`);

app.use(express.json({ limit: '200kb' }));
app.use(express.static(__dirname));

app.post('/api/leads', (req, res) => {
  const payload = req.body || {};
  const requiredFields = ['name', 'email', 'phone', 'company', 'service', 'details'];

  for (const field of requiredFields) {
    if (typeof payload[field] !== 'string' || payload[field].trim().length === 0) {
      return res.status(400).json({ error: `Missing or invalid field: ${field}` });
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!/^[+()\-\s\d]{7,20}$/.test(payload.phone)) {
    return res.status(400).json({ error: 'Invalid phone format' });
  }

  try {
    const info = insertLead.run({
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      company: payload.company.trim(),
      service: payload.service.trim(),
      details: payload.details.trim()
    });

    return res.status(201).json({
      ok: true,
      leadId: info.lastInsertRowid
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save lead' });
  }
});

app.get('/api/leads', (_req, res) => {
  const leads = db
    .prepare(
      'SELECT id, name, email, phone, company, service, details, created_at AS createdAt FROM leads ORDER BY id DESC LIMIT 100'
    )
    .all();

  res.json({ leads });
});

app.listen(PORT, () => {
  console.log(`Ada AI site running at http://localhost:${PORT}`);
});
