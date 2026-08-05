/**
 * The board document: sections and destinations, stored as one JSON blob per user.
 *
 * Everything here is pure and runs on both sides — the server normalises what it
 * loads and what it is asked to save, and the client uses the same helpers so a card
 * looks identical before and after a round trip.
 *
 * Nothing that reaches this file is trusted. The stored blob may be older than the
 * code, hand-edited, or restored from an export, so `normaliseBoard` coerces every
 * field rather than believing what it finds.
 */

export const ACCENTS = [
  "blue",
  "violet",
  "aqua",
  "orange",
  "magenta",
  "green",
  "yellow",
  "red",
  "slate",
] as const;
export type Accent = (typeof ACCENTS)[number];

export type QuickLink = { label: string; url: string };

export type Destination = {
  id: string;
  name: string;
  url: string;
  note: string;
  section: string;
  accent: Accent;
  emoji: string;
  pinned: boolean;
  newTab: boolean;
  links: QuickLink[];
  opens: number;
};

export type Section = {
  id: string;
  name: string;
  /** Collapsed sections keep their cards; they just render as a closed header. */
  collapsed: boolean;
};

export type BoardDoc = {
  version: 1;
  sections: Section[];
  destinations: Destination[];
};

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/**
 * Only http(s) survives, and only ever as an absolute URL.
 *
 * A stored `javascript:` or `data:` address would otherwise become a click-to-run
 * script the moment it were rendered into an href, and this data round-trips through
 * an importable JSON file. Quick links may be site-relative so `/hub` can hang off
 * its parent's domain.
 */
export function safeUrl(v: unknown, allowRelative = false): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  if (allowRelative && s.startsWith("/")) return s.slice(0, 300);
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:"
      ? u.href.slice(0, 500)
      : "";
  } catch {
    return "";
  }
}

/** A quick link's target, resolved against the card it belongs to. */
export function resolveLink(d: Destination, l: QuickLink): string {
  if (!l.url) return d.url;
  if (!l.url.startsWith("/")) return l.url;
  if (!d.url) return "";
  try {
    return new URL(l.url, d.url).href;
  } catch {
    return "";
  }
}

export function hostLabel(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    return u.host.replace(/^www\./, "") + path;
  } catch {
    return url;
  }
}

export function monogram(name: string): string {
  const words = name
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "•";
  const s = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return s.toUpperCase();
}

export function normaliseBoard(input: unknown): BoardDoc {
  const raw = (input ?? {}) as Partial<BoardDoc>;

  const sections: Section[] = (Array.isArray(raw.sections) ? raw.sections : [])
    .filter((s): s is Section => !!s && typeof s === "object")
    .map((s) => ({
      id: str(s.id, 40) || uid(),
      name: str(s.name, 40),
      collapsed: !!s.collapsed,
    }))
    .filter((s) => s.name)
    .slice(0, 40);

  if (!sections.length) sections.push(...starterBoard().sections);

  const known = new Set(sections.map((s) => s.id));

  const destinations: Destination[] = (
    Array.isArray(raw.destinations) ? raw.destinations : []
  )
    .filter((d): d is Destination => !!d && typeof d === "object")
    .map((d) => ({
      id: str(d.id, 40) || uid(),
      name: str(d.name, 80),
      url: safeUrl(d.url),
      note: str(d.note, 220),
      section: known.has(d.section as string) ? d.section : sections[0].id,
      accent: (ACCENTS as readonly string[]).includes(d.accent)
        ? (d.accent as Accent)
        : "blue",
      emoji: str(d.emoji, 4),
      pinned: !!d.pinned,
      newTab: d.newTab !== false,
      links: (Array.isArray(d.links) ? d.links : [])
        .filter((l): l is QuickLink => !!l && typeof l === "object")
        .map((l) => ({ label: str(l.label, 40) || "Open", url: safeUrl(l.url, true) }))
        .filter((l) => l.url)
        .slice(0, 8),
      opens: Number.isFinite(Number(d.opens)) ? Math.max(0, Number(d.opens)) : 0,
    }))
    .filter((d) => d.name)
    .slice(0, 500);

  return { version: 1, sections, destinations };
}

/**
 * What a brand-new account sees. Seeded from the apps that already exist, with the
 * live addresses left empty where they were not known — those cards say so and open
 * the editor rather than leading nowhere.
 */
export function starterBoard(): BoardDoc {
  const s = {
    daily: "sec-daily",
    sales: "sec-sales",
    data: "sec-data",
    build: "sec-build",
    tools: "sec-tools",
  };
  return {
    version: 1,
    sections: [
      { id: s.daily, name: "Daily execution", collapsed: false },
      { id: s.sales, name: "Sales", collapsed: false },
      { id: s.data, name: "Metrics & data", collapsed: false },
      { id: s.build, name: "Build & brand", collapsed: false },
      { id: s.tools, name: "Tools", collapsed: false },
    ],
    destinations: [
      {
        id: uid(),
        name: "Daily Execution Dashboard",
        url: "",
        note: "Highest-leverage work up top, client to-do lists below. Rolls anything unfinished into tomorrow.",
        section: s.daily,
        accent: "blue",
        emoji: "",
        pinned: true,
        newTab: true,
        links: [],
        opens: 0,
      },
      {
        id: uid(),
        name: "Sales Rep Hub",
        url: "",
        note: "SOPs, scripts, assets, payment links and logins for every offer.",
        section: s.sales,
        accent: "violet",
        emoji: "",
        pinned: true,
        newTab: true,
        links: [
          { label: "Owner directory", url: "/hub" },
          { label: "Sign in", url: "/login" },
        ],
        opens: 0,
      },
      {
        id: uid(),
        name: "Sales Dashboard",
        url: "",
        note: "Pipeline, activity and close rates for the sales team.",
        section: s.data,
        accent: "aqua",
        emoji: "",
        pinned: true,
        newTab: true,
        links: [],
        opens: 0,
      },
      {
        id: uid(),
        name: "LVRGD Website",
        url: "",
        note: "The public site.",
        section: s.build,
        accent: "orange",
        emoji: "",
        pinned: false,
        newTab: true,
        links: [],
        opens: 0,
      },
      {
        id: uid(),
        name: "GitHub — getlvrgd",
        url: "https://github.com/getlvrgd",
        note: "Every repo behind these apps.",
        section: s.build,
        accent: "slate",
        emoji: "",
        pinned: false,
        newTab: true,
        links: [
          { label: "hub", url: "https://github.com/getlvrgd/hub" },
          { label: "sales-rep-hubs", url: "https://github.com/getlvrgd/sales-rep-hubs" },
        ],
        opens: 0,
      },
      {
        id: uid(),
        name: "Vercel",
        url: "https://vercel.com/dashboard",
        note: "Deploys, domains and env vars.",
        section: s.tools,
        accent: "slate",
        emoji: "",
        pinned: false,
        newTab: true,
        links: [],
        opens: 0,
      },
    ],
  };
}
