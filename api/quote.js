// api/quote.js
export default async function handler(req, res) {
  try {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return res.status(500).json({ ok: false, error: "Missing FINNHUB_API_KEY" });

    const { type, ticker } = req.query;
    if (!type || !ticker) {
      return res.status(400).json({ ok: false, error: "Missing query params: type,ticker" });
    }

    // Mapeo (igual que en finnhub candles)
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

    let symbol = "";
    if (type === "stock") symbol = ticker;
    if (type === "fx") symbol = FX_MAP[ticker];
    if (type === "crypto") symbol = CRYPTO_MAP[ticker];

    if (!symbol) {
      return res.status(400).json({ ok: false, error: `No symbol mapping for ${type}:${ticker}` });
    }

    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`;
    const r = await fetch(url);
    const j = await r.json();

    if (!r.ok) return res.status(r.status).json({ ok: false, error: j.error || `Finnhub HTTP ${r.status}` });

    // Finnhub quote: c=current, h=high, l=low, o=open, pc=prev close, t=timestamp
    if (typeof j.c !== "number") {
      return res.status(200).json({ ok: false, error: "No quote returned", raw: j });
    }

    res.setHeader("Cache-Control", "s-maxage=1, stale-while-revalidate=5");
    return res.status(200).json({ ok: true, source: "Finnhub", quote: j });

  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}