// api/quote.js
// Devuelve un "último precio" simple (quote) para mostrar en UI.
// - FX: Finnhub
// - Crypto/Stock: Polygon

export default async function handler(req, res) {
  try {
    const type = String(req.query.type || "").toLowerCase();   // fx | crypto | stock
    const ticker = String(req.query.ticker || "").trim();      // EURUSD | C:BTCUSD | AAPL | C:EURUSD (Polygon)
    const provider = String(req.query.provider || "").toLowerCase(); // opcional

    if (!type || !ticker) {
      return res.status(400).json({ ok: false, error: "Missing type or ticker" });
    }

    // --- FX: Finnhub ---
    if (type === "fx" || provider === "finnhub") {
      const key = process.env.FINNHUB_API_KEY;
      if (!key) return res.status(500).json({ ok: false, error: "Missing FINNHUB_API_KEY" });

      // Finnhub usa formato "OANDA:EUR_USD" (recomendado) o "FX_IDC:EURUSD" según tu plan.
      // Aquí hacemos una conversión simple: EURUSD -> OANDA:EUR_USD
      const sym = ticker.includes(":")
        ? ticker
        : `OANDA:${ticker.slice(0, 3)}_${ticker.slice(3, 6)}`;

      // Finnhub quote endpoint
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(key)}`;
      const r = await fetch(url);
      const j = await r.json().catch(() => ({}));

      // Finnhub devuelve: c (current), h, l, o, pc
      if (!r.ok || typeof j.c !== "number") {
        return res.status(502).json({ ok: false, error: "Finnhub quote failed", details: j });
      }

      return res.status(200).json({
        ok: true,
        source: "Finnhub",
        quote: { c: j.c, o: j.o, h: j.h, l: j.l, pc: j.pc, t: Date.now() }
      });
    }

    // --- Crypto/Stock: Polygon ---
    const key = process.env.POLYGON_API_KEY;
    if (!key) return res.status(500).json({ ok: false, error: "Missing POLYGON_API_KEY" });

    // Polygon last trade/quote puede variar por asset.
    // Para simplificar, usamos "last trade" para stocks y "last trade" para crypto.
    // Para crypto usualmente ticker: X:BTCUSD (trades) o C:BTCUSD para aggs; tu app ya usa aggs en polygon.js.
    // Aquí intentamos:
    // - stock: /v2/last/trade/{ticker}
    // - crypto: /v2/last/trade/crypto/{ticker} (requiere formato X:BTCUSD o similar)
    let url = "";
    if (type === "stock") {
      url = `https://api.polygon.io/v2/last/trade/${encodeURIComponent(ticker)}?apiKey=${encodeURIComponent(key)}`;
    } else {
      // crypto
      // si te llega C:BTCUSD lo convertimos a X:BTCUSD para last trade (más común).
      const t = ticker.startsWith("C:") ? "X:" + ticker.slice(2) : ticker;
      url = `https://api.polygon.io/v2/last/trade/crypto/${encodeURIComponent(t)}?apiKey=${encodeURIComponent(key)}`;
    }

    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      return res.status(502).json({ ok: false, error: "Polygon quote failed", details: j });
    }

    // Normalizamos a {c}
    // Stocks: j.results.p (price)
    // Crypto: j.results.p (price)
    const price = j?.results?.p;
    if (typeof price !== "number") {
      return res.status(502).json({ ok: false, error: "Polygon quote missing price", details: j });
    }

    return res.status(200).json({
      ok: true,
      source: "Polygon",
      quote: { c: price, t: Date.now() }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}