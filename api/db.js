// api/db.js — Vercel Serverless Function
// Guarda señales ICT en Supabase PostgreSQL
// Variables de entorno requeridas en Vercel:
//   SUPABASE_URL   = https://egbkeychtipksrnzgrhp.supabase.co
//   SUPABASE_KEY   = eyJ... (anon public key de Settings → API)

export default async function handler(req, res) {
  // CORS — permite llamadas desde el HTML en Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  try {
    const signal = req.body;

    // Validación mínima
    if (!signal.symbol || !signal.type) {
      return res.status(400).json({ error: 'Missing required fields: symbol, type' });
    }

    // INSERT en Supabase via REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        'return=minimal'   // no retorna el row completo (más rápido)
      },
      body: JSON.stringify({
        ts:         signal.ts         || new Date().toISOString(),
        symbol:     signal.symbol,
        timeframe:  signal.timeframe  || '—',
        type:       signal.type,
        setup_type: signal.setupType  || '—',
        score:      signal.score      || 0,
        entry:      signal.entry      || null,
        sl:         signal.sl         || null,
        tp1:        signal.tp1        || null,
        tp2:        signal.tp2        || null,
        tp3:        signal.tp3        || null,
        rr:         signal.rr         || '—',
        session:    signal.session    || '—',
        wave:       signal.wave       || '—',
        order_type: signal.orderType  || '—',
        breakdown:  signal.breakdown  || '—',
        ml_prob:    signal.mlProb     || null
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase error:', err);
      return res.status(502).json({ error: 'Supabase insert failed', detail: err });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('DB handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
