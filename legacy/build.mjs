/**
 * Builds the two shipping files from src/hub.template.html.
 *
 *   index.html     — open it from disk or serve it anywhere. Assets stay as
 *                    sibling files, so the folder is the deploy unit.
 *   artifact.html  — body-only, every asset inlined as a data: URI. A published
 *                    Artifact runs under a CSP that blocks every external host,
 *                    and the <head> is supplied at publish time.
 *
 * Same split the Leverage Dashboard uses. Run `node build.mjs` after editing
 * the template — never hand-edit the outputs.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const p = (...a) => join(here, ...a);

const template = readFileSync(p("src", "hub.template.html"), "utf8");
const fontFace = readFileSync(p("src", "fontface.css"), "utf8").trim();

const dataUri = (file, mime) =>
  `data:${mime};base64,${readFileSync(p(file)).toString("base64")}`;

const HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>LVRGD · Leveraged Hub</title>
<!-- Real icon files, not data-URIs: WebKit skips data-URI icons and any icon
     link that JS inserted after parse. favicon.svg carries both marks and flips
     them itself; the PNGs are the fallback. Black goes last so a browser that
     ignores media= lands on the safe default. -->
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="alternate icon" type="image/png" href="favicon-white.png" media="(prefers-color-scheme: dark)">
<link rel="alternate icon" type="image/png" href="favicon-black.png" media="(prefers-color-scheme: light)">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Leveraged Hub">
</head>
<body>
`;

const body = (logoBlack, logoWhite) =>
  template
    .replace("__FONT_FACE__", fontFace)
    .replace("__LOGO_BLACK__", logoBlack)
    .replace("__LOGO_WHITE__", logoWhite);

writeFileSync(p("index.html"), HEAD + body("lvrgd-black.png", "lvrgd-white.png") + "\n</body>\n</html>\n");

writeFileSync(
  p("artifact.html"),
  body(dataUri("lvrgd-black.png", "image/png"), dataUri("lvrgd-white.png", "image/png")),
);

const kb = (f) => (readFileSync(p(f), "utf8").length / 1024).toFixed(0);
console.log(`index.html    ${kb("index.html")} KB`);
console.log(`artifact.html ${kb("artifact.html")} KB`);
