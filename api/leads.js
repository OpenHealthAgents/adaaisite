const { sql } = require('@vercel/postgres');

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^[+()\-\s\d]{7,20}$/.test(value);
}

function sanitizeText(value) {
  return String(value || '').trim();
}

async function ensureTable() {
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
}

module.exports = async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === 'POST') {
      const payload = req.body || {};
      const data = {
        name: sanitizeText(payload.name),
        email: sanitizeText(payload.email),
        phone: sanitizeText(payload.phone),
        company: sanitizeText(payload.company),
        service: sanitizeText(payload.service),
        details: sanitizeText(payload.details)
      };

      for (const [key, value] of Object.entries(data)) {
        if (!value) {
          return res.status(400).json({ error: `Missing or invalid field: ${key}` });
        }
      }

      if (!isValidEmail(data.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      if (!isValidPhone(data.phone)) {
        return res.status(400).json({ error: 'Invalid phone format' });
      }

      const result = await sql`
        INSERT INTO leads (name, email, phone, company, service, details)
        VALUES (${data.name}, ${data.email}, ${data.phone}, ${data.company}, ${data.service}, ${data.details})
        RETURNING id
      `;

      return res.status(201).json({ ok: true, leadId: result.rows[0].id });
    }

    if (req.method === 'GET') {
      const result = await sql`
        SELECT id, name, email, phone, company, service, details, created_at AS "createdAt"
        FROM leads
        ORDER BY id DESC
        LIMIT 100
      `;

      return res.status(200).json({ leads: result.rows });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({
      error: 'Serverless function failed. Configure Vercel Postgres for this project and redeploy.'
    });
  }
};
