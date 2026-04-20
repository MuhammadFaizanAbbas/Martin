export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }

  const target = "https://goarrow.ai/test/update_delegieren.php";

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        const usp = new URLSearchParams(body);
        body = Object.fromEntries(usp.entries());
      }
    }

    if (body == null || typeof body !== "object") body = {};

    const bearbeiter = String(body.bearbeiter || "").trim();
    const delegieren = String(body.delegieren || "").trim();

    if (!bearbeiter || !delegieren) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: bearbeiter and delegieren",
      });
    }

    const params = new URLSearchParams();
    params.append("bearbeiter", bearbeiter);
    params.append("delegieren", delegieren);

    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const text = await upstream.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { status: text && text.trim().toLowerCase() !== "false" ? "success" : "error", raw: text };
    }

    res.setHeader("Cache-Control", "no-store");
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        status: "error",
        message: payload?.message || payload?.raw || `Upstream request failed with HTTP ${upstream.status}`,
      });
    }

    if (!text || text.trim().toLowerCase() === "false" || payload?.status === "error" || payload?.success === false) {
      return res.status(502).json({
        status: "error",
        message: payload?.message || "Delegieren update was rejected by upstream",
        raw: text,
      });
    }

    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
}
