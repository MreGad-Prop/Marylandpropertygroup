# Activation guide — lead capture, bot protection & analytics

The site works today: until the steps below are done, the contact and
"cash offer" forms **fall back to the existing `mailto:` behavior**, so no
leads are lost. Completing these steps turns on real lead capture (stored +
emailed), bot protection, and traffic analytics.

All settings live on the **Cloudflare Pages project `marylandpropertygroup`**
(account `Ben.moregad@gmail.com`).

---

## 1. Email the leads (Resend) — recommended first step

1. Create a free account at https://resend.com and add + verify the domain
   `marylandpropertygroup.com` (Resend shows the DNS records to add; they go in
   the same Cloudflare DNS zone).
2. Create an API key.
3. In Cloudflare → Pages → `marylandpropertygroup` → **Settings → Variables and
   Secrets** (Production), add:
   - `RESEND_API_KEY` = the key (mark as **Secret/Encrypt**)
   - `LEAD_TO` = `ben@marylandpropertygroup.com` (optional; this is the default)
   - `LEAD_FROM` = `leads@marylandpropertygroup.com` (must be a verified Resend sender)
4. Redeploy (any push to `main`, or "Retry deployment").

Once `RESEND_API_KEY` is set, form submissions email Ben instead of opening the
visitor's mail app.

## 2. Store every lead (Cloudflare D1) — optional but recommended

Keeps a permanent record even if an email bounces.

```
npx wrangler d1 create marylandpropertygroup-leads
```

Then in Pages → Settings → **Bindings → D1 database**, bind it as
`LEADS_DB`. The table is created automatically on the first submission.
Query leads later with:

```
npx wrangler d1 execute marylandpropertygroup-leads --command "SELECT created_at, form, subject FROM leads ORDER BY id DESC LIMIT 50"
```

## 3. Bot protection (Cloudflare Turnstile)

1. Cloudflare dashboard → **Turnstile → Add widget** for
   `marylandpropertygroup.com`. Copy the **Site Key** and **Secret Key**.
2. In `index.html`, set the site key:
   ```js
   var TURNSTILE_SITEKEY = "0x4AAA..."; // paste your Turnstile site key
   ```
   (search for `TURNSTILE_SITEKEY` — it's near the top of the main `<script>`).
   When non-empty, the widget renders on both forms automatically.
3. In Pages → Settings → Variables and Secrets, add `TURNSTILE_SECRET` (Secret).
   The backend then rejects submissions that fail verification.

## 4. Traffic analytics (Cloudflare Web Analytics)

Cloudflare dashboard → **Analytics & Logs → Web Analytics → Add a site** →
`marylandpropertygroup.com`. Cloudflare gives a one-line `<script>` beacon —
paste it just before `</body>` in `index.html`. Free, cookieless, no banner
required.

---

## How the backend behaves (functions/api/lead.js)

| Configured                    | Result                                          |
| ----------------------------- | ----------------------------------------------- |
| Nothing                       | Form falls back to `mailto:` (current behavior) |
| `RESEND_API_KEY`              | Lead emailed to `LEAD_TO`                       |
| `LEADS_DB` binding            | Lead stored in D1 `leads` table                 |
| `TURNSTILE_SECRET` + site key | Bot submissions rejected before email/storage   |

Deploys are automatic: pushing to `main` triggers the GitHub Action
(`.github/workflows/deploy.yml`) which runs `wrangler pages deploy`.
