// api/polygon.js
// Nota: Massive.com es la API que reemplaza a Polygon.io (mismo formato de
// endpoints y respuesta JSON). Solo cambia el dominio base y el API key.
export default async function handler(req, res) {
  try {
    const key = process.env.MASSIVE_API_KEY || process.env.POLYGON_API_KEY;
    if (!key) return res.status(500).json({ ok: false, error: "Missing MASSIVE_API_KEY" });

    const { type, ticker, tf, mult } = req.query;
    if (!type || !ticker || !tf || !mult) {
      return res.status(400).json({ ok: false, error: "Missing query params: type,ticker,tf,mult" });
    }

    let polyTicker = ticker.toUpperCase();
    // Prefijos requeridos por Massive (idénticos a Polygon)
    if (type === "fx") polyTicker = `C:${ticker}`;
    if (type === "crypto") polyTicker = `X:${ticker}`;
    // Stocks no llevan prefijo en V2 aggs usualmente, pero depende del ticker

    const timespan = tf;
    const multiplier = Number(mult) || 1;

    const now = new Date();
    const to = now.toISOString().slice(0, 10);

    const lookbackDays =
      tf === "hour" ? 12 :
      tf === "day" ? 260 :
      1500;

    const fromDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const from = fromDate.toISOString().slice(0, 10);

    // Massive.com usa el mismo path que Polygon: /v2/aggs/ticker/...
    const url =
      `https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(polyTicker)}` +
      `/range/${multiplier}/${encodeURIComponent(timespan)}/${from}/${to}` +
      `?adjusted=true&sort=asc&limit=5000&apiKey=${encodeURIComponent(key)}`;

    const r = await fetch(url);
    const j = await r.json();

    const results = Array.isArray(j.results) ? j.results : [];

    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: j.error || j.message || `Massive HTTP ${r.status}` });
    }

    if (results.length === 0) {
      return res.status(200).json({
        ok: false,
        error: `Massive: status=${j.status || "?"}, resultsCount=${j.resultsCount ?? 0}`,
        raw: { status: j.status, resultsCount: j.resultsCount, queryCount: j.queryCount }
      });
    }

    const candles = results.map(x => ({
      t: new Date(x.t).toISOString(),
      o: x.o, h: x.h, l: x.l, c: x.c,
      v: x.v ?? x.n ?? 0
    }));

    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=60");
    return res.status(200).json({ ok: true, source: "Massive", candles });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
