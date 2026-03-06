// api/market.js
// Router por tipo de activo:
// fx -> Twelve Data
// stock -> Finnhub
// crypto -> Polygon

export default async function handler(req, res) {
  try {
    const type = String(req.query.type || "").toLowerCase();

    if (type === "fx") {
      const mod = await import("./twelvedata.js");
      return mod.default(req, res);
    }

    if (type === "stock") {
      const mod = await import("./finnhub.js");
      return mod.default(req, res);
    }

    // crypto (default) -> polygon
    const mod = await import("./polygon.js");
    return mod.default(req, res);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}