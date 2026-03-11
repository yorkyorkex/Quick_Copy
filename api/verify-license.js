const ALLOWED_ORIGIN = "*";

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ valid: false, error: "Method not allowed" });
  }

  try {
    const { licenseKey } = req.body || {};
    const normalizedKey = String(licenseKey || "").trim();

    if (!normalizedKey) {
      return res.status(400).json({ valid: false, error: "licenseKey is required" });
    }

    // Temporary development bypass.
    if (normalizedKey === "TEST-PRO-123") {
      return res.status(200).json({ valid: true, source: "mock" });
    }

    const productPermalink = process.env.GUMROAD_PRODUCT_PERMALINK;
    if (!productPermalink) {
      return res.status(500).json({ valid: false, error: "Server is missing Gumroad config" });
    }

    const gumroadResponse = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        product_permalink: productPermalink,
        license_key: normalizedKey,
        increment_uses_count: "false"
      })
    });

    const gumroadData = await gumroadResponse.json();
    const success = Boolean(gumroadData && gumroadData.success === true);
    const purchase = gumroadData && gumroadData.purchase ? gumroadData.purchase : null;

    if (!success || !purchase) {
      return res.status(200).json({ valid: false });
    }

    const refunded = Boolean(purchase.refunded);
    const chargebacked = Boolean(purchase.chargebacked);
    const disputed = Boolean(purchase.disputed);

    if (refunded || chargebacked || disputed) {
      return res.status(200).json({ valid: false });
    }

    return res.status(200).json({
      valid: true,
      email: purchase.email || null,
      purchaseDate: purchase.created_at || null,
      source: "gumroad"
    });
  } catch (error) {
    console.error("License verify error:", error);
    return res.status(500).json({ valid: false, error: "Internal server error" });
  }
}

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
