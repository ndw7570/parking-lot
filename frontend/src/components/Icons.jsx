// Minimal inline stroke icons — no external icon dependency.
const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const IconCar = (p) => (
  <svg {...base} {...p}>
    <path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11" />
    <path d="M3 11h18v5a1 1 0 01-1 1h-1a2 2 0 01-4 0H9a2 2 0 01-4 0H4a1 1 0 01-1-1v-5z" />
    <circle cx="7.5" cy="14.5" r="0.6" />
    <circle cx="16.5" cy="14.5" r="0.6" />
  </svg>
);

export const IconGate = (p) => (
  <svg {...base} {...p}>
    <path d="M4 20V6a2 2 0 012-2h2v16" />
    <path d="M8 8h11l1 3v9" />
    <path d="M8 12h12M8 16h12" />
  </svg>
);

export const IconUsers = (p) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0111 0" />
    <path d="M16 6.5a2.7 2.7 0 010 5" />
    <path d="M17 19a5.5 5.5 0 00-2.5-4.6" />
  </svg>
);

export const IconUser = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5.5 20a6.5 6.5 0 0113 0" />
  </svg>
);

export const IconHome = (p) => (
  <svg {...base} {...p}>
    <path d="M4 10.5L12 4l8 6.5" />
    <path d="M6 9.5V20h12V9.5" />
  </svg>
);

export const IconAlert = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3l9 16H3l9-16z" />
    <path d="M12 9v5" />
    <path d="M12 17h.01" />
  </svg>
);

export const IconSearch = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);

export const IconPlus = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconChevron = (p) => (
  <svg {...base} {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconBack = (p) => (
  <svg {...base} {...p}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const IconPhone = (p) => (
  <svg {...base} {...p}>
    <path d="M6 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2.2 2A16 16 0 014 6.2 2 2 0 016 4z" />
  </svg>
);

export const IconBoard = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </svg>
);

export const IconMoto = (p) => (
  <svg {...base} {...p}>
    <circle cx="5.5" cy="16.5" r="3" />
    <circle cx="18.5" cy="16.5" r="3" />
    <path d="M8.5 16.5h6l-2.5-5H9l1.5 5M14 8h3l1.5 3.5" />
  </svg>
);

export const IconCheck = (p) => (
  <svg {...base} {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconBell = (p) => (
  <svg {...base} {...p}>
    <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);
