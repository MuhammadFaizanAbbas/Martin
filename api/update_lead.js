export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, PUT, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    res.setHeader("Allow", "POST, PUT, PATCH, OPTIONS");
    return res
      .status(405)
      .json({ status: "error", message: "Method Not Allowed" });
  }

  const targetBase =
    "https://bmnxecoddcxcwvqukujh.supabase.co/rest/v1/leads";
  const serviceRole =
    process.env.SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;
  const allowedColumns = new Set([
    "name",
    "erstberatung_telefon",
    "strasse_objekt",
    "angebot",
    "plz",
    "ort",
    "telefon",
    "email",
    "status",
    "einschaetzung_kunde",
    "lead_quelle",
    "kontakt_via",
    "datum",
    "nachfassen",
    "bearbeiter",
    "delegieren",
    "summe_netto",
    "dachflaeche_m2",
    "dachneigung_grad",
    "dacheindeckung",
    "wunsch_farbe",
    "dachpfanne",
    "baujahr_dach",
    "sale_typ",
  ]);

  function normalizeDecimalInput(value) {
    const cleaned = String(value ?? "")
      .trim()
      .replace(/[^\d,.-]/g, "");

    if (!cleaned) return "";

    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");

    if (hasComma && hasDot) {
      const lastComma = cleaned.lastIndexOf(",");
      const lastDot = cleaned.lastIndexOf(".");
      const decimalSeparator = lastComma > lastDot ? "," : ".";
      const thousandSeparator = decimalSeparator === "," ? "." : ",";
      return cleaned
        .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
        .replace(decimalSeparator, ".");
    }

    if (hasComma) {
      return cleaned.replace(/\./g, "").replace(",", ".");
    }

    return cleaned.replace(/,/g, "");
  }

  if (!serviceRole) {
    return res
      .status(500)
      .json({ status: "error", message: "Missing SERVICE_ROLE or SUPABASE_SERVICE_ROLE_KEY env var" });
  }

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

    if (body.lead_id == null && body.id != null) {
      body.lead_id = body.id;
    }

    if (body.summe_netto != null && body.summe_netto !== "") {
      body.summe_netto = normalizeDecimalInput(body.summe_netto);
    }

    const leadId = String(body.lead_id || "").trim();
    if (!leadId) {
      return res.status(400).json({
        status: "error",
        message: "Missing required field: lead_id",
      });
    }

    const payload = { ...body };
    delete payload.id;
    delete payload.lead_id;

    Object.keys(payload).forEach((key) => {
      if (!allowedColumns.has(key)) {
        delete payload[key];
        return;
      }
      if (payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      }
    });

    if (!Object.keys(payload).length) {
      return res.status(400).json({
        status: "error",
        message: "No valid fields provided for update",
      });
    }

    const target = `${targetBase}?id=eq.${encodeURIComponent(leadId)}`;
    const upstream = await fetch(target, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: "return=representation,count=exact",
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        status: "error",
        message: text || `Supabase HTTP ${upstream.status}`,
      });
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { status: "success", raw: text };
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      status: "success",
      data: json,
      rows_updated: Array.isArray(json) ? json.length : undefined,
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
}
