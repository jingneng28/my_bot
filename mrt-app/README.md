# SG MRT Journey Time

A small client-side web app that estimates travel time between any two
Singapore MRT stations, with a shortest-path route (lines to take and
where to transfer).

## How the time is calculated

- **Choa Chu Kang to/from the stations on your personal list** always uses
  your given real-world duration (works both directions), listed in
  `data.js` under `CCK_OVERRIDES`.
- **Every other pair** is computed with Dijkstra's algorithm over the real
  MRT line map, assuming 3 minutes between adjacent stations and 3 minutes
  to change lines at an interchange, always picking the shortest total time.

## Files

- `data.js` — line/station data and your personalised Choa Chu Kang list.
- `router.js` — the routing engine (pure JS, no DOM, reusable/testable).
- `app.js` — wires the router up to the UI.
- `index.html` / `style.css` — the page itself.
- `manifest.json` — lets iOS treat it as a standalone app icon.

## Installing on your iPhone

This is a plain static web app (no build step, no server-side code), so you
need to host the `mrt-app/` folder somewhere reachable over HTTPS, then add
it to your home screen. The easiest free option is **GitHub Pages**:

1. On GitHub, open this repository's **Settings → Pages**.
2. Under "Build and deployment", set **Source** to "Deploy from a branch",
   pick this branch, and set the folder to `/mrt-app` (or `/` if GitHub
   Pages doesn't offer a subfolder option — in that case move the app's
   files to the repo root, or into a `docs/` folder and point Pages there).
3. Wait a minute for it to publish, then open the resulting
   `https://<you>.github.io/...` URL in **Safari on your iPhone**.
4. Tap the **Share** icon → **Add to Home Screen**.

You'll get an app icon on your home screen that opens full-screen, with the
same routing logic. Everything runs locally in the browser — no network
calls, no accounts, nothing to configure.

## Updating your personal times

Edit `CCK_OVERRIDES` in `data.js` — each entry is
`{ to: "Station Name", minutes: N, hint: "optional path description" }`.
