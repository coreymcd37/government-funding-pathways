/**
 * Checks for the static site. Serves the repo root the way Cloudflare Pages does
 * (dir/ -> dir/index.html, 404.html with status 404) and drives Chrome.
 *   CHROME_PATH=/path/to/chrome npm test   (defaults to the installed Google Chrome)
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright-core";
import { ROOT, ORIGIN, loadStates } from "../scripts/build.mjs";

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
const server = createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (p.endsWith("/")) p += "index.html";
  const file = join(ROOT, p);
  try {
    if ((await stat(file)).isDirectory()) { res.writeHead(308, { Location: p + "/" }); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }); res.end(await readFile(file));
  } catch { res.writeHead(404, { "Content-Type": TYPES[".html"] }); res.end(await readFile(join(ROOT, "404.html"))); }
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const test = async (name, fn) => { try { await fn(); pass++; console.log(`  ok   ${name}`); } catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); } };
const assert = (c, m) => { if (!c) throw new Error(m); };

const states = loadStates();
const pages = ["/", ...states.map((s) => `/${s.slug}/`)];
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

console.log("static");
await test("every page: one title ≤ 60, description ≤ 155, canonical on funding.coreymcdaniel.com, valid JSON-LD", () => {
  for (const u of pages) {
    const h = read(u === "/" ? "index.html" : `${u.slice(1)}index.html`);
    const t = h.match(/<title>([^<]*)<\/title>/g); assert(t && t.length === 1, `${u} title count`);
    const title = t[0].replace(/<\/?title>/g, "").replace(/&amp;/g, "&"); assert(title.length <= 60, `${u} title ${title.length}`);
    const d = h.match(/<meta name="description" content="([^"]*)"/)[1].replace(/&amp;/g, "&"); assert(d.length <= 155, `${u} description ${d.length}`);
    assert(h.includes(`<link rel="canonical" href="${ORIGIN}${u}">`), `${u} canonical`);
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
    assert(/Not affiliated with, endorsed by, or operated by any government agency/.test(h), `${u} disclaimer`);
  }
});
await test("FAQPage JSON-LD only where the same questions are visible", () => {
  for (const u of pages) {
    const h = read(u === "/" ? "index.html" : `${u.slice(1)}index.html`);
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const o = JSON.parse(m[1]); if (o["@type"] !== "FAQPage") continue;
      for (const q of o.mainEntity) assert(h.includes(`<summary>${q.name.replace(/&/g, "&amp;")}</summary>`), `${u} FAQ not visible: ${q.name}`);
    }
  }
});
await test("sitemap lists exactly the planner and every state guide", () => {
  const locs = [...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert(JSON.stringify(locs) === JSON.stringify(pages.map((u) => ORIGIN + u)), locs.join(" "));
});
await test("robots.txt allows search and AI search crawlers and points at the sitemap; IndexNow key file holds its own name", () => {
  const r = read("robots.txt");
  assert(/User-agent: \*\nAllow: \//.test(r) && r.includes(`Sitemap: ${ORIGIN}/sitemap.xml`) && r.includes("User-agent: OAI-SearchBot"), "robots");
  const key = readdirSync(ROOT).find((f) => /^[a-f0-9]{32}\.txt$/.test(f)).slice(0, 32);
  assert(read(`${key}.txt`) === key, "key file");
});

console.log("browser");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome" });
const axe = readFileSync(join(ROOT, "node_modules/axe-core/axe.min.js"), "utf8");
for (const [w, h] of [[1280, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await test(`@${w}: ?state=ky opens the planner on Kentucky`, async () => {
    await page.goto(`${BASE}/?state=ky`);
    assert(await page.inputValue("#stateSelect") === "ky", "select");
    assert((await page.textContent("#np-state-note")).startsWith("Kentucky:"), "note");
  });
  await test(`@${w}: every page loads with no console errors, no horizontal scroll, and no axe violations`, async () => {
    for (const u of pages) {
      await page.goto(BASE + u);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert(sw <= 0, `${u} scrolls sideways by ${sw}px`);
      await page.addScriptTag({ content: axe });
      const v = await page.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
      assert(!v.length, `${u}: ${v.join(", ")}`);
    }
    assert(!errors.length, errors.join(" | "));
  });
  await test(`@${w}: each state guide links to the planner preset for that state`, async () => {
    for (const s of states) {
      await page.goto(`${BASE}/${s.slug}/`);
      await page.click(".cta"); await page.waitForLoadState();
      assert(await page.inputValue("#stateSelect") === s.code, s.code);
    }
  });
  await page.close();
}
await test("unknown URL gets the 404 page with links home", async () => {
  const page = await browser.newPage(); const r = await page.goto(`${BASE}/nope`);
  assert(r.status() === 404 && (await page.locator('a[href="/"]').count()) > 0, "404"); await page.close();
});
await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
