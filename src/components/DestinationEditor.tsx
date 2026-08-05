"use client";

import { useState } from "react";

import {
  ACCENTS,
  safeUrl,
  uid,
  type Accent,
  type Destination,
  type QuickLink,
  type Section,
} from "@/lib/board";

import { Modal } from "./Modal";
import { IconX } from "./icons";

const NEW_SECTION = "__new";

export function DestinationEditor({
  sections,
  existing,
  seed,
  count,
  onAddSection,
  onSave,
  onDelete,
  onClose,
}: {
  sections: Section[];
  existing?: Destination;
  seed?: Partial<Destination>;
  count: number;
  onAddSection: (name: string) => string;
  onSave: (d: Destination) => void;
  onDelete: (d: Destination) => void;
  onClose: () => void;
}) {
  const isNew = !existing;
  const start: Destination = existing ?? {
    id: uid(),
    name: seed?.name ?? "",
    url: seed?.url ?? "",
    note: "",
    section: seed?.section ?? sections[0]?.id ?? "",
    // Rotating the default means a hub built in one sitting isn't nine blue tiles.
    accent: ACCENTS[count % ACCENTS.length],
    emoji: "",
    pinned: false,
    newTab: true,
    links: [],
    opens: 0,
  };

  const [name, setName] = useState(start.name);
  const [url, setUrl] = useState(start.url);
  const [note, setNote] = useState(start.note);
  const [section, setSection] = useState(start.section);
  const [emoji, setEmoji] = useState(start.emoji);
  const [accent, setAccent] = useState<Accent>(start.accent);
  const [pinned, setPinned] = useState(start.pinned);
  const [newTab, setNewTab] = useState(start.newTab);
  const [links, setLinks] = useState<QuickLink[]>(start.links);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      ...start,
      name: trimmed,
      url: safeUrl(url),
      note: note.trim(),
      section,
      emoji: emoji.trim(),
      accent,
      pinned,
      newTab,
      links: links
        .filter((l) => l.url.trim())
        .map((l) => ({ label: l.label.trim() || "Open", url: safeUrl(l.url, true) }))
        .filter((l) => l.url),
    });
  };

  return (
    <Modal onClose={onClose} labelledBy="ed-title">
      <form onSubmit={submit}>
        <h2 id="ed-title">{isNew ? "Add a destination" : "Edit destination"}</h2>
        <p className="sub">
          {isNew
            ? "Anything you can reach by URL belongs here."
            : "Changes sync to every device you're signed in on."}
        </p>

        <div className="field">
          <label htmlFor="fN">Name</label>
          <input
            id="fN"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="Sales Rep Hub"
          />
        </div>

        <div className="field">
          <label htmlFor="fU">URL</label>
          <input
            id="fU"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode="url"
            placeholder="https://…"
          />
          <p className="hint">
            Leave it empty if you haven&apos;t deployed yet — the card will nag you
            until you fill it in.
          </p>
        </div>

        <div className="field">
          <label htmlFor="fD">What it&apos;s for</label>
          <textarea
            id="fD"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={220}
            placeholder="One line so future-you remembers why this exists."
          />
        </div>

        <div className="row2">
          <div className="field">
            <label htmlFor="fC">Section</label>
            <select
              id="fC"
              value={section}
              onChange={(e) => {
                if (e.target.value !== NEW_SECTION) return setSection(e.target.value);
                const nameIn = prompt("Name the new section")?.trim();
                if (!nameIn) return;
                setSection(onAddSection(nameIn.slice(0, 40)));
              }}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value={NEW_SECTION}>+ New section…</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fE">
              Icon <span style={{ textTransform: "none", fontWeight: 400 }}>(emoji, optional)</span>
            </label>
            <input
              id="fE"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              placeholder="e.g. 🎯"
            />
          </div>
        </div>

        <div className="field">
          <label>Colour</label>
          <div className="swatches">
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                className="sw"
                style={{ ["--c" as string]: `var(--a-${a})` }}
                aria-pressed={a === accent}
                aria-label={a}
                onClick={() => setAccent(a)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label>Quick links inside it</label>
          {links.map((l, i) => (
            <div className="sublinkedit" key={i}>
              <input
                className="lbl"
                value={l.label}
                placeholder="Label"
                onChange={(e) =>
                  setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
              />
              <input
                value={l.url}
                placeholder="/path or https://…"
                onChange={(e) =>
                  setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                }
              />
              <button
                type="button"
                className="tool del"
                aria-label="Remove link"
                onClick={() => setLinks(links.filter((_, j) => j !== i))}
              >
                <IconX />
              </button>
            </div>
          ))}
          {links.length < 8 ? (
            <button
              type="button"
              className="btn"
              style={{ height: 31, fontSize: 12.5, padding: "0 11px" }}
              onClick={() => setLinks([...links, { label: "", url: "" }])}
            >
              + Add a quick link
            </button>
          ) : null}
          <p className="hint">
            A path like <code>/hub</code> hangs off the URL above. Full URLs work too.
          </p>
        </div>

        <div className="field" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label className="check">
            <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />
            Open in a new tab
          </label>
          <label className="check">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to the top
          </label>
        </div>

        <div className="modalfoot">
          {existing ? (
            <button type="button" className="btn ghostdel" onClick={() => onDelete(existing)}>
              Delete
            </button>
          ) : null}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn go">
            {isNew ? "Add it" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
