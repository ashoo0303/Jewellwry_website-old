# Aurelia Jewels

A professional five-page, responsive jewellery website built with **HTML5** and **Tailwind CSS v4** (Web Technologies - Assignment 01).

| Page    | File          | Purpose                                                              |
| ------- | ------------- | -------------------------------------------------------------------- |
| Home    | `index.html`  | Hero, categories, filterable bestsellers, bridal offer, reviews      |
| About   | `about.html`  | Brand story, stats, values, timeline, process, team, FAQ             |
| Contact | `contact.html`| Working contact form (Formspree), hours, map, FAQ                    |
| Sign In | `signin.html` | Sign-in form with validation and password toggle                     |
| Sign Up | `signup.html` | Registration form with live password-strength meter                  |

## Project structure

```
.
├── index.html / about.html / contact.html / signin.html / signup.html   <- generated pages (deploy these)
├── assets/
│   ├── css/
│   │   ├── input.css       <- Tailwind source (theme + component classes)
│   │   └── styles.css      <- compiled, minified CSS (committed so the site works without a build)
│   ├── js/main.js          <- navbar, cart drawer, filters, forms, validation
│   ├── images/             <- product and lifestyle photos
│   └── favicon.svg
├── src/
│   ├── partials/           <- shared head, header (navbar), footer, icon sprite, cart drawer
│   └── pages/              <- page-specific content only
├── scripts/build-pages.mjs <- stitches partials + pages into the root HTML files
└── package.json
```

The navbar and footer live **once** in `src/partials/` and are injected into every page by the build script, so all five pages always have an identical, correctly-linked navbar and footer (with the current page highlighted).

## Run locally

```bash
npm install
npm run build        # builds the 5 HTML pages and compiles Tailwind
npm run serve        # http://localhost:3000
```

While editing: `npm run watch:css` recompiles Tailwind on change; run `npm run build:pages` after editing anything in `src/`.

## Contact form setup (required)

The contact form and home-page newsletter post to [Formspree](https://formspree.io) at `https://formspree.io/f/xyezrlrq`. Submissions are sent with `fetch` (JSON) from `assets/js/main.js`; without JavaScript the same forms still POST normally.

## Notes

- The Sign In / Sign Up pages validate input in the browser only. There is no backend in this assignment, so no accounts are created and no passwords are stored or transmitted.
- The shopping bag is stored in `localStorage`; "Request this order" opens the contact form pre-filled with the bag contents.
- Photos are from [Unsplash](https://unsplash.com) (free to use under the Unsplash License).
- Brand name, address, phone number and email are fictional placeholders.

## Deploy

The repository root is the site. Publish it as-is with GitHub Pages (Settings -> Pages -> Deploy from branch -> `main` / root), Netlify or Vercel (no build command needed).
