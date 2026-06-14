/**
 * Cloudflare Pages Function — lead capture for Maryland Property Group.
 *
 * POST /api/lead  { form, subject, body, token }
 *
 * Behavior is progressive — it activates as you add configuration:
 *   - TURNSTILE_SECRET (env)   → verifies the Turnstile token, rejects bots.
 *   - LEADS_DB (D1 binding)    → stores every lead in the `leads` table.
 *   - RESEND_API_KEY (env)     → emails the lead to LEAD_TO via Resend.
 *
 * If NEITHER D1 nor email is configured, it returns 501 so the website
 * gracefully falls back to the existing mailto: behavior. Nothing breaks
 * before the secrets are set.
 *
 * Optional env vars:
 *   LEAD_TO    (default: ben@marylandpropertygroup.com)
 *   LEAD_FROM  (default: leads@marylandpropertygroup.com)  — must be a verified Resend sender
 */

const DEFAULT_TO = "ben@marylandpropertygroup.com";
const DEFAULT_FROM = "leads@marylandpropertygroup.com";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function verifyTurnstile(secret, token, ip) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token || "");
  if (ip) form.append("remoteip", ip);
  const r = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: form,
    },
  );
  const out = await r.json();
  return !!out.success;
}

async function storeLead(db, lead) {
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, form TEXT, subject TEXT, body TEXT, ip TEXT, ua TEXT)",
    )
    .run();
  await db
    .prepare(
      "INSERT INTO leads (created_at, form, subject, body, ip, ua) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(lead.created_at, lead.form, lead.subject, lead.body, lead.ip, lead.ua)
    .run();
}

async function sendEmail(apiKey, to, from, subject, body) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: `Maryland Property Group <${from}>`,
      to: [to],
      reply_to: to,
      subject,
      text: body,
    }),
  });
  return r.ok;
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const subject = (payload.subject || "Website lead").toString().slice(0, 300);
  const body = (payload.body || "").toString().slice(0, 8000);
  const form = (payload.form || "").toString().slice(0, 60);
  if (!body) return json({ ok: false, error: "empty" }, 400);

  // 1) Bot protection (only if configured)
  if (env.TURNSTILE_SECRET) {
    const ip = request.headers.get("cf-connecting-ip") || "";
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET, payload.token, ip);
    if (!ok) return json({ ok: false, error: "turnstile_failed" }, 400);
  }

  const lead = {
    created_at: new Date().toISOString(),
    form,
    subject,
    body,
    ip: request.headers.get("cf-connecting-ip") || "",
    ua: request.headers.get("user-agent") || "",
  };

  let stored = false;
  let emailed = false;
  const errors = [];

  if (env.LEADS_DB) {
    try {
      await storeLead(env.LEADS_DB, lead);
      stored = true;
    } catch (e) {
      errors.push("db:" + (e && e.message ? e.message : "error"));
    }
  }

  if (env.RESEND_API_KEY) {
    try {
      emailed = await sendEmail(
        env.RESEND_API_KEY,
        env.LEAD_TO || DEFAULT_TO,
        env.LEAD_FROM || DEFAULT_FROM,
        subject,
        body,
      );
      if (!emailed) errors.push("email:send_failed");
    } catch (e) {
      errors.push("email:" + (e && e.message ? e.message : "error"));
    }
  }

  // Not configured yet → tell the client to fall back to mailto.
  if (!env.LEADS_DB && !env.RESEND_API_KEY) {
    return json({ ok: false, fallback: true, error: "not_configured" }, 501);
  }

  if (stored || emailed) return json({ ok: true, stored, emailed });
  return json(
    { ok: false, fallback: true, error: errors.join(",") || "failed" },
    502,
  );
}

export async function onRequest({ request }) {
  if (request.method === "POST") return; // handled by onRequestPost
  return json({ ok: false, error: "method_not_allowed" }, 405);
}
