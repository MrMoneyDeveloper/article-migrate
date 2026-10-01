# Article Migrate — CX Experts

## Overview and handover status

Article Migrate is a private Zendesk Support nav-bar application for exporting Help Center articles to CSV and creating categories, sections, and articles from a CSV in the current instance. It supports instance-to-instance migration and manually prepared content.

This README is the operator guide, developer setup guide, release runbook, and technical handover for **v0.2.1**. It describes implemented behavior; suggested improvements are identified separately.

| Item | Current setup |
| --- | --- |
| Product / branding | Article Migrate / CX Experts |
| Runtime | Browser-based React application inside Zendesk Support |
| Location | `support.nav_bar` |
| Framework | Zendesk Apps Framework (ZAF) 2.0 |
| Installation | Private app uploaded as a ZIP |
| Package | `Article-Migrate-0.2.1.zip` |
| Integration | ZAF `client.request` calls to Help Center APIs |
| Backend / database / ZIS | None configured |
| Authentication | Existing Zendesk app/session context; no API-key entry screen |
| Persistent job history | None; working state and results are in browser memory |
| Verification | Browser checks use mocked Zendesk responses; live Zendesk acceptance remains outstanding |

**Import creates new content. It does not update, merge, or match existing Zendesk records. Repeating an import can create duplicates.**

### Reading guide

- Operators: [Operator guide](#operator-guide), [CSV contract](#csv-contract), and [Failure recovery](#failure-recovery).
- Developers: [Local development](#local-development), [Source map](#source-map), and [Architecture](#architecture).
- Release owners: [Build and packaging](#build-and-packaging), [Installation and release](#installation-and-release), and [Handover checklist](#handover-checklist).

## Features and boundaries

### Implemented

- Export accessible articles from the current instance into a CSV containing parent category/section names.
- Attempt an automatic export download and retain a visible **Download CSV** link for manual download/retry.
- Download a blank template with the supported headings and read in-app filling instructions.
- Select, replace, or drag and drop a CSV.
- Validate required headers/values, show errors and warnings, and preview hierarchy.
- Generate a local dry-run creation plan without API requests.
- Require successful validation, a dry run, and exact `MIGRATE` confirmation before creation.
- Create parent records before their children and display final record statuses, IDs, and errors.
- Keep workflow actions visible while longer content scrolls inside the Zendesk frame.
- Display CX Experts branding, hover feedback, and subtle message animations with reduced-motion support.

### Not implemented

- Existing-record updates, destination deduplication, ongoing synchronization, or matching existing parents.
- Automatic retry/backoff, resume, cancellation, transactional rollback, or saved migration history.
- Percentage progress or live per-record result streaming.
- Copying attachment/image files, rewriting links, preserving original IDs, or transferring authors, permissions, comments, revision history, and translations.
- A separate ZIS workflow, backend service, scheduled migration, or deployment pipeline.
- A measured maximum row count or guaranteed migration time.

## Operator guide

### Export from the current instance

1. Open Article Migrate in the source instance's Zendesk Support nav bar.
2. Select **Export from instance** and click **Export Help Center CSV**.
3. Wait for the export-ready notice and category, section, and article counts.
4. If the automatic download does not start, click **Download CSV**. The file is `article-migrate-export.csv`.
5. Use **Refresh export** only to fetch a new snapshot. Downloading the existing file again does not repeat API requests.

The generated file remains available in the app session until successfully replaced or the app is closed/unmounted. Download and retain it before leaving. A reload loses in-memory state.

The CSV contains one row per article. Empty categories/sections are not represented independently, even though the summary counts all returned parents. This format is an article transfer format, not a complete Help Center backup.

### Prepare articles manually

1. Select **Import articles** and click **Download CSV template**.
2. Open `article-migrate-template.csv` in a spreadsheet editor.
3. Keep the exact lowercase headings and add one article per row. The template contains no example articles.
4. Complete `category`, `section`, `title`, and `body_html` for every row.
5. Set optional fields as needed; use `draft` while testing a destination.
6. Save as comma-delimited **CSV UTF-8**. XLSX files are not supported directly.

The expandable **How to fill in the template** help is available in the app.

### Import, validate, dry-run, and confirm

1. Open the app in the **destination** instance and select **Import articles**.
2. Click **Upload CSV** or drop the file into the upload area. Check the filename.
3. Click **Validate CSV** in the fixed footer.
4. Correct any errors in the CSV and use **Replace CSV**. Replacing a file clears validation, results, and confirmation.
5. After validation passes, review counts, warnings, and **Preview article hierarchy**.
6. Click **Run Dry Run** and review the planned category, section, and article records.
7. Confirm the destination and publication intent. Type `MIGRATE` exactly.
8. Click **Start Migration** and keep the app open until completion.
9. Review **Migration results** and verify created records in Zendesk.

The dry run is a **local creation plan**. It does not verify live permissions, existing destination records, locale availability, or whether Zendesk will accept each API payload.

### Feedback and control states

| State | Meaning / next action |
| --- | --- |
| Selected filename | Local file selected; nothing created |
| Validation passed | Required CSV checks passed; review warnings and counts |
| Validation errors | Fix reported values/headers and upload again |
| `DRY_RUN` / Dry run passed | Local plan produced; no content created |
| `planned` | Record intended for creation |
| Migrating… | Sequential API creation is running; keep the app open |
| `COMPLETED` | Every attempted record creation reported success |
| `COMPLETED_WITH_ERRORS` | At least one failure; successful records may already exist |
| `success` and ID | Zendesk returned an ID for the created record |
| `failed` and error | API request or parent dependency failed |

Dependent actions stay visible but disabled until their prerequisites are met. Mode switching and workflow actions are disabled during an operation. Status changes scroll the notice into view. Final migration results are displayed after the run, not streamed as each request completes.

## CSV contract

Template and export headers:

```csv
category,section,title,body_html,status,locale,position,labels
```

| Column | Required | Behavior |
| --- | --- | --- |
| `category` | Yes | Category name; groups rows within the run |
| `section` | Yes | Section name under the row's category |
| `title` | Yes | Article title |
| `body_html` | Yes | Text or HTML passed through as article body |
| `status` | No | Exact `published` requests publication; blank/`draft` become draft; other values warn and become draft |
| `locale` | No | Passed in creation URLs; defaults to `en-us` |
| `position` | No | Converted using JavaScript `Number`; non-finite values are omitted without an error |
| `labels` | No | Split on semicolons or pipes; trimmed and empty labels removed |
| `article_key` | No | Additional accepted local identifier; absent from template/export; not an update/matching key |

Example draft-only test file:

```csv
category,section,title,body_html,status,locale,position,labels
Getting started,Basics,Welcome,"<p>Welcome to the Help Center.</p>",draft,en-us,0,welcome;onboarding
Getting started,Basics,Contact support,"<p>Contact our support team for help.</p>",draft,en-us,1,support
```

### Parsing and validation details

- Headers are case-sensitive. Surrounding whitespace is trimmed; `Title` does not satisfy `title`.
- A UTF-8 byte-order mark is removed before parsing. Export includes one for spreadsheet compatibility.
- Quoted commas, doubled quotes, and newlines inside quoted fields are handled. Quote cells containing these characters and double embedded quotes.
- Blank data rows are skipped. Header-only files fail with `NO_ARTICLES`.
- All cell values are trimmed, including leading/trailing body whitespace.
- Required values must be nonempty. HTML syntax and locale availability are not validated.
- Numeric position constraints, duplicate headers, malformed quoting, and destination API requirements are not comprehensively validated.
- Unknown columns do not become API fields; author IDs and access-control columns are not migrated.
- Error row numbers follow filtered data rows plus the header; blank lines and multiline values can make them differ from physical file line numbers.

### Hierarchy matching caveat

Category and section grouping lowercases names, replaces runs of non-ASCII-alphanumeric characters with hyphens, and trims leading/trailing hyphens. Names with the same normalized key share a parent within a run: `Help!` and `Help` both become `help`. Names made entirely of non-Latin characters can produce empty keys.

Grouping keys do not include locale. The first row for a grouped parent supplies its name and locale. Review the preview carefully for punctuation/case collisions and mixed locales. This app is not a translation migration tool.

## Local development

### Prerequisites

The handover workstation uses **Node.js 24.15.0**, **npm 11.12.1**, **Python 3.13.7**, and Microsoft Edge. These are observed development versions, not a declared minimum support matrix.

- Node/npm: dependencies and asset builds.
- Python: preview server and ZIP packaging; only the standard library is needed for packaging.
- Microsoft Edge: tests explicitly use Playwright's `msedge` channel.
- Network access: dependency installation and the hosted ZAF SDK during ordinary preview.

### Install and build

Run from the project root:

```powershell
npm ci
npm run build
```

Use the committed lockfile. The package is private and is not intended for npm publication.

### Preview

Keep this running in a separate terminal:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/assets/iframe.html`. Stop with Ctrl+C. There is no hot reload: rebuild source changes and refresh the browser.

Template download, file selection, validation, and dry run work locally. Live export and migration require the installed Zendesk app.

### Browser verification

With assets built and the preview server running:

```powershell
npm test
```

The test script does not start a server. Port `8765` and the Edge channel are hardcoded in `scripts/verify.cjs`.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/workspace.jsx` | Current UI, state, operation lock, notices, workflow gates, confirmation, download lifetime |
| `src/app.js` | ZAF initialization, CSV parsing/validation, hierarchy plan, export/import services, errors, app mount |
| `src/vendor.js` | Retained compiled React/runtime code from the supplied app; avoid editing vendor internals |
| `src/branding.js` | Template/help component; also retains an older BrandBar component |
| `src/workspace.css` | Current viewport, scrolling, footer, compact-screen layout |
| `src/design.css` | Shared branding/template styles and retained earlier styles |
| `assets/assets/index-ByY6Alv_.css` | Original baseline CSS still imported at build time; do not delete as unused |
| `assets/assets/index-C9GsudZm.js` | Original compiled JS retained for reference, not the current entry point |
| `assets/iframe.html` | Entry HTML, hosted SDK, current bundle references |
| `assets/assets/article-migrate.js` | Generated bundle; rebuild rather than hand-edit |
| `assets/assets/article-migrate.css` | Generated CSS; rebuild rather than hand-edit |
| `assets/assets/article-migrate.js.LEGAL.txt` | Generated third-party license notices |
| `assets/article-migrate-template.csv` | Blank eight-column template |
| `assets/cx-experts-logo.png` | Brand asset |
| `manifest.json` | App identity, author, version, private flag, location, ZAF version |
| `requirements.json` | Empty resource-requirements declaration |
| `translations/en.json` | App metadata; interface labels/messages currently live in source |
| `scripts/build.mjs` | esbuild configuration |
| `scripts/package.py` | Release allowlist, ZIP creation, integrity check |
| `scripts/verify.cjs` | Playwright checks with mocked SDK/API responses |
| `artifacts/` | Ignored screenshots and working artifacts; never release this directory |
| `package.json`, `package-lock.json` | Scripts and dependency resolution |

The original project arrived as compiled assets. Application logic was extracted into `src/app.js`, so abbreviated function names and unused legacy UI helpers remain. The code has not been fully refactored into conventional named service modules.

## Architecture

```text
Zendesk Support nav-bar iframe
  -> iframe.html + hosted ZAF SDK
  -> React Workspace
     -> CSV -> parse -> validate -> hierarchy preview -> dry-run plan
     -> MIGRATE confirmation -> ZAF client.request -> Help Center creation
     -> export -> paginated reads -> CSV Blob -> download link
```

### Export sequence

`qd.exportCsv()` reads categories, sections, and articles in sequence. `ql()` follows each response's `next_page` until absent.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v2/help_center/categories.json` | Category lookup |
| GET | `/api/v2/help_center/sections.json` | Section lookup and parent relationship |
| GET | `/api/v2/help_center/articles.json` | Article data and section relationship |

Missing parents produce blank names that fail required-field validation on import. Reads are not an atomic snapshot. A failed collection request does not produce a new completed export; an earlier successful download may remain available.

`rp()` serializes eight columns using CRLF and a UTF-8 BOM. `lp()` escapes CSV values. The download is a browser Blob URL, not a server-stored file.

### Import sequence

`Jd.migrate()` creates records sequentially, retaining new parent IDs in maps:

| Order | POST endpoint | Payload |
| --- | --- | --- |
| 1 | `/api/v2/help_center/{locale}/categories.json` | `category.name` |
| 2 | `/api/v2/help_center/{locale}/categories/{categoryId}/sections.json` | `section.name` |
| 3 | `/api/v2/help_center/{locale}/sections/{sectionId}/articles.json` | `article.title`, `body`, `draft`, optional `position`, `label_names` |

Only newly created parents are used. The app does not look up destination parents by name. Failed parents cause dependent records to be marked failed; independent records can continue. Partial success is possible.

### Implementation identifiers

| Identifier | Role |
| --- | --- |
| `Wd`, `Jl` | UI/service wiring and lazy ZAF client initialization |
| `Zd` | Validation and normalized rows |
| `tp`, `np` | Header/row mapping and CSV parsing |
| `Xd`, `Gd` | Hierarchy preview and local dry-run plan |
| `Jd`, `bd`, `ep` | Migration and unique parent collection |
| `qd`, `ql` | Export and pagination |
| `rp`, `lp` | CSV Blob and escaping |
| `fe` | Name normalization |
| `Lr` | Error-message extraction |

### Layout and download decisions to preserve

Zendesk allocates the nav-bar iframe height. The app does not invoke content-driven ZAF resize. Its root is a vertical flex layout, the content area has `min-height: 0` and `overflow-y: auto`, and the footer does not shrink. This prevents results pushing confirmation controls below the host viewport.

Do not reintroduce a tall minimum-height page or large hero without repeating constrained-iframe checks. Keep the scroll area keyboard-accessible and preserve reduced-motion behavior.

The download URL remains alive for the explicit Download CSV link. Cleanup revokes it when the export changes or the component unmounts. Do not revoke immediately after an automatic click: a browser may suppress/delay that attempt, and the user needs the manual link.

## Build and packaging

```powershell
npm run package
```

This builds assets and creates `Article-Migrate-0.2.1.zip` at the project root. The script checks allowlisted files and ZIP integrity. It does **not** perform Zendesk platform validation or installation.

Archive contents:

```text
manifest.json
requirements.json
translations/en.json
assets/iframe.html
assets/cx-experts-logo.png
assets/article-migrate-template.csv
assets/assets/article-migrate.js
assets/assets/article-migrate.js.LEGAL.txt
assets/assets/article-migrate.css
```

The manifest must remain at the ZIP root. Do not zip the entire working directory: source, dependencies, working artifacts, and historical ZIPs are deliberately excluded.

For a new release synchronize:

1. `manifest.json` version.
2. `package.json` and lockfile version metadata.
3. The hardcoded output filename in `scripts/package.py`.
4. README release references and release notes.

Commit the lockfile and regenerated deployable assets with source changes. Preserve the license notice. Keep the historical 0.2.0 ZIP distinguishable from the current package.

## Installation and release

1. Confirm source/destination instances and an account with appropriate Guide/content-creation access.
2. Review `manifest.json`: `author.email` is still `replace@example.com`. Set the approved owner/support address before external distribution.
3. Build, run browser checks on the fresh assets, and package.
4. Install/update the private app in Zendesk Admin Center using the release ZIP.
5. Open it in Support's nav bar and check branding, scrolling, and controls at normal zoom.
6. In a test instance, export known content and exercise automatic and manual downloads.
7. Import a small draft-only batch. Validate, dry-run, confirm, and inspect actual parents, titles, bodies, labels, and status.
8. Record version, package, instance, acceptance outcome, and created record IDs in the team's release record.
9. Proceed with production use only after live acceptance is recorded. A Git push does not install the Zendesk app.

### Rollback distinction

Installing an older package changes application code only. It does not undo created content. Content rollback requires a separate reconciliation and deliberate deletion/repair of created IDs in Zendesk; this app has no rollback action.

## Verification and acceptance

### Automated coverage

`npm test` checks:

- Template filename/headings, empty-template rejection, completed and required-only CSVs.
- Validation, hierarchy, and dry run without API writes.
- Mocked parent/article creation and completion status.
- Export escaping and CSV round trip.
- Three repeated downloads without another API export.
- Widths from 320 to 1920 pixels and reduced-motion mode.
- A sandboxed, constrained iframe, including a 320 × 480 host viewport.
- Visible footer controls after a 100-article dry run.
- Manual download when automatic anchor clicking is suppressed.
- Absence of uncaught browser JavaScript errors in those scenarios.

Screenshots are written under `artifacts/`. Mocked SDK tests do not establish live authentication, permission, API contract, or publication compatibility. Real rate limits, large-account pagination, mixed locales, partial API failure paths, and large-file performance are not comprehensively covered.

### Live acceptance checklist

- [ ] Confirm installed version and target instance.
- [ ] Check real Zendesk layout at normal zoom and on a short laptop screen.
- [ ] Compare export counts/content against a known small dataset.
- [ ] Download again without refreshing the export.
- [ ] Exercise required-field errors and invalid-status warnings.
- [ ] Verify the dry run creates no records.
- [ ] Create a small draft-only batch and inspect actual Zendesk records/IDs.
- [ ] Confirm required permissions, supported locales, and payload requirements.
- [ ] Reconcile any test records or partial failures.
- [ ] Record release owner and acceptance before production use.

## Failure recovery

Do not immediately rerun the whole file after an error.

1. Keep the app open and capture results, successful IDs, and errors; there is no built-in downloadable migration report.
2. Check the destination for records already created. A lost response or interrupted session can leave server-side content.
3. Inspect parent failures before dependent article errors.
4. Resolve the actual permission, locale, payload, or rate-limit cause.
5. Plan reconciliation before retrying. Even a file containing only failed articles creates new parents; prior-run parents are not reused.
6. Perform agreed cleanup/repair in Zendesk, then test a small corrected batch.

Closing/reloading is not a transactional cancel. There are no saved checkpoints and results cannot be reconstructed by this app once its in-memory state is lost.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Bottom controls clipped | Confirm v0.2.1; inspect workspace/scroll/footer styles; repeat embedded tests rather than compensating with zoom |
| Dry Run disabled | Upload a file and pass validation |
| Start Migration disabled | Complete a dry run, type exact uppercase MIGRATE, and wait for active operations |
| Required column missing | Use exact lowercase headings and comma-delimited CSV, not XLSX or semicolon-delimited CSV |
| Optional labels missing | Supported; required-only CSV is covered by tests |
| Download does not start | Wait for export-ready and use Download CSV; no fresh export needed |
| Local API actions fail | Expected outside Zendesk; use the installed app for live export/import |
| API/access error | Inspect the returned response, user access, Guide availability, locale, and destination configuration |
| Parent not created | Diagnose its error before dependent records |
| Duplicate records | Repeated runs create new content; reconcile manually |
| Unexpected grouping | Inspect normalized names and mixed locales |
| Corrupted characters | Save UTF-8 and inspect the raw CSV before import |
| Tests cannot connect | Start the project-root server on 127.0.0.1:8765 and rebuild |
| Edge launch failure | Install Microsoft Edge or deliberately adapt the configured Playwright channel |
| Packaging failure | Check Python and allowlisted assets; rebuild generated assets |

## Security and data handling

The app uses Zendesk's app/session context rather than embedded credentials. No app-specific environment variables or secret files are required. `requirements.json` is empty; the app implements no separate role policy.

CSV contents, plans, results, and downloads are held in browser memory. There is no application database, localStorage history, analytics integration, or separate backend upload. Export files may contain internal/unpublished content; handle them according to team policy. Do not commit client CSVs, test screenshots, or working artifacts.

The ZAF SDK loads from Zendesk's hosted URL; application bundles and assets are packaged locally. HTML and links pass through rather than being sanitized/remapped by the app. Export does not neutralize formula-like spreadsheet strings; review untrusted CSV content before opening in a spreadsheet editor.

`package.json` currently declares ISC. The business owner should confirm licensing/distribution intent; retain third-party notices in release packages.

## Handover checklist

| Responsibility | Action / status |
| --- | --- |
| Product owner | CX Experts branding is set; assign a named approver |
| Technical maintainer | Assign a maintainer with repository access and development prerequisites |
| Support contact | Replace the manifest's placeholder author email |
| Repository owner | Confirm remote URL, main-branch access, and release policy; no remote is hardcoded in the app |
| Zendesk administrator | Record intended installations, instances, and permission expectations |
| Release operator | Build/test/package, retain release artifact, and install private app |
| Acceptance owner | Record live Zendesk acceptance; mocked tests are not deployment sign-off |
| Content operator | Prepare CSV, confirm destination/status, and reconcile failures |
| Documentation owner | Update this guide when schema, UI, APIs, build steps, or version changes |

### Suggested next work — not current features

1. Establish live integration tests in a disposable Zendesk instance and document the permission/locale matrix.
2. Add an explicit destination identity and exportable result reports.
3. Design destination matching, idempotency, retry/backoff, and resume together before promising safe retries.
4. Strengthen CSV diagnostics and tests for malformed quoting, Unicode, duplicate headers, positions, and locales.
5. Refactor abbreviated services and remove unused legacy UI helpers without changing behavior.
6. Replace retained compiled runtime code with a conventional maintained React dependency setup.
7. Consolidate CSS carefully; the original hashed stylesheet is still a build dependency.
8. Derive package filenames from version metadata and automate release checks.
9. Measure supported file sizes and API performance before setting volume expectations.

## Release history

| Version | Changes |
| --- | --- |
| 0.2.0 | Article Migrate name, CX Experts branding, template/help, drag-and-drop, refreshed design, required-only CSV fix, and empty-template guard |
| 0.2.1 | Compact viewport layout, internal scrolling, visible workflow footer, mandatory dry-run confirmation, clearer notices, persistent export download link, iframe/download regression tests |

Track deployment and live acceptance separately from commits. This documentation does not assert a production installation or completed live migration.
