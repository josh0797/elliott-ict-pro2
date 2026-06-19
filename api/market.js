// api/market.js
// Router unificado para activos financieros
// fx/stock -> Finnhub | crypto -> Polygon (Prioridad)
export default async function handler(req, res) {
  try {
    // Sanitización básica de entrada
    const type = String(req.query.type || "").toLowerCase().trim();
    
    // Construir querystring seguro
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (v !== undefined && v !== null && k !== 'type') {
        qs.set(k, String(v));
      }
    }

    // Lógica de enrutamiento corregida (Sin Twelve Data inexistente)
    // Finnhub tiene mejor cobertura para FX (OANDA) y Stocks
    // Polygon es superior para Crypto y Aggregates
    let target = "/api/polygon";
    if (type === "fx" || type === "stock") {
      target = "/api/finnhub";
    }
    if (type === "crypto") {
      target = "/api/polygon";
    }

    // Fetch interno eficiente en Vercel
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const url = `${proto}://${host}${target}?${qs.toString()}`;

    const r = await fetch(url, { 
      headers: { 
        Accept: "application/json",
        // Propagar auth si fuera necesario en el futuro
      } 
    });
    
    const txt = await r.text();

    // Reenvío transparente de estado y headers
    res.status(r.status);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    // Cache control heredado
    if (r.headers.get("cache-control")) {
      res.setHeader("Cache-Control", r.headers.get("cache-control"));
    }
    
    return res.send(txt);
  } catch (e) {
    console.error("Market Router Error:", e);
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}