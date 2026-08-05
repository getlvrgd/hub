# Leveraged Hub

One front door for every dashboard, hub and tool. Open it, type two letters, hit
`↵`, and you're where you were going. Everything you build later gets added from
inside the page — no editing code to add a link.

No server, no build step, no accounts. Open `index.html` and it works.

## The idea

You keep making things — sales rep hubs, the daily execution dashboard, metrics
dashboards. They all live at different URLs and none of them know about each
other. This is the one page that does.

- **Search is the point.** The box is focused the moment the page opens. Type
  `sales`, `srh`, or part of a note, press `↵`, and the top hit opens.
- **Add things as you build them.** `+ Add`, or paste a URL straight into the
  search box and it offers to add it with the name filled in.
- **Quick links go one level deeper.** A card can carry paths inside the app it
  points at — `/hub`, `/login` — so you can land on the page you actually wanted.
- **Pin what you use daily.** Pinned cards move to the top row and answer to the
  number keys `1`–`9`.

## Keyboard

| | |
| --- | --- |
| `⌘K` or `/` | Jump to search |
| `↑` `↓` | Move through results |
| `↵` | Open the highlighted one |
| `1`–`9` | Launch that pinned card |
| `n` | Add a destination |
| `Esc` | Clear the search, or close what's open |

## Files

- `index.html` — the app. Open it, host it, bookmark it. Ships with its sibling
  `.png` / `.svg` assets, so the folder is the deploy unit.
- `artifact.html` — body-only, every asset inlined as a `data:` URI, for
  publishing as a Claude Artifact. Same split the Leverage Dashboard uses.
- `src/hub.template.html` — **the source.** Edit this, never the two above.
- `src/fontface.css` — Bootzy TM as an embedded WOFF2, so headers render on a
  machine that doesn't have the font.
- `build.mjs` — writes both outputs from the template.

```bash
node build.mjs      # after any edit to src/
```

## Your data

Everything lives in this browser's `localStorage` under `lvrgd_hub_v1`. Nothing
is sent anywhere, and a different browser or device starts with the starter set.

That makes the ⋯ menu the only bridge between machines:

- **Export a backup file** — the whole hub as JSON.
- **Copy everything as JSON** — same thing, to the clipboard.
- **Import from a backup** — replaces what's here, after asking.

Export before you switch machines, and every so often regardless. Clearing site
data for this page clears the hub.

## The starter set

Six destinations are seeded from the projects that already exist. Four of them
ship with **no URL**, because the live addresses weren't known when this was
built — the Daily Execution Dashboard, Sales Rep Hub, Sales Dashboard and the
LVRGD Website.

Those cards show a `⚠ Set the URL` chip and open the editor when clicked instead
of leading nowhere. Paste the real address in once and the chip goes away. The
banner under the search box counts how many are still outstanding.

## Notes on how it behaves

**Only `http(s)` URLs are stored.** A `javascript:` or `data:` address is
dropped on the way in and on the way back out of storage, so a hand-edited or
imported file can't turn a card into a script that runs when you click it.

**Quick links starting with `/` are resolved against their card's URL.** Set the
Sales Rep Hub to its real domain and its `/hub` and `/login` links follow
automatically — you never repeat the domain.

**Pinning moves a card, it doesn't copy it.** A pinned card leaves its section
and lives in the top row; unpin and it goes home.

**Drag cards to reorder them** within a section. Moving one to a different
section is the editor's job, so a stray drag can't silently recategorise it.
