# TORQUE — Telegram Mini App

A static Telegram Mini App that integrates Telegram WebApp + TonConnect UI. The app stores all state in `localStorage` (no backend).

## Project Structure

```
public/
  index.html
  styles.css
  app.js
  tonconnect-manifest.json
  assets/
README.md
```

## Run Locally

> You can use any static server. Here are two simple options.

### Option 1 — Python

```bash
cd public
python3 -m http.server 5173
```

Open `http://localhost:5173`.

### Option 2 — Node (npx)

```bash
npx serve public
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [Vercel](https://vercel.com) and click **New Project**.
3. Import the GitHub repo.
4. Set **Framework Preset** to **Other**.
5. Set **Root Directory** to the repo root and **Output Directory** to `public`.
6. Click **Deploy**.

## TonConnect Manifest

The app currently points to:

```
https://torquesh.vercel.app/tonconnect-manifest.json
```

If you want to use the local manifest from this repo instead, update the `manifestUrl` inside `public/app.js` to:

```
https://YOUR-VERCEL-DOMAIN/tonconnect-manifest.json
```

After deployment, replace `YOUR-VERCEL-DOMAIN` with your real Vercel domain.

## Notes

- All progress is saved in the browser’s `localStorage`.
- No automatic reset is performed on startup.

## Notes

- All progress is saved in the browser’s `localStorage`.

- No automatic reset is performed on startup.
