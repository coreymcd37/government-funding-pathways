# Government Funding Pathways

A free, independent planner for two paths, state by state:

- **Nonprofit:** form a nonprofit and get ready for grants (11 steps: mission, board, registered agent, state filing, EIN, bylaws, 501(c)(3), SAM.gov and Grants.gov, grant search, state compliance, other funding).
- **Small business:** finance a for-profit business (10 steps: entity, EIN and banking, documents, SBA eligibility, SBDC counseling, lenders, application, underwriting, closing, repayment).

It covers **9 states**: Arizona, California, Texas, Florida, Wisconsin, Kentucky, Nevada, New Mexico and Iowa. Each state adds its filing office, fees, rules and official links, and has its own guide page.

**Live:** https://funding.coreymcdaniel.com (formerly coreymcdaniel.com/projects/funding-gateway, which now redirects here)

> Independent educational tool by Corey McDaniel. Not affiliated with, endorsed by, or operated by any government agency. Not legal, financial or tax advice. Information as of October 2026; fees and rules change, so always confirm on the official sites.

## Features

- State picker and two pathways, with ideas and examples for each
- "Key barriers" notes on credit, bankruptcy or IRS debt, criminal history, income and education
- Checklist progress saved only in your browser (nothing is uploaded, no account)
- Dark and light themes
- One guide page per state (`/arizona/`, `/kentucky/`, ...) with a link that opens the planner on that state (`/?state=ky`)

## How it is built

Plain HTML, CSS and a little JavaScript. No framework, no build step for the planner itself.

The state data lives in one place: the `const states = {...}` object in `index.html`. `scripts/build.mjs` reads it and writes the state guide pages, `sitemap.xml`, `llms.txt` and the state links on the planner.

```sh
node scripts/build.mjs          # regenerate after editing the states object
npm install && npm test         # build check + static and browser checks (uses Google Chrome; set CHROME_PATH)
```

To add a state: add it to `states` and to the `<select>` in `index.html`, then run the build.

## Deploy

Cloudflare Pages (free plan), project `funding-pathways`, custom domain `funding.coreymcdaniel.com`. Deploy the static files (no build command):

```sh
npx wrangler pages deploy . --project-name=funding-pathways --branch=main
```

`.wrangler`, `node_modules` and dotfiles other than `.well-known` are not part of the site.

IndexNow: the ownership file at the site root is `61cc4a7a2b827c7b2de1f9988d5a95a9.txt` (public by design; it only proves the site owns the domain for IndexNow).

## Related

- [Corey McDaniel](https://coreymcdaniel.com/)
- [CMD Resource Hub Arizona](https://azhub.coreymcdaniel.com/) ([repo](https://github.com/coreymcd37/CMD-Resource-Hub-Arizona)): Arizona assistance programs

## License

MIT, see [LICENSE](LICENSE).
