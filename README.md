# jldechavezworks.com

Static portfolio site (plain HTML, CSS, and a little JavaScript). No build step, no backend, no database.

## Structure

```
index.html                 Home page (hero, about, services, experience, projects, tools, approach, contact)
projects/retailer-pos.html Project detail page (copy this file for each new project)
css/styles.css             All styles; colors and fonts are CSS variables at the top
js/main.js                 Mobile menu, footer year, scroll reveal
assets/                    Images and favicon
_headers                   Cloudflare Pages headers (security + caching)
robots.txt, sitemap.xml    SEO
```

## Deploy on Cloudflare Pages (GitHub)

1. Push this folder to a GitHub repository.
2. Cloudflare dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git -> pick the repo.
3. Framework preset: **None**. Build command: leave empty (or `exit 0` if the form insists). Build output directory: `/` if it accepts it, otherwise leave blank. The site files must sit at the top level of the repo.
4. After the first deploy, open the project -> Custom domains -> add `jldechavezworks.com`.

Every push to the main branch redeploys automatically.

## Adding pictures

Look for `class="media-slot"` in `index.html` (the photo strip under About) and `projects/retailer-pos.html` (screenshot gallery). To fill one:

```html
<figure class="media-slot has-image">
  <img src="/assets/my-picture.webp" alt="Describe the picture" width="1200" height="900" loading="lazy">
</figure>
```

Delete any slot you don't want. Resize images to about 1200px wide and save as WebP or JPG before adding them.
Only use sample data in screenshots, never real customer records, emails, or credentials.

## Adding a project

1. Copy `projects/retailer-pos.html` to `projects/your-project.html` and edit the text.
2. In `index.html`, add a card in the Projects section that links to it (or move an item out of "In the workshop").
3. Add the new URL to `sitemap.xml`.

## Notes

- Contact is by `mailto:` links, so no form backend is needed.
- Fonts (Fraunces and Hanken Grotesk) load from Google Fonts; the site falls back to system fonts if they are blocked.
