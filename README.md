# Corporate Pakistan

**Follow the ownership. See the connections.**

An interactive, evidence-first atlas of disclosed corporate ownership in Pakistan. Explore Fauji, Engro/Dawood, Lucky/Yunus, and Nishat networks; inspect a source for every relationship; and test ownership paths without quietly combining incompatible dates.

**59 companies · 68 entities · 81 disclosed connections · 8 annual reports + 5 official webpages**

> This release covers selected **2025 reporting snapshots**, researched in October 2026. It is not a live or complete shareholder register. Five webpage-based observations are explicitly undated.

## What you can do

- **Explore the network:** search companies or people, filter by network, relationship layer, exact reporting date and minimum stake, and isolate one- or two-step neighborhoods.
- **Inspect evidence:** open a relationship to see its date, ownership percentage, source section and explanatory caveats. Switch to a keyboard-accessible table.
- **Trace ownership:** follow direct and indirect equity paths at one exact reporting date. View each path’s proportional stake calculation and the underlying evidence.
- **Check portfolio overlap:** identify direct shareholders common to several holdings. Portfolio allocation overlap is clearly distinguished from ownership-adjusted economic exposure.
- **Audit and reuse:** download JSON or CSV, inspect 34 evidence sections, and share a filtered view through its URL.

## Research worth exploring

### Economic ownership and governance can differ

At 31 December 2025, FFC held **64.7209% of Askari Bank**, while Fauji Foundation held **7.1914% directly**. FFC’s report explains why the bank is treated as an associate under agreements governing board composition and voting securities. A majority equity percentage alone does not resolve control.

Sources: [Askari Bank Annual Report 2025, printed p. 290](https://askaribank.com/gallery/Askari-AR-2025.pdf); [FFC Annual Report 2025, printed p. 344, note 16.2](https://financials.psx.com.pk/lib/DownloadPDF.php?id=270829).

### A group-held block is not necessarily a parent’s economic interest

Fauji Foods discloses separate direct stakes held by FFC, FFC Energy and FFBL Power. At year-end, FFC owned only **75% of FFBL Power**. The **82.16% aggregate block** described in FFC’s report therefore differs from proportionately weighted economic paths. The dataset never inserts that aggregate as a second direct FFC stake.

Sources: [Fauji Foods Annual Report 2025, printed p. 78](https://www.faujifoods.com/pdf/financialResults/fauji-foods-annual-report-2025.pdf); [FFC Annual Report 2025, printed pp. 346–347](https://financials.psx.com.pk/lib/DownloadPDF.php?id=270829).

### Cross-holdings make naive look-through calculations misleading

At 30 June 2025, Nishat Mills held **31.40% of DG Khan Cement**, while DG Khan Cement held **8.61% of Nishat Mills**. The path finder prohibits repeated nodes and does not sum circular or overlapping paths into an “ultimate ownership” result.

Source: [DG Khan Cement Annual Report 2025, printed p. 17 / PDF p. 18](https://www.dgcement.com/financial-reports/DGAnnual2025.pdf).

## Run locally

Requirements: **Node.js 24+**. The application has **no runtime dependencies**; jsdom is a development-only dependency for DOM integration tests.

```sh
npm ci
node scripts/compile-data.mjs
npm run check
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. A local HTTP server is needed because browser modules fetch the dataset. There are no API keys, accounts, paid services, or AI calls required to run the application.

## Data and code structure

| Path | Purpose |
| --- | --- |
| `src/` | Static application, styling, and pure graph-analysis functions |
| `data/curated/` | Reviewed source observations; edit these to add or correct data |
| `data/ownership.json` | Deterministically compiled, validated dataset |
| `data/relationships.csv` | Portable relationship export with source URLs |
| `data/source-manifest.json` | Hashes of the original annual-report bytes used in research |
| `scripts/compile-data.mjs` | Compile curated observations and CSV |
| `scripts/inspect_report.py` | Retrieve a catalogued report, hash it, extract text and locate candidate pages |
| `tests/` | Calculation, integrity, date-isolation and DOM interaction tests |
| `docs/` | Methodology, review notes, source catalogue and release verification |

The included seed is **manually curated and source reviewed**. PDF extraction assists research; it does not automatically approve ownership claims or refresh the published dataset. Rebuilding reproduces the compilation from the committed observations. Original report files are not redistributed.

## Reproduce source inspection

Install Poppler (`pdftotext`) for the optional Python helper. It uses only the Python standard library.

```sh
python3 scripts/inspect_report.py \
  --source-id fauji-ffc-2025-p344 \
  --out reports/ffc-2025
```

Some issuer sites reject automated downloads or move files. The helper reports failures; it never substitutes a guessed source. You can pass `--local /path/to/report.pdf` to inspect already downloaded bytes. Compare the hash with `data/source-manifest.json`. PDF page indices and printed page numbers can differ, especially with landscape spreads.

## Methodological boundaries

- Edges distinguish **ownership**, **affiliation**, and **directorship**. A group label is an exploration aid, not a legal owner.
- Missing coverage means **unknown**, not zero. Omitted shareholders are not assumed to be public float.
- Numerical path calculations use **one exact date** and proportional ordinary equity assumptions. They do not estimate voting control.
- The path search is limited to six steps and 40 paths; separate paths are not summed.
- Proposed transactions, completed transactions and subsequent events are distinguished. FFBL is not duplicated as a continuing parent after its merger into FFC.
- Names and surnames alone do not establish family ties. Connections do not imply wrongdoing or coordination.

Read [the full methodology](docs/METHODOLOGY.md), [source catalogue](docs/SOURCES.md), and [contribution guide](CONTRIBUTING.md).

## Validation

`npm run check` validates referential integrity, stake ranges and same-date totals, runs 20 tests, and builds `dist/`. Tests cover real Fauji Foods and Nishat paths, mixed-date exclusion, cycle termination, search, filters, evidence UI, shared-view restoration and portfolio input validation.

DOM tests do not render layout or emulate native pointer capture. Browser visual QA was unavailable in the initial build environment; see [release verification](docs/VERIFICATION.md).

## Next research releases

- Add a second year with explicit valid-from/valid-to support and ownership-change comparisons.
- Expand coverage using fresh issuer reports, prioritising missing intermediate holding companies.
- Add more directorship disclosures with independent name resolution.
- Introduce persistent report-specific extraction recipes and reviewed correction history.

## Credits and licensing

Created by **Muhammad Ibaad Ghufran Usmani** as an economics and finance research project, with AI assistance for implementation, source extraction and review. Public disclosures remain attributable to their publishers. This is independent work and is not affiliated with the companies shown.

Code: [MIT](LICENSE). Original structured data compilation: [CC BY 4.0](DATA-LICENSE.md). Original reports retain their respective publishers’ rights.
