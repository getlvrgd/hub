/** Stroke icons, sized by CSS. Kept in one place so weights stay consistent. */

type P = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconSearch = (p: P) => (
  <svg {...base} strokeWidth={2} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.4-3.4" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base} strokeWidth={2.2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconDots = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);

export const IconChevron = (p: P) => (
  <svg {...base} strokeWidth={2.2} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base} fill={filled ? "currentColor" : "none"} strokeWidth={1.7} {...p}>
    <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9Z" />
  </svg>
);

export const IconPencil = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" />
  </svg>
);

export const IconTrash = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 7h14M10 7V5h4v2M8 7l1 13h6l1-13" />
  </svg>
);

export const IconX = (p: P) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconGrip = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
);

export const IconUp = (p: P) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="m6 14 6-6 6 6" />
  </svg>
);

export const IconDown = (p: P) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="m6 10 6 6 6-6" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const IconUpload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 15V3m0 0L8 7m4-4 4 4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const IconRows = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
);

export const IconLock = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </svg>
);

export const IconExit = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M15 8.5 19 12l-4 3.5M19 12H10" />
  </svg>
);

export const IconCash = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2.2" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

/* The revenue stat row. Thin, uniform, and purely a marker beside each figure. */

export const IconDeals = (p: P) => (
  <svg {...base} strokeWidth={1.7} {...p}>
    <path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6L6 20.5Z" />
    <path d="M9.5 8.5h5M9.5 12.5h5" />
  </svg>
);

export const IconClients = (p: P) => (
  <svg {...base} strokeWidth={1.7} {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.6a5.5 5.5 0 0 1 3 4.9" />
  </svg>
);

export const IconAvg = (p: P) => (
  <svg {...base} strokeWidth={1.7} {...p}>
    <path d="M5 19 19 5" />
    <circle cx="7.5" cy="7.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

export const IconPeak = (p: P) => (
  <svg {...base} strokeWidth={1.7} {...p}>
    <path d="M3 17.5 9 11l4 4 8-8" />
    <path d="M15 3h6v6" />
  </svg>
);

export const IconMonth = (p: P) => (
  <svg {...base} strokeWidth={1.7} {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
    <path d="M3.5 10h17M8 3.5V6M16 3.5V6" />
  </svg>
);
