const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isVercel = Boolean(process.env.VERCEL);

let insertLead;
let fetchLeads;

if (isVercel) {
  const { sql } = require('@vercel/postgres');

  const ensureTable = async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        company TEXT NOT NULL,
        service TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  };

  insertLead = async (payload) => {
    await ensureTable();
    const result = await sql`
      INSERT INTO leads (name, email, phone, company, service, details)
      VALUES (${payload.name}, ${payload.email}, ${payload.phone}, ${payload.company}, ${payload.service}, ${payload.details})
      RETURNING id
    `;
    return Number(result.rows[0].id);
  };

  fetchLeads = async () => {
    await ensureTable();
    const result = await sql`
      SELECT id, name, email, phone, company, service, details, created_at AS "createdAt"
      FROM leads
      ORDER BY id DESC
      LIMIT 100
    `;
    return result.rows;
  };
} else {
  const Database = require('better-sqlite3');
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

  const insertLeadStmt = db.prepare(`
    INSERT INTO leads (name, email, phone, company, service, details)
    VALUES (@name, @email, @phone, @company, @service, @details)
  `);

  const fetchLeadsStmt = db.prepare(
    'SELECT id, name, email, phone, company, service, details, created_at AS createdAt FROM leads ORDER BY id DESC LIMIT 100'
  );

  insertLead = async (payload) => {
    const info = insertLeadStmt.run(payload);
    return Number(info.lastInsertRowid);
  };

  fetchLeads = async () => fetchLeadsStmt.all();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^[+()\-\s\d]{7,20}$/.test(value);
}

function normalizeLead(payload) {
  return {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim(),
    phone: String(payload.phone || '').trim(),
    company: String(payload.company || '').trim(),
    service: String(payload.service || '').trim(),
    details: String(payload.details || '').trim()
  };
}

app.use(express.json({ limit: '200kb' }));
app.use(express.static(__dirname));

app.post('/api/leads', async (req, res) => {
  const lead = normalizeLead(req.body || {});

  for (const [field, value] of Object.entries(lead)) {
    if (!value) {
      return res.status(400).json({ error: `Missing or invalid field: ${field}` });
    }
  }

  if (!isValidEmail(lead.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!isValidPhone(lead.phone)) {
    return res.status(400).json({ error: 'Invalid phone format' });
  }

  try {
    const leadId = await insertLead(lead);
    return res.status(201).json({ ok: true, leadId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save lead' });
  }
});

app.get('/api/leads', async (_req, res) => {
  try {
    const leads = await fetchLeads();
    return res.status(200).json({ leads });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

app.listen(PORT, () => {
  console.log(`Ada AI site running at http://localhost:${PORT}`);
});
