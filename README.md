# Maryland Property Group

Public marketing website for **Maryland Property Group** (a trade name of **More Gad LLC**) — commercial and residential real estate investment, property management, and direct home & building purchases.

This is a single self-contained static site: everything (HTML, CSS, JavaScript, icons, charts, interactive calculators, presentations, and the client-portal demo) lives in **`index.html`**. There is no build step and no dependencies.

## Contents
- `index.html` — the entire website
- `favicon.svg` — site icon
- `_headers` — security headers for Cloudflare Pages
- `robots.txt`, `404.html` — basic hosting niceties

## Run locally
Open `index.html` in any browser, or serve the folder:
```
python3 -m http.server 8080
```
then visit http://localhost:8080

## Deploy to GitHub
```
git remote add origin https://github.com/MreGad-Prop/Marylandpropertygroup.git   # already set
git branch -M main
git push -u origin main
```

## Deploy to Cloudflare Pages
1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the **MreGad-Prop/Marylandpropertygroup** repository.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/`
4. **Save and Deploy.** Every push to `main` re-deploys automatically.
5. (Optional) **Custom domains** → add `marylandpropertygroup.com`.

## Notes
- The contact and cash-offer forms open the visitor's email app addressed to **ben@marylandpropertygroup.com** (no backend needed). To capture submissions automatically instead, connect a form service (Formspree, Google Forms) or a Cloudflare Pages Function.
- Resident "Pay Rent" / "Resident Login" link out to the live AppFolio resident portal.
