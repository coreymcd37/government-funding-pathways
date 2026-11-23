#!/usr/bin/env node
/**
 * Builds the state guide pages, sitemap.xml and llms.txt from the one data source:
 * the `const states = {...}` object inside index.html (the planner itself).
 * Run: node scripts/build.mjs        (writes files)
 *      node scripts/build.mjs --check (exits 1 if any generated file is out of date)
 * No dependencies.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ORIGIN = "https://funding.coreymcdaniel.com";
const AS_OF = "October 2026";
const PERSON = { "@type": "Person", "@id": "https://coreymcdaniel.com/#person", name: "Corey McDaniel", url: "https://coreymcdaniel.com/",
  sameAs: ["https://github.com/coreymcd37", "https://www.linkedin.com/in/mcdanielcorey"] };

export function loadStates() {
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  const m = html.match(/const states = (\{[\s\S]*?\n\});/);
  if (!m) throw new Error("states object not found in index.html");
  const states = Function(`"use strict"; return (${m[1]});`)();
  // the order of the <select> is the display order
  const order = [...html.matchAll(/<option value="([a-z]{2})">/g)].map((x) => x[1]).filter((c) => states[c]);
  return order.map((code) => ({ code, slug: states[code].name.toLowerCase().replace(/\s+/g, "-"), ...states[code] }));
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const ext = (r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.text)}</a>`;

function faqFor(s) {
  return [
    [`Where do I file to start a nonprofit in ${s.name}?`, text(s.npInc.replace(/<strong>[\s\S]*?<\/strong>/, ""))],
    ["How much does it cost to apply for 501(c)(3) status?", "IRS Form 1023-EZ costs $275 and the full Form 1023 costs $600, paid through Pay.gov. The EIN itself is free at IRS.gov."],
    [`Where can a small business in ${s.name} get funding help?`, `${s.bizNote} SBA programs are national; SBA Lender Match (sba.gov/lendermatch) connects you with participating lenders.`],
  ];
}

function statePage(s, all) {
  const url = `${ORIGIN}/${s.slug}/`;
  const title = `Start a Nonprofit or Fund a Business in ${s.name} (2026)`;
  const desc = `${s.name}: where to file a nonprofit, state fees and 501(c)(3) steps, plus small business funding help (SBA, SBDC, state programs). Free guide.`;
  const faq = faqFor(s);
  const links = [...s.npResources, ...s.bizResources].filter((r, i, a) => a.findIndex((x) => x.url === r.url) === i);
  const graph = [
    { "@context": "https://schema.org", "@type": "WebPage", "@id": url, url, name: title, description: desc, inLanguage: "en",
      about: [`Starting a nonprofit in ${s.name}`, `Small business funding in ${s.name}`], spatialCoverage: { "@type": "State", name: s.name },
      isPartOf: { "@type": "WebSite", "@id": `${ORIGIN}/#site`, name: "Government Funding Pathways", url: `${ORIGIN}/` }, author: PERSON },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Government Funding Pathways", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: s.name, item: url }] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  const azExtra = s.code === "az"
    ? `\n      <p>Looking for everyday help in Arizona (food, housing, health care, legal aid, job training)? See the <a href="https://azhub.coreymcdaniel.com/">CMD Resource Hub Arizona</a>.</p>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="robots" content="noai, noimageai">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="Corey McDaniel">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Government Funding Pathways"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${ORIGIN}/img/og-funding.png"><meta property="og:image:alt" content="Government Funding Pathways: nonprofit and small business funding steps for ${esc(s.name)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${ORIGIN}/img/og-funding.png">
<link rel="icon" href="/img/favicon-32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="stylesheet" href="/css/guide.css">
${graph.map(ld).join("\n")}
</head>
<body>
<div class="container">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Government Funding Pathways</a> › ${esc(s.name)}</nav>
  <main>
    <h1>Start a nonprofit or fund a small business in ${esc(s.name)}</h1>
    <p class="lead">The ${esc(s.name)} filing office, fees and official links, plus the federal steps every nonprofit and small business follows. Information as of ${AS_OF}.</p>
    <p class="note">Independent educational guide by Corey McDaniel. Not affiliated with, endorsed by, or operated by any government agency. Not legal, financial, or tax advice. Fees and rules change, so confirm on the official sites below.</p>

    <section class="card" aria-labelledby="np">
      <h2 id="np">Nonprofit: forming in ${esc(s.name)}</h2>
      <p>${esc(s.npNote)}</p>
      <p>${s.npInc.replace(/<strong>\d+\.\s*([\s\S]*?)<\/strong>/, "<strong>$1:</strong>")}</p>
      <h3>Federal steps (every state)</h3>
      <ol>
        <li>Get an EIN, free online at <a href="https://www.irs.gov/" target="_blank" rel="noopener">IRS.gov</a>.</li>
        <li>Adopt bylaws and open a dedicated bank account.</li>
        <li>Apply for 501(c)(3) status: Form 1023-EZ ($275) or Form 1023 ($600) via Pay.gov.</li>
        <li>Register at <a href="https://sam.gov" target="_blank" rel="noopener">SAM.gov</a> for a UEI, then set up <a href="https://www.grants.gov" target="_blank" rel="noopener">Grants.gov</a> (allow 1–4 weeks).</li>
        <li>Keep up with state registration, annual reports and the Form 990 series.</li>
      </ol>
    </section>

    <section class="card" aria-labelledby="biz">
      <h2 id="biz">Small business funding in ${esc(s.name)}</h2>
      <p>${esc(s.bizNote)}</p>
      <p>SBA programs are national. Start with <a href="https://www.sba.gov/loans" target="_blank" rel="noopener">SBA Loans</a> and <a href="https://www.sba.gov/loans/lender-match/" target="_blank" rel="noopener">SBA Lender Match</a>; a local SBDC can review your documents for free.</p>
    </section>

    <section class="card" aria-labelledby="links">
      <h2 id="links">Official ${esc(s.name)} links</h2>
      <ul>
        ${links.map((r) => `<li>${ext(r)}</li>`).join("\n        ")}
      </ul>${azExtra}
    </section>

    <section class="card" aria-labelledby="faq">
      <h2 id="faq">Questions</h2>
      ${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n      ")}
    </section>

    <p><a class="cta" href="/?state=${s.code}">Open the step-by-step planner for ${esc(s.name)}</a></p>

    <section aria-labelledby="other">
      <h2 id="other">Other states</h2>
      <ul class="others">
        ${all.filter((o) => o.code !== s.code).map((o) => `<li><a href="/${o.slug}/">${esc(o.name)}</a></li>`).join("\n        ")}
      </ul>
    </section>
  </main>
  <footer>
    <p>Information as of ${AS_OF}. Verify on official .gov sites. Educational planning only — not legal, financial, or tax advice.</p>
    <p>Made by <a href="https://coreymcdaniel.com/">Corey McDaniel</a> · <a href="/">Government Funding Pathways</a></p>
  </footer>
</div>
</body>
</html>
`;
}

function sitemap(all) {
  const urls = [`${ORIGIN}/`, ...all.map((s) => `${ORIGIN}/${s.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`;
}

function llms(all) {
  return `# Government Funding Pathways

> A free, independent educational planner by Corey McDaniel (Tempe, Arizona) for two paths: forming a nonprofit and seeking grants, or financing a for-profit small business. It covers ${all.length} U.S. states: ${all.map((s) => s.name).join(", ")}. It is not affiliated with any government agency and is not legal, financial or tax advice.

The planner has a nonprofit pathway (11 steps: mission, board, registered agent, state filing, EIN, bylaws, 501(c)(3), SAM.gov and Grants.gov, grant search, state compliance, other funding) and a business pathway (10 steps: entity, EIN and banking, documents, eligibility, SBDC counseling, lenders, application, underwriting, closing, repayment). Each state adds its filing office, fees and official links. Checklist progress is saved only in the browser; nothing is uploaded. Information as of ${AS_OF}.

## Planner

- [Government Funding Pathways](${ORIGIN}/): choose a state and a pathway; add ?state=xx (for example ?state=ky) to open a state

## State guides

${all.map((s) => `- [${s.name}](${ORIGIN}/${s.slug}/): nonprofit filing in ${s.name}, fees, official links and small business funding help`).join("\n")}

## Related

- [Corey McDaniel](https://coreymcdaniel.com/): personal site, apps and contact
- [CMD Resource Hub Arizona](https://azhub.coreymcdaniel.com/): directory of Arizona assistance programs
- [Source code](https://github.com/coreymcd37/government-funding-pathways)
`;
}

function stateLinks(html, all) {
  const start = "<!--STATE-LINKS-->";
  const block = all.map((s) => `<li><a href="/${s.slug}/">${esc(s.name)}</a></li>`).join("\n      ");
  // the marker stays in the file so every build rewrites the same block
  return html.replace(/<!--STATE-LINKS-->[\s\S]*?(\n    <\/ul>)/, `${start}\n      ${block}$1`);
}

export function outputs() {
  const all = loadStates();
  const files = new Map();
  for (const s of all) files.set(join(s.slug, "index.html"), statePage(s, all));
  files.set("sitemap.xml", sitemap(all));
  files.set("llms.txt", llms(all));
  files.set("index.html", stateLinks(readFileSync(join(ROOT, "index.html"), "utf8"), all));
  return { all, files };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { all, files } = outputs();
  const check = process.argv.includes("--check");
  let stale = 0;
  for (const [rel, body] of files) {
    const file = join(ROOT, rel);
    const cur = existsSync(file) ? readFileSync(file, "utf8") : null;
    if (cur === body) continue;
    if (check) { console.error(`out of date: ${rel}`); stale++; continue; }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
  }
  if (check && stale) { console.error("run: node scripts/build.mjs"); process.exit(1); }
  console.log(`${check ? "checked" : "built"} ${all.length} state guides, sitemap.xml, llms.txt`);
}
