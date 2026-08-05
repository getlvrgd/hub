"use client";

import { uid, type BoardDoc } from "@/lib/board";

import { Modal } from "./Modal";
import { IconDown, IconUp, IconX } from "./icons";

/**
 * Rename, reorder and remove sections.
 *
 * Reordering lives here rather than as a drag on the board itself: dragging a card
 * and dragging the section it sits in are easy to confuse, and the order of five
 * headings is not something you change often enough to need a gesture for.
 */
export function SectionsModal({
  doc,
  onChange,
  onClose,
}: {
  doc: BoardDoc;
  onChange: (next: BoardDoc) => void;
  onClose: () => void;
}) {
  const count = (id: string) => doc.destinations.filter((d) => d.section === id).length;

  const rename = (id: string, name: string) =>
    onChange({
      ...doc,
      sections: doc.sections.map((s) => (s.id === id ? { ...s, name: name.slice(0, 40) } : s)),
    });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= doc.sections.length) return;
    const list = [...doc.sections];
    const [s] = list.splice(from, 1);
    list.splice(to, 0, s);
    onChange({ ...doc, sections: list });
  };

  const remove = (id: string) => {
    if (doc.sections.length < 2) return;
    const n = count(id);
    const fallback = doc.sections.find((s) => s.id !== id)!;
    if (
      n > 0 &&
      !confirm(
        `“${doc.sections.find((s) => s.id === id)?.name}” has ${n} card${n === 1 ? "" : "s"}. ` +
          `Move ${n === 1 ? "it" : "them"} to “${fallback.name}” and remove the section?`,
      )
    ) {
      return;
    }
    onChange({
      ...doc,
      sections: doc.sections.filter((s) => s.id !== id),
      destinations: doc.destinations.map((d) =>
        d.section === id ? { ...d, section: fallback.id } : d,
      ),
    });
  };

  const add = () => {
    const name = prompt("Name the new section")?.trim();
    if (!name) return;
    onChange({
      ...doc,
      sections: [...doc.sections, { id: uid(), name: name.slice(0, 40), collapsed: false }],
    });
  };

  return (
    <Modal onClose={onClose} labelledBy="sec-title">
      <h2 id="sec-title">Sections</h2>
      <p className="sub">
        Rename them, drag the arrows to reorder, or remove one and its cards move to
        the first section rather than disappearing.
      </p>

      {doc.sections.map((s, i) => (
        <div className="sublinkedit" key={s.id}>
          <input value={s.name} onChange={(e) => rename(s.id, e.target.value)} maxLength={40} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-faint)",
              minWidth: 48,
              textAlign: "right",
            }}
          >
            {count(s.id)} card{count(s.id) === 1 ? "" : "s"}
          </span>
          <div className="secmove">
            <button
              type="button"
              className="tool"
              onClick={() => move(i, i - 1)}
              disabled={i === 0}
              aria-label={`Move ${s.name} up`}
            >
              <IconUp />
            </button>
            <button
              type="button"
              className="tool"
              onClick={() => move(i, i + 1)}
              disabled={i === doc.sections.length - 1}
              aria-label={`Move ${s.name} down`}
            >
              <IconDown />
            </button>
          </div>
          {doc.sections.length > 1 ? (
            <button
              type="button"
              className="tool del"
              onClick={() => remove(s.id)}
              aria-label={`Remove ${s.name}`}
            >
              <IconX />
            </button>
          ) : null}
        </div>
      ))}

      <button
        type="button"
        className="btn"
        style={{ height: 31, fontSize: 12.5, padding: "0 11px", marginTop: 4 }}
        onClick={add}
      >
        + New section
      </button>

      <div className="modalfoot">
        <span className="spacer" />
        <button className="btn go" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
