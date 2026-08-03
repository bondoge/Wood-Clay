// Screenshots a given route at 390px and 1440px, once per theme, into /screenshots.
// Usage: node scripts/shots.mjs [route]   (default route: /)
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}`;
const route = process.argv[2] ?? "/";
// The old 4-theme system (data-theme switching) was retired along with the
// old design system — nothing on the site branches on data-theme anymore, so
// there's nothing left to iterate over.
const THEMES = ["default"];
const WIDTHS = [390, 1440];
const OUT_DIR = path.join(ROOT, "screenshots");

function routeSlug(r) {
  const trimmed = r.replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "home" : trimmed.replace(/\//g, "-");
}

// next/image defaults to loading="lazy". A fullPage screenshot resizes the
// viewport to the full document height for capture, but that resize alone
// doesn't reliably re-trigger the browser's native lazy-load decision for
// images that were never scrolled into an actual viewport — they can stay
// permanently unfetched and render blank in the screenshot. Scrolling
// through in real steps triggers native lazy-loading the way normal use
// would, before the final full-page capture.
async function scrollThroughPage(page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  const viewport = page.viewportSize();
  const step = viewport ? viewport.height : 800;
  for (let y = 0; y < height; y += step) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  // Images triggered by the last scroll step have had the least time to
  // actually finish fetching (network latency to a remote image host) —
  // give them a real chance to complete before the capture.
  await page.waitForLoadState("networkidle");
}

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status < 500) {
          resolve();
          return;
        }
      } catch {
        // server not up yet
      }
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(attempt, 300);
    };
    attempt();
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Spawn the next bin directly (no shell/npx wrapper) so `server.kill()`
  // below actually terminates the dev server on Windows, instead of only
  // killing an intermediate shell and leaking an orphaned process on PORT.
  const server = spawn(process.execPath, [NEXT_BIN, "dev", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: "pipe",
  });

  let serverOutput = "";
  server.stdout.on("data", (d) => (serverOutput += d.toString()));
  server.stderr.on("data", (d) => (serverOutput += d.toString()));

  try {
    await waitForServer(BASE_URL + route, 60_000);

    const browser = await chromium.launch();
    const slug = routeSlug(route);

    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        const page = await browser.newPage();
        await page.setViewportSize({ width, height: 1024 });
        // Deterministic finished-state capture, per MOTION-SPEC's rule that
        // the reduced-motion state IS the finished state.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(BASE_URL + route, { waitUntil: "networkidle" });
        await page.evaluate((t) => {
          const el = document.querySelector("[data-theme]");
          if (el) el.setAttribute("data-theme", t);
        }, theme);
        await page.waitForTimeout(100);
        await scrollThroughPage(page);

        const file = path.join(OUT_DIR, `${slug}__${theme}__${width}w.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`wrote ${path.relative(ROOT, file)}`);
        await page.close();
      }
    }

    await browser.close();
  } catch (err) {
    console.error("--- dev server output ---");
    console.error(serverOutput);
    throw err;
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
