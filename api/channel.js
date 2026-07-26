/**
 * GET /api/channel — resolve official channel URL if the t.me page is real
 * (not a missing user / “user not available”).
 */
export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const configured = (
    process.env.CHANNEL_URL ||
    process.env.VITE_CHANNEL_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  if (!configured || !configured.includes("t.me/")) {
    res.status(200).json({ ok: false, url: "", reason: "not_configured" });
    return;
  }

  try {
    const r = await fetch(configured, {
      headers: { "User-Agent": "TrapWarChannelCheck/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    const html = await r.text();
    // Dead usernames: “If you have Telegram, you can contact @… right away.”
    // Live channels/groups: subscribers or members count in the page.
    const hasAudience =
      /\d[\d\s,]*\s*(subscribers|members|subscriber|member)/i.test(html) ||
      /tgme_page_extra/i.test(html);
    const looksMissing =
      /If you have[\s\S]{0,80}Telegram[\s\S]{0,120}right away/i.test(html) &&
      !hasAudience;

    if (looksMissing) {
      res.status(200).json({ ok: false, url: "", reason: "not_found", configured });
      return;
    }

    res.status(200).json({
      ok: true,
      url: configured,
      title: (html.match(/tgme_page_title[^>]*>([^<]+)/i) || [])[1]?.trim() || "Trap War",
    });
  } catch {
    // Network flake — still expose configured URL so button isn't dead forever offline
    res.status(200).json({ ok: true, url: configured, reason: "unverified" });
  }
}
