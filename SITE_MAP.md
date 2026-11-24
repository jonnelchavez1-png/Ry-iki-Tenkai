# SITE_MAP.md

Repo: jonnelchavez1-png/Ry-iki-Tenkai (main). Live: jldechavezworks.com (Cloudflare Workers `ry-iki-tenkai`).
Read this first. Open only the file the request touches.

## Pages
| Path | File |
|---|---|
| / | index.html |
| /tools | tools.html (+ tools-gate.js) |
| /experience | experience.html |
| /projects/* | projects/<slug>.html |

## index.html sections (in order)
- #about (intro + photo/video block)
- #services: "How I can help" cards i.-vii. Card i. is the wide "Current area" card (Ongoing development chips). Card iv. = Order & supply chain coordination (circular SVG diagram + "How the loop works" in More detail).
- Featured project: AnyJuanPOS (`.project-feature`)
- #projects: "More projects" carousel (`ul.pj-track`, js/projects.js). Counter text "1-4 of 7".
- Tools, Experience, Contact (see file)

## More projects carousel order
1. AnyCALENDARIO  -> /projects/anycalendario
2. TEGOWA  -> /projects/tegowa
3. Smart Document Processor  -> /projects/document-processor
4. AnyJuandraft  -> /projects/anyjuandraft (old /projects/outlook-email-templates redirects here via _redirects)
5. AnyJuanPDF  -> /projects/anyjuanpdf
6. Automation & integration tool  -> /projects/automation-integration
7. More small tools  -> /projects/small-tools

Prev/Next links at the bottom of each project page (`nav.pj-pn`) follow this order.
AnyJuanPOS (featured) has no prev/next; AnyCALENDARIO's "previous" points to it and small-tools' "next" points to it.
Also exists: projects/allaboutpdf.html, projects/retailer-pos.html (not in carousel).

## CSS / JS
- css/styles.css (main; diagram classes `.hs-*`), css/photo-grid.css, enhancements.css, styles.css (root)
- js/main.js, projects.js, chat.js (site chatbot answers), gallery.js, photo-grid.js, access.js, services.js
- Icons: assets/project-icons.svg (symbols `#i-*`)
- Cache: bump `?v=YYYYMMDD` on changed CSS/JS/icon links.

## Facts
(Jonnel to fill: employers, dates, metrics, tools. Do not invent.)

## Locked
(Jonnel to fill: anything that must not change without explicit approval.)

## Pending
- AnyCALENDARIO page: status badge, Status/Type/Built with row, hero image, What it does, Why, Where it stands, screenshots (TODO comments in projects/anycalendario.html).
- AnyCALENDARIO card image: currently icon placeholder.
- Confirm 2026-11-22 changes work after upload.

## Log
- 2026-11-25: Outlook email template generator replaced by AnyJuandraft (card, page, 6 screenshots, icon, redirects, links).
- 2026-11-22: Card iv diagram made circular; "Current focus" -> "Current area"; "Currently learning" -> "Ongoing development"; AnyCALENDARIO added first in carousel + stub page; SITE_MAP.md created.
