import Image from "next/image";

/**
 * The LVRGD wordmark.
 *
 * Two files rather than one with a CSS filter: the mark is solid black and solid
 * white, and `invert()` on a partially transparent PNG dirties the antialiased edges.
 * Which one shows is decided in globals.css by the same rules that drive every other
 * token, so it follows the OS setting and the in-page toggle alike.
 *
 * Both render and one is hidden, so there is no flash of the wrong mark on first
 * paint the way a JS-decided swap would give.
 */
export function Logo({ height = 19 }: { height?: number }) {
  // Trimmed to the wordmark itself, so this ratio is the artwork's own.
  const width = Math.round(height * (482 / 267));

  return (
    <span className="brandmark-logo" style={{ width, height, display: "block" }}>
      <Image
        src="/lvrgd-black.png"
        alt="LVRGD"
        width={482}
        height={267}
        priority
        className="logo logo-light"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
      <Image
        src="/lvrgd-white.png"
        alt=""
        aria-hidden
        width={482}
        height={267}
        priority
        className="logo logo-dark"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}
