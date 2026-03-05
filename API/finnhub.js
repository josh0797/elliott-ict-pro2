// api/finnhub.js
function toFinnhubResolution(tf, mult) {
  const m = Number(mult) || 1;
  if (tf === "hour") return String(60 * m);
  if (tf === "day")  return "D";
  if (tf === "week") return "W";
  return "60";
}
const nowUnix = () => Math.floor(Date.now() / 1000);

export default async function handler(req, res) {
  try {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return res.status(500).json({ ok: false, error: "Missing FINNHUB_API_KEY" });

    const { type, ticker, tf, mult } = req.query;
    if (!type || !ticker || !tf || !mult) {
      return res.status(400).json({ ok: false, error: "Missing query params: type,ticker,tf,mult" });
    }

    const resolution = toFinnhubResolution(tf, mult);

    const FX_MAP = {
      EURUSD: "OANDA:EUR_USD",
      GBPUSD: "OANDA:GBP_USD",
      USDJPY: "OANDA:USD_JPY",
      AUDUSD: "OANDA:AUD_USD",
      USDCAD: "OANDA:USD_CAD",
      USDCHF: "OANDA:USD_CHF",
      EURGBP: "OANDA:EUR_GBP",
      XAUUSD: "OANDA:XAU_USD",
    };

    const CRYPTO_MAP = {
      BTCUSD: "BINANCE:BTCUSDT",
      ETHUSD: "BINANCE:ETHUSDT",
      SOLUSD: "BINANCE:SOLUSDT",
      XRPUSD: "BINANCE:XRPUSDT",
    };

    let endpoint = "";
    let symbol = "";

    if (type === "stock") {
      endpoint = "stock/candle";
      symbol = ticker;
    } else if (type === "fx") {
      endpoint = "forex/candle";
      symbol = FX_MAP[ticker];
    } else if (type === "crypto") {
      endpoint = "crypto/candle";
      symbol = CRYPTO_MAP[ticker];
    }

    if (!symbol) {
      return res.status(400).json({
        ok: false,
        error: `Finnhub: No symbol mapping for type=${type} ticker=${ticker}. Edit FX_MAP/CRYPTO_MAP.`
      });
    }

    const to = nowUnix();
    const lookbackSeconds =
      tf === "hour" ? 14 * 24 * 3600 :
      tf === "day"  ? 400 * 24 * 3600 :
      2000 * 24 * 3600;

    const from = to - lookbackSeconds;

    const url = `https://finnhub.io/api/v1/${endpoint}` +
      `?symbol=${encodeURIComponent(symbol)}` +
      `&resolution=${encodeURIComponent(resolution)}` +
      `&from=${from}&to=${to}` +
      `&token=${encodeURIComponent(key)}`;

    const r = await fetch(url);
    const j = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: j.error || `Finnhub HTTP ${r.status}` });
    }

    if (j.s !== "ok" || !Array.isArray(j.t) || j.t.length === 0) {
      return res.status(200).json({ ok: false, error: `Finnhub: status=${j.s || "?"} (no candles)` });
    }

    const candles = j.t.map((ts, i) => ({
      t: new Date(ts * 1000).toISOString(),
      o: j.o[i], h: j.h[i], l: j.l[i], c: j.c[i],
      v: (j.v && j.v[i]) ? j.v[i] : 0
    }));

    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=60");
    return res.status(200).json({ ok: true, source: "Finnhub", candles });

  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}