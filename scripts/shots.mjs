// Screenshots a given route at 390px and 1440px, once per theme, into /screenshots.
// Usage: node scripts/shots.mjs [route]   (default route: /styleguide)
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}`;
const route = process.argv[2] ?? "/styleguide";
const THEMES = ["house", "gzhel", "khokhloma", "zhostovo"];
const WIDTHS = [390, 1440];
const OUT_DIR = path.join(ROOT, "screenshots");

function routeSlug(r) {
  const trimmed = r.replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "home" : trimmed.replace(/\//g, "-");
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
