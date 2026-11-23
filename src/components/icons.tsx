// Authored icon set: 24px grid, 2px round strokes, no fills, so every glyph shares one weight.
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconHome = () => (
  <svg {...base}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  </svg>
)
export const IconPlate = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3.5v5M12 15.5v5M4.6 7.75l4.4 2.5M15 13.75l4.4 2.5M4.6 16.25l4.4-2.5M15 10.25l4.4-2.5" />
  </svg>
)
export const IconSyringe = () => (
  <svg {...base}>
    <path d="m18 2 4 4M16 4l4 4M19 7l-9.5 9.5a2.1 2.1 0 0 1-3 0v0a2.1 2.1 0 0 1 0-3L16 4M6.5 17.5 3 21M9 9l2 2M12 6l2 2" />
  </svg>
)
export const IconSprout = () => (
  <svg {...base}>
    <path d="M12 21v-8M12 13c0-4-3-6-7-6 0 4 3 6 7 6ZM12 11c0-4 3-7 7-7 0 4-3 7-7 7Z" />
  </svg>
)
export const IconMenu = () => (
  <svg {...base}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
)
export const IconAlert = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}>
    <path d="M12 3 2.5 20h19z" />
    <path d="M12 10v4.5M12 17.5v.01" />
  </svg>
)
export const IconPhone = () => (
  <svg {...base}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
)
export const IconClose = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const IconCheck = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size} strokeWidth={3}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)
export const IconChevron = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)
export const IconBack = () => (
  <svg {...base}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)
export const IconCalendar = () => (
  <svg {...base}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)
export const IconShare = () => (
  <svg {...base}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
)
export const IconEye = () => (
  <svg {...base}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
export const IconEyeOff = () => (
  <svg {...base}>
    <path d="M3 3l18 18M10.6 5.6A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.1 3.9M6.2 6.6C3.8 8.2 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.1-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)
export const IconBell = () => (
  <svg {...base}>
    <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2.2 2.2 0 0 0 4 0" />
  </svg>
)
export const IconChart = () => (
  <svg {...base}>
    <path d="M3 20h18M6 20v-6M11 20V9M16 20V4" />
  </svg>
)
export const IconRefresh = () => (
  <svg {...base}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.7M20 3.5v5.2h-5.2" />
  </svg>
)
export const IconSettings = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)
export const IconChat = () => (
  <svg {...base}>
    <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20" />
  </svg>
)
