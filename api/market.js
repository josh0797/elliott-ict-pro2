// api/market.js
// Router por tipo de activo:
// fx -> Twelve Data  (/api/twelvedata)
// stock -> Finnhub   (/api/finnhub)
// crypto -> Polygon  (/api/polygon)

export default async function handler(req, res) {
  try {
    const type = String(req.query.type || "").toLowerCase();

    // Construye el mismo querystring que recibimos
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }

    let target = "/api/polygon";
    if (type === "fx") target = "/api/twelvedata";
    if (type === "stock") target = "/api/finnhub";

    // En Vercel podemos llamar a nuestra propia función por HTTP interno
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const url = `${proto}://${host}${target}?${qs.toString()}`;

    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const txt = await r.text();

    // Reenviamos el status y el JSON (o texto) tal cual
    res.status(r.status);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    return res.send(txt);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}