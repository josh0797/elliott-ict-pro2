// api/twelvedata.js
// FX candles via Twelve Data Time Series
// Normaliza a { candles: [{t,o,h,l,c,v}] }

function toTDInterval(tf, mult) {
  const m = Number(mult) || 1;
  if (tf === "minute") return `${m}min`; // 15min, 5min, etc
  if (tf === "hour") return `${m}h`;     // 1h, 4h, etc
  if (tf === "day") return "1day";
  if (tf === "week") return "1week";
  return "15min";
}

function mapFxTickerToTD(ticker) {
  // Tu app suele usar "EURUSD" o "EUR/USD"
  const clean = ticker.replace("/", "").toUpperCase();
  const base = clean.slice(0, 3);
  const quote = clean.slice(3, 6);
  return `${base}/${quote}`; // Twelve Data acepta EUR/USD
}

export default async function handler(req, res) {
  try {
    const key = process.env.TWELVEDATA_API_KEY;
    if (!key) return res.status(500).json({ ok: false, error: "Missing TWELVEDATA_API_KEY" });

    const tf = String(req.query.tf || "minute");
    const mult = String(req.query.mult || "15");
    const rawTicker = String(req.query.ticker || "EURUSD");
    const interval = toTDInterval(tf, mult);
    const symbol = mapFxTickerToTD(rawTicker);
    const limit = Math.min(Number(req.query.limit || 500), 5000);

    const url =
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}` +
      `&interval=${encodeURIComponent(interval)}` +
      `&outputsize=${encodeURIComponent(String(limit))}` +
      `&format=JSON&apikey=${encodeURIComponent(key)}`;

    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));

    // Errores típicos: {status:"error", message:"..."}
    if (!r.ok || j.status === "error" || !Array.isArray(j.values)) {
      return res.status(502).json({ ok: false, error: j.message || "Twelve Data failed", details: j });
    }

    // Twelve Data devuelve values en orden DESC (más reciente primero)
    const candles = j.values
      .slice()
      .reverse()
      .map(v => ({
        t: new Date(v.datetime).getTime(),
        o: Number(v.open),
        h: Number(v.high),
        l: Number(v.low),
        c: Number(v.close),
        v: v.volume != null ? Number(v.volume) : 0
      }))
      .filter(x => Number.isFinite(x.t) && Number.isFinite(x.o));

    return res.status(200).json({
      ok: true,
      source: "TwelveData",
      candles
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}