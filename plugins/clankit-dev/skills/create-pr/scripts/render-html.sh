#!/usr/bin/env bash
# Render a local HTML file to a retina-crisp PNG with the repo's Playwright.
#
#   render-html.sh panel.html out.png [width] [height]
#
# deviceScaleFactor 2 matters: a 1x screenshot of text looks soft next to real
# screenshots in the same PR. The CLI (`npx playwright screenshot`) has no flag
# for it, hence the inline script. Must run inside the repo so `playwright`
# resolves from node_modules.
set -euo pipefail

html=${1:?input html required}
out=${2:?output png required}
w=${3:-1200}
h=${4:-630}

cd "$(git rev-parse --show-toplevel)"

node -e '
const path = require("path");
const { chromium } = require("playwright");
const [html, out, w, h] = process.argv.slice(1);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: +w, height: +h },
    deviceScaleFactor: 2,
  });
  await page.goto("file://" + path.resolve(html));
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(250);
  // Clip to the body box, not the viewport: fullPage pads short content with
  // dead space, and a panel with a 200px white margin looks broken in a PR.
  const body = page.locator("body");
  await body.screenshot({ path: out });
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
' "$html" "$out" "$w" "$h"

echo "rendered $out"
