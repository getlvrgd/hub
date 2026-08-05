"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { recordOpen, saveBoard, signOut } from "@/app/actions";
import {
  hostLabel,
  monogram,
  resolveLink,
  safeUrl,
  uid,
  type BoardDoc,
  type Destination,
} from "@/lib/board";
import type { Session } from "@/lib/auth";
import type { RevenueSummary } from "@/lib/revenue";

import { AccountModal } from "./AccountModal";
import { DestinationEditor } from "./DestinationEditor";
import { Logo } from "./Logo";
import { RevenuePanel } from "./RevenuePanel";
import { SectionsModal } from "./SectionsModal";
import { ThemeToggle } from "./ThemeToggle";
import { useToast } from "./Toast";
import {
  IconCash,
  IconChevron,
  IconDots,
  IconDownload,
  IconExit,
  IconGrip,
  IconLock,
  IconPencil,
  IconPlus,
  IconRows,
  IconSearch,
  IconStar,
  IconTrash,
  IconUpload,
} from "./icons";

const PINNED = "__pinned";

type Row =
  | { kind: "item"; d: Destination }
  | { kind: "sub"; d: Destination; label: string; url: string }
  | { kind: "new"; url: string };

export function Hub({
  session,
  board,
  revenue,
}: {
  session: Session;
  board: BoardDoc;
  revenue: RevenueSummary;
}) {
  const router = useRouter();
  const { toast, toastNode } = useToast();

  const [doc, setDoc] = useState<BoardDoc>(board);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [editing, setEditing] = useState<{ id?: string; seed?: Partial<Destination> } | null>(null);
  const [showSections, setShowSections] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showRevenue, setShowRevenue] = useState(revenue.count > 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropSection, setDropSection] = useState<string | null>(null);

  const qRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True from the moment you change something until that change is stored. */
  const dirty = useRef(false);

  /**
   * The board is written whole, debounced.
   *
   * Local state is authoritative while you are working — a drag fires a burst of
   * updates and waiting for a round trip on each would make the UI feel like it is
   * on a rope. What lands in the database is whatever the arrangement settled on.
   */
  const persist = useCallback(
    (next: BoardDoc) => {
      setDoc(next);
      dirty.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveBoard(next)
          .then(() => {
            dirty.current = false;
          })
          .catch(() => {
            // Keep `dirty` set so the next change retries, and say so — silently
            // losing an edit is the one outcome worth interrupting for.
            toast("Couldn't save that — check your connection");
          });
      }, 450);
    },
    [toast],
  );

  // Adopt what the server sends only when nothing local is waiting to be written,
  // so a revalidation can never overwrite an edit you just made.
  useEffect(() => {
    if (!dirty.current) setDoc(board);
  }, [board]);

  // Coming back to the tab is the natural moment to pick up what another device did.
  useEffect(() => {
    const onFocus = () => {
      if (!dirty.current) router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  /* ------------------------------------------------------------- opening */

  const open = useCallback(
    (d: Destination, url?: string) => {
      const target = url ?? d.url;
      if (!target) {
        setEditing({ id: d.id });
        return;
      }
      // Fire-and-forget: the count feeds search ranking and is not worth a spinner.
      void recordOpen(d.id);
      if (d.newTab) window.open(target, "_blank", "noopener,noreferrer");
      else window.location.href = target;
    },
    [],
  );

  /* -------------------------------------------------------------- search */

  const rows = useMemo<Row[]>(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];

    const sectionName = (id: string) =>
      doc.sections.find((s) => s.id === id)?.name ?? "";

    const scored = doc.destinations
      .map((d) => {
        const name = d.name.toLowerCase();
        const initials = d.name
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => w[0]?.toLowerCase() ?? "")
          .join("");
        let s = -1;
        if (name.startsWith(query)) s = 100;
        else if (name.includes(query)) s = 70;
        else if (initials.startsWith(query)) s = 65; // "srh" → Sales Rep Hub
        else if (sectionName(d.section).toLowerCase().includes(query)) s = 40;
        else if (d.links.some((l) => l.label.toLowerCase().includes(query))) s = 35;
        else if (d.note.toLowerCase().includes(query)) s = 25;
        else if (d.url.toLowerCase().includes(query)) s = 20;
        if (s < 0) return null;
        if (d.pinned) s += 6;
        return { d, s: s + Math.min(d.opens, 12) * 0.6 };
      })
      .filter((x): x is { d: Destination; s: number } => x !== null)
      .sort((a, b) => b.s - a.s || a.d.name.localeCompare(b.d.name));

    const out: Row[] = scored.map(({ d }) => ({ kind: "item", d }));

    // Quick links surface on their own once you type toward them.
    for (const { d } of scored.slice(0, 4)) {
      for (const l of d.links) {
        if (l.label.toLowerCase().includes(query)) {
          out.push({ kind: "sub", d, label: l.label, url: resolveLink(d, l) });
        }
      }
    }

    const raw = q.trim();
    const looksLikeUrl =
      /^https?:\/\//i.test(raw) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(raw);
    const pasted = safeUrl(raw);
    if (looksLikeUrl && pasted) out.unshift({ kind: "new", url: pasted });

    return out;
  }, [q, doc]);

  const fire = useCallback(
    (n: number) => {
      const r = rows[n];
      if (!r) return;
      if (r.kind === "new") {
        let guess = "";
        try {
          guess = new URL(r.url).host
            .replace(/^www\./, "")
            .split(".")[0]
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (m) => m.toUpperCase());
        } catch {
          /* leave it blank and let them name it */
        }
        setQ("");
        setEditing({ seed: { url: r.url, name: guess } });
        return;
      }
      open(r.d, r.kind === "sub" ? r.url : undefined);
    },
    [rows, open],
  );

  /* ----------------------------------------------------------- shortcuts */

  const pins = useMemo(() => doc.destinations.filter((d) => d.pinned), [doc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      const modalOpen = !!editing || showSections || showAccount;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        qRef.current?.focus();
        qRef.current?.select();
        return;
      }
      if (e.key === "Escape") {
        if (modalOpen) return; // the modal closes itself
        if (menuOpen) return setMenuOpen(false);
        if (q) {
          setQ("");
          return;
        }
        qRef.current?.blur();
        return;
      }
      // A modal owns the keyboard while it is up: without this, clicking its
      // backdrop moves focus to <body> and a stray "2" launches a pinned card in a
      // new tab behind the dialog you were filling in.
      if (modalOpen) return;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        qRef.current?.focus();
        return;
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setEditing({});
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const target = pins[Number(e.key) - 1];
        if (target) {
          e.preventDefault();
          open(target);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pins, open, q, menuOpen, editing, showSections, showAccount]);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    if (!menuOpen) return;
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  /* ---------------------------------------------------------------- drag */

  /**
   * Moves a card into a section, optionally before a particular card.
   *
   * Dropping onto the pinned row pins; dropping into any real section unpins, so a
   * card can always be got out of the pinned row by dragging it home.
   */
  const moveCard = (id: string, sectionId: string, beforeId?: string) => {
    const list = [...doc.destinations];
    const from = list.findIndex((d) => d.id === id);
    if (from < 0) return;
    const [card] = list.splice(from, 1);

    const next: Destination =
      sectionId === PINNED
        ? { ...card, pinned: true }
        : { ...card, pinned: false, section: sectionId };

    const at = beforeId ? list.findIndex((d) => d.id === beforeId) : -1;
    if (at < 0) list.push(next);
    else list.splice(at, 0, next);

    persist({ ...doc, destinations: list });
  };

  /**
   * The dragged card's id comes off the drag itself first, and only falls back to
   * React state.
   *
   * `dragstart` sets state, but a drop can land before that re-render has flushed —
   * and the id would be lost for a drag that started in another window. The
   * dataTransfer payload is the browser's own channel for exactly this, so it is
   * the authority and the state is the backup.
   */
  const onDropInto = (
    sectionId: string,
    beforeId: string | undefined,
    e: React.DragEvent,
  ) => {
    let id = "";
    try {
      id = e.dataTransfer.getData("text/plain");
    } catch {
      /* some browsers restrict reads outside a drop handler */
    }
    if (!id) id = dragId ?? "";
    if (!id) return;

    moveCard(id, sectionId, beforeId);
    setDragId(null);
    setDropSection(null);
  };

  /* ------------------------------------------------------------ mutation */

  const togglePin = (id: string) =>
    persist({
      ...doc,
      destinations: doc.destinations.map((d) =>
        d.id === id ? { ...d, pinned: !d.pinned } : d,
      ),
    });

  const remove = (d: Destination) => {
    if (!confirm(`Remove “${d.name}” from the hub?`)) return;
    persist({ ...doc, destinations: doc.destinations.filter((x) => x.id !== d.id) });
    toast("Removed");
  };

  const toggleSection = (id: string) =>
    persist({
      ...doc,
      sections: doc.sections.map((s) =>
        s.id === id ? { ...s, collapsed: !s.collapsed } : s,
      ),
    });

  const saveDestination = (d: Destination) => {
    const at = doc.destinations.findIndex((x) => x.id === d.id);
    const list = [...doc.destinations];
    if (at < 0) list.push(d);
    else list[at] = d;
    persist({ ...doc, destinations: list });
    setEditing(null);
    setQ("");
    toast(at < 0 ? "Added to the hub" : "Saved");
  };

  /* --------------------------------------------------------------- files */

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hub-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Backup downloaded");
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(String(reader.result)) as BoardDoc;
        const n = Array.isArray(incoming?.destinations) ? incoming.destinations.length : 0;
        if (!n) throw new Error("empty");
        if (!confirm(`Replace the ${doc.destinations.length} destination(s) here with the ${n} in this file?`)) return;
        persist(incoming);
        toast(`Imported ${n} destinations`);
      } catch {
        toast("That file isn't a hub backup");
      }
    };
    reader.readAsText(file);
  };

  /* -------------------------------------------------------------- render */

  const needsUrl = doc.destinations.filter((d) => !d.url).length;

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="brandmark">
          <Logo />
          <span className="brandrule" />
          <span className="brandname">Hub</span>
        </div>
        <span className="spacer" />

        <button
          className="iconbtn"
          onClick={() => setShowRevenue((v) => !v)}
          title="Agency revenue"
          aria-pressed={showRevenue}
        >
          <IconCash />
        </button>

        <ThemeToggle />

        <div className="menuwrap">
          <button
            className="iconbtn"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="More"
          >
            <IconDots />
          </button>
          {menuOpen ? (
            <div className="menu" role="menu" onClick={(e) => e.stopPropagation()}>
              <button role="menuitem" onClick={() => { setMenuOpen(false); setShowSections(true); }}>
                <IconRows /> Manage sections
              </button>
              <button role="menuitem" onClick={() => { setMenuOpen(false); exportJson(); }}>
                <IconDownload /> Export a backup file
              </button>
              <button role="menuitem" onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}>
                <IconUpload /> Import from a backup
              </button>
              <hr />
              <button role="menuitem" onClick={() => { setMenuOpen(false); setShowAccount(true); }}>
                <IconLock /> Password & devices
              </button>
              <form action={signOut}>
                <button type="submit" role="menuitem" style={{ width: "100%" }}>
                  <IconExit /> Sign out
                </button>
              </form>
              <p className="mnote">
                Signed in as {session.email}. Everything here syncs to any device you
                sign in on.
              </p>
            </div>
          ) : null}
        </div>

        <button className="iconbtn primary" onClick={() => setEditing({})}>
          <IconPlus />
          <span className="btn-label">Add</span>
        </button>
      </header>

      <div className="hero">
        <div className="searchrow">
          <IconSearch className="mag" />
          <input
            id="q"
            ref={qRef}
            value={q}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="Search everything — or paste a URL to add it"
            aria-label="Search your destinations"
            onChange={(e) => {
              setQ(e.target.value);
              // Reset the highlight here rather than in an effect on `q`: a new
              // query means a new list, and the old index would point at whatever
              // now happens to sit in that slot for one render.
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (!rows.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((n) => (n + 1) % rows.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((n) => (n - 1 + rows.length) % rows.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                fire(sel);
              }
            }}
          />
          <div className="kbdhint">
            <kbd>⌘K</kbd>
            <kbd>↵</kbd>
          </div>
        </div>

        {needsUrl > 0 && !q ? (
          <div className="banner">
            <span className="dot" />
            <span>
              <b style={{ fontWeight: 600, color: "var(--text)" }}>
                {needsUrl} destination{needsUrl > 1 ? "s" : ""} still need
                {needsUrl > 1 ? "" : "s"} a URL.
              </b>{" "}
              Click one and paste where it actually lives.
            </span>
          </div>
        ) : null}
      </div>

      <main>
        {q ? (
          <SearchResults rows={rows} sel={sel} setSel={setSel} fire={fire} q={q} doc={doc} />
        ) : (
          <>
            {showRevenue ? <RevenuePanel revenue={revenue} toast={toast} /> : null}

            {pins.length ? (
              <BoardSection
                id={PINNED}
                title="Pinned"
                cards={pins}
                collapsed={false}
                numbered
                dropSection={dropSection}
                setDropSection={setDropSection}
                dragId={dragId}
                setDragId={setDragId}
                onDropInto={onDropInto}
                onOpen={open}
                onPin={togglePin}
                onEdit={(d) => setEditing({ id: d.id })}
                onDelete={remove}
              />
            ) : null}

            {doc.sections.map((s) => {
              const cards = doc.destinations.filter(
                (d) => d.section === s.id && !d.pinned,
              );
              return (
                <BoardSection
                  key={s.id}
                  id={s.id}
                  title={s.name}
                  cards={cards}
                  collapsed={s.collapsed}
                  onToggle={() => toggleSection(s.id)}
                  onAdd={() => setEditing({ seed: { section: s.id } })}
                  dropSection={dropSection}
                  setDropSection={setDropSection}
                  dragId={dragId}
                  setDragId={setDragId}
                  onDropInto={onDropInto}
                  onOpen={open}
                  onPin={togglePin}
                  onEdit={(d) => setEditing({ id: d.id })}
                  onDelete={remove}
                />
              );
            })}

            {!doc.destinations.length ? (
              <div className="empty">
                <b>Nothing here yet.</b>
                Hit <strong>Add</strong>, or paste a URL into the search box.
              </div>
            ) : null}
          </>
        )}
      </main>

      {editing ? (
        <DestinationEditor
          sections={doc.sections}
          existing={editing.id ? doc.destinations.find((d) => d.id === editing.id) : undefined}
          seed={editing.seed}
          count={doc.destinations.length}
          onAddSection={(name) => {
            const s = { id: uid(), name, collapsed: false };
            persist({ ...doc, sections: [...doc.sections, s] });
            return s.id;
          }}
          onSave={saveDestination}
          onDelete={(d) => {
            setEditing(null);
            remove(d);
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {showSections ? (
        <SectionsModal
          doc={doc}
          onChange={persist}
          onClose={() => setShowSections(false)}
        />
      ) : null}

      {showAccount ? (
        <AccountModal session={session} onClose={() => setShowAccount(false)} toast={toast} />
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importJson(f);
          e.target.value = "";
        }}
      />
      {toastNode}
    </div>
  );
}

/* ==================================================================== board */

function BoardSection({
  id,
  title,
  cards,
  collapsed,
  numbered,
  onToggle,
  onAdd,
  dragId,
  setDragId,
  dropSection,
  setDropSection,
  onDropInto,
  onOpen,
  onPin,
  onEdit,
  onDelete,
}: {
  id: string;
  title: string;
  cards: Destination[];
  collapsed: boolean;
  numbered?: boolean;
  onToggle?: () => void;
  onAdd?: () => void;
  dragId: string | null;
  setDragId: (v: string | null) => void;
  dropSection: string | null;
  setDropSection: (v: string | null) => void;
  onDropInto: (sectionId: string, beforeId: string | undefined, e: React.DragEvent) => void;
  onOpen: (d: Destination, url?: string) => void;
  onPin: (id: string) => void;
  onEdit: (d: Destination) => void;
  onDelete: (d: Destination) => void;
}) {
  const dragging = !!dragId;
  const isTarget = dropSection === id;

  return (
    <section
      className={[collapsed ? "collapsed" : "", isTarget ? "dropzone" : ""]
        .filter(Boolean)
        .join(" ")}
      onDragOver={(e) => {
        if (!dragging) return;
        e.preventDefault();
        setDropSection(id);
      }}
      onDragLeave={(e) => {
        // Only clear when the pointer actually left the section, not when it
        // crossed onto a card inside it.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropSection(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropInto(id, undefined, e);
      }}
    >
      <div className="sechead">
        {onToggle ? (
          <button className="sectoggle" onClick={onToggle} aria-expanded={!collapsed}>
            <IconChevron className="chev" />
            <span className="sectitle">{title}</span>
            <span className="seccount">{cards.length}</span>
          </button>
        ) : (
          <span className="sectoggle" style={{ cursor: "default" }}>
            <span className="sectitle">{title}</span>
            <span className="seccount">{cards.length}</span>
          </span>
        )}
        <span className="secline" />
        {onAdd ? (
          <button className="secact" onClick={onAdd}>
            + Add here
          </button>
        ) : null}
      </div>

      {collapsed ? null : cards.length ? (
        <div className="grid">
          {cards.map((d, n) => (
            <Card
              key={d.id}
              d={d}
              n={numbered ? n : -1}
              dragId={dragId}
              setDragId={setDragId}
              onDropBefore={(beforeId, e) => onDropInto(id, beforeId, e)}
              onOpen={onOpen}
              onPin={onPin}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : dragging ? (
        // An empty section is just its heading until there is something to drop in
        // it. A column of "nothing here yet" boxes is the stacked clutter this
        // layout is trying to get away from — the target only appears when it means
        // something.
        <div className="emptyslot">Drop it here</div>
      ) : null}
    </section>
  );
}

function Card({
  d,
  n,
  dragId,
  setDragId,
  onDropBefore,
  onOpen,
  onPin,
  onEdit,
  onDelete,
}: {
  d: Destination;
  n: number;
  dragId: string | null;
  setDragId: (v: string | null) => void;
  onDropBefore: (beforeId: string, e: React.DragEvent) => void;
  onOpen: (d: Destination, url?: string) => void;
  onPin: (id: string) => void;
  onEdit: (d: Destination) => void;
  onDelete: (d: Destination) => void;
}) {
  const [over, setOver] = useState(false);
  const isDragging = dragId === d.id;

  return (
    <article
      className={[
        "card",
        isDragging ? "dragging" : "",
        over && !isDragging ? "dropbefore" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--accent" as string]: `var(--a-${d.accent})` }}
      draggable
      onDragStart={(e) => {
        setDragId(d.id);
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", d.id);
        } catch {
          /* Safari is fussy about setData in some contexts; the id is in state too */
        }
      }}
      onDragEnd={() => {
        setDragId(null);
        setOver(false);
      }}
      onDragOver={(e) => {
        if (!dragId || isDragging) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!dragId || isDragging) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        onDropBefore(d.id, e);
      }}
    >
      <div className="cardtools">
        <span className="tool grabber" aria-hidden="true">
          <IconGrip />
        </span>
        <button
          className={`tool pin${d.pinned ? " starred on" : ""}`}
          onClick={() => onPin(d.id)}
          title={d.pinned ? "Unpin" : "Pin to the top"}
          aria-label={d.pinned ? "Unpin" : "Pin to the top"}
        >
          <IconStar filled={d.pinned} />
        </button>
        <button className="tool" onClick={() => onEdit(d)} title="Edit" aria-label="Edit">
          <IconPencil />
        </button>
        <button
          className="tool del"
          onClick={() => onDelete(d)}
          title="Delete"
          aria-label="Delete"
        >
          <IconTrash />
        </button>
      </div>

      <button className="cardmain" onClick={() => onOpen(d)}>
        {d.emoji ? (
          <span className="tile emoji">{d.emoji}</span>
        ) : (
          <span className="tile">{monogram(d.name)}</span>
        )}
        <span className="cardtext">
          <span className="cardname">
            <span className="nm">{d.name}</span>
            {n > -1 && n < 9 ? <span className="numkey">{n + 1}</span> : null}
          </span>
          {d.note ? <span className="cardnote">{d.note}</span> : null}
          {d.url ? (
            <span className="cardhost">{hostLabel(d.url)}</span>
          ) : (
            <span className="needsurl">⚠ Set the URL</span>
          )}
        </span>
      </button>

      {d.links.length ? (
        <div className="sublinks">
          {d.links.map((l, i) => (
            <button
              key={i}
              className="sublink"
              onClick={() => onOpen(d, resolveLink(d, l))}
            >
              {l.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/* =================================================================== search */

function SearchResults({
  rows,
  sel,
  setSel,
  fire,
  q,
  doc,
}: {
  rows: Row[];
  sel: number;
  setSel: (n: number) => void;
  fire: (n: number) => void;
  q: string;
  doc: BoardDoc;
}) {
  if (!rows.length) {
    return (
      <div className="empty">
        <b>Nothing matches “{q}”.</b>
        Paste a URL to add it, or hit <strong>Add</strong>.
      </div>
    );
  }

  const sectionName = (id: string) => doc.sections.find((s) => s.id === id)?.name ?? "";

  return (
    <div className="results" role="listbox">
      {rows.map((r, n) => {
        const selected = n === sel;
        // `key` deliberately stays off this object: React 19 does not read a key
        // out of a spread, and would render every row keyless.
        const common = {
          className: `res${selected ? " sel" : ""}`,
          role: "option" as const,
          "aria-selected": selected,
          onClick: () => fire(n),
          onMouseEnter: () => setSel(n),
        };

        if (r.kind === "new") {
          return (
            <button key={n} {...common}>
              <span className="tile" style={{ ["--accent" as string]: "var(--a-green)" }}>
                +
              </span>
              <span className="restext">
                <span className="resname">Add {hostLabel(r.url)}</span>
                <span className="ressub">New destination · {r.url}</span>
              </span>
              <span className="resgo">{selected ? "↵ " : ""}add</span>
            </button>
          );
        }

        const d = r.d;
        const tile = d.emoji ? (
          <span className="tile emoji">{d.emoji}</span>
        ) : (
          <span className="tile" style={{ ["--accent" as string]: `var(--a-${d.accent})` }}>
            {monogram(d.name)}
          </span>
        );

        if (r.kind === "sub") {
          return (
            <button key={n} {...common}>
              {tile}
              <span className="restext">
                <span className="resname">
                  {d.name} → <Highlight text={r.label} q={q} />
                </span>
                <span className="ressub">{hostLabel(r.url || d.url)}</span>
              </span>
              <span className="resgo">{selected ? "↵ " : ""}open</span>
            </button>
          );
        }

        return (
          <button key={n} {...common}>
            {tile}
            <span className="restext">
              <span className="resname">
                <Highlight text={d.name} q={q} />
              </span>
              <span className="ressub">
                {sectionName(d.section)}
                {d.url ? ` · ${hostLabel(d.url)}` : " · needs a URL"}
              </span>
            </span>
            <span className="resgo">
              {selected ? "↵ " : ""}
              {d.url ? "open" : "set URL"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  const at = text.toLowerCase().indexOf(q.trim().toLowerCase());
  if (at < 0 || !q.trim()) return <>{text}</>;
  const len = q.trim().length;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + len)}</mark>
      {text.slice(at + len)}
    </>
  );
}
