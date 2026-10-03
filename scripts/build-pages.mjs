import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const partialsDir = path.join(root, "src", "partials");
const pagesDir = path.join(root, "src", "pages");

const NAV_KEYS = ["home", "about", "contact", "signin", "signup"];

const read = (file) => readFile(file, "utf8");

function parseMeta(source) {
  const open = source.match(/<main\b([^>]*)>/i);
  const attrs = open?.[1] ?? "";
  const readAttr = (name) => {
    const match = attrs.match(new RegExp(`data-${name}="([^"]*)"`));
    return match ? match[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&").trim() : "";
  };
  return {
    meta: {
      title: readAttr("title"),
      description: readAttr("description"),
      active: readAttr("active"),
    },
    body: source,
  };
}

function expandIcons(html) {
  return html.replace(/\{\{icon:([\w-]+)(?:\s+([^}]*))?\}\}/g, (_, name, classes) => {
    const cls = (classes || "size-5").trim();
    return `<svg class="${cls}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  });
}

function applyActive(html, active) {
  let out = html;
  for (const key of NAV_KEYS) {
    const isActive = key === active;
    out = out.replaceAll(`{{a:${key}}}`, isActive ? "is-active" : "");
    out = out.replaceAll(`{{c:${key}}}`, isActive ? 'aria-current="page"' : "");
  }
  return out;
}

function escapeAttr(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

async function main() {
  const [head, header, footer, sprite, extras] = await Promise.all(
    ["head", "header", "footer", "sprite", "extras"].map((name) =>
      read(path.join(partialsDir, `${name}.html`)),
    ),
  );

  const files = (await readdir(pagesDir)).filter((f) => f.endsWith(".html"));

  for (const file of files) {
    const { meta, body } = parseMeta(await read(path.join(pagesDir, file)));
    if (!meta.title || !meta.description) {
      throw new Error(`${file}: missing data-title or data-description on <main>`);
    }

    const page = [
      "<!doctype html>",
      '<html lang="en">',
      head
        .replaceAll("{{title}}", escapeAttr(meta.title))
        .replaceAll("{{description}}", escapeAttr(meta.description)),
      '<body class="flex min-h-screen flex-col">',
      sprite,
      '<a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-gold-500 focus:px-4 focus:py-2 focus:text-white">Skip to content</a>',
      header,
      body,
      footer,
      extras,
      '<script src="assets/js/main.js" defer></script>',
      "</body>",
      "</html>",
      "",
    ].join("\n");

    const output = expandIcons(applyActive(page, meta.active));
    await writeFile(path.join(root, file), output, "utf8");
    console.log(`built ${file}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
