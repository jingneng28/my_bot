# SG MRT Journey Time

A small client-side web app that estimates travel time between any two
Singapore MRT stations, with a shortest-path route (lines to take and
where to transfer).

## How the time is calculated

- **Choa Chu Kang to/from the stations on your personal list** always uses
  your given real-world duration (works both directions), listed in
  `data.js` under `CCK_OVERRIDES`. This is a direct promise: querying one of
  these pairs never returns anything but your number.
- **Those same numbers also calibrate the map itself.** `CALIBRATIONS` in
  `data.js` walks the real corridor each listed trip takes (e.g. Choa Chu
  Kang → Yishun → Ang Mo Kio → Bishan up the NS Line) and tunes each
  individual stop-to-stop hop (2–5 min) and each transfer so they sum to
  your given total. That means Choa Chu Kang → Bishan costs the same 40 min
  whether Bishan is your destination or just a stop on the way to, say,
  Toa Payoh — the calibration applies everywhere that corridor is used, not
  only to the exact pair you gave a number for.
- **Every other pair** (no personal data at all) falls back to a default:
  3 minutes between adjacent stations (2 minutes on the Downtown Line,
  which tends to run shorter hops) and 3 minutes to change lines at an
  interchange. Dijkstra's algorithm always picks the shortest total time
  over this whole calibrated + default map.

## Files

- `data.js` — line/station data, your personalised Choa Chu Kang list, and
  the corridor calibrations derived from it.
- `router.js` — the routing engine and calibration logic (pure JS, no DOM,
  reusable/testable).
- `app.js` — wires the router up to the UI (including the station search).
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
This alone keeps direct Choa Chu Kang queries exact. If you also want the
new number to calibrate the corridor it travels (so it's used correctly as
a leg of other journeys too), add a matching step to `CALIBRATIONS`
describing the real stations/line it passes through and the target total
for that stretch — see the existing entries for the pattern.
