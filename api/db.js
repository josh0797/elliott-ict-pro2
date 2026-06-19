// api/db.js
export default async function handler(req, res) {
  // CORS Headers seguros
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  try {
    const signal = req.body;
    
    // Validación financiera crítica
    if (!signal.symbol || !signal.type || !signal.entry) {
      return res.status(400).json({ error: 'Missing required fields: symbol, type, entry' });
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        ts: signal.ts || new Date().toISOString(),
        symbol: signal.symbol,
        timeframe: signal.timeframe || '1H',
        type: signal.type,
        setup_type: signal.setupType || 'ICT',
        score: Number(signal.score) || 0,
        entry: Number(signal.entry) || 0,
        sl: Number(signal.sl) || 0,
        tp1: Number(signal.tp1) || 0,
        tp2: Number(signal.tp2) || 0,
        tp3: Number(signal.tp3) || 0,
        rr: signal.rr || '1:1',
        session: signal.session || 'NY',
        wave: signal.wave || 'Unknown',
        order_type: signal.orderType || 'Limit',
        breakdown: signal.breakdown || '',
        ml_prob: Number(signal.mlProb) || 0
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