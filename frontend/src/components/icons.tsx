import type { CSSProperties, ReactElement } from 'react'

/** Coherent 1.6px stroke icon set (Lucide-style geometry), currentColor. */
export type IconName =
  | 'planner'
  | 'builder'
  | 'fixer'
  | 'check'
  | 'check-circle'
  | 'alert'
  | 'x'
  | 'loader'
  | 'docs'
  | 'reload'
  | 'external'
  | 'user'
  | 'send'
  | 'stop'
  | 'plus'
  | 'link'
  | 'file'
  | 'braces'
  | 'image'
  | 'monitor'
  | 'code'
  | 'chevron-right'
  | 'arrow-right'
  | 'info'
  | 'sparkle'
  | 'build'
  | 'globe'
  | 'timer'
  | 'grid'
  | 'bolt'
  | 'lock'
  | 'file-code'
  | 'file-style'

const PATHS: Record<IconName, ReactElement> = {
  planner: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1z" />
    </>
  ),
  builder: (
    <>
      <path d="M15 12 6.5 20.5a2.12 2.12 0 1 1-3-3L12 9" />
      <path d="M17.64 15 22 10.64" />
      <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h.86c.85 0 1.65.33 2.25.93l1.25 1.25" />
    </>
  ),
  fixer: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  'check-circle': (
    <>
      <path d="M21.8 10A10 10 0 1 1 17 3.34" />
      <path d="m9 11 3 3L22 4" />
    </>
  ),
  alert: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  loader: <path d="M21 12a9 9 0 1 1-6.22-8.56" />,
  docs: (
    <>
      <path d="M12 7v13" />
      <path d="M3 5a1 1 0 0 1 1-1h4.5A3.5 3.5 0 0 1 12 7.5 3.5 3.5 0 0 1 15.5 4H20a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1h-5.2a3 3 0 0 0-2.8 1.5 3 3 0 0 0-2.8-1.5H4a1 1 0 0 1-1-1z" />
    </>
  ),
  reload: (
    <>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </>
  ),
  external: (
    <>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  send: (
    <>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
  braces: (
    <>
      <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
      <path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  code: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  'arrow-right': <path d="M5 12h14M12 5l7 7-7 7" />,
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  sparkle: (
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
  ),
  build: <path d="M8 4.5v15l12-7.5z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
    </>
  ),
  timer: (
    <>
      <path d="M9 2h6" />
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 1.5" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.2" />
      <rect x="14" y="3" width="7" height="7" rx="1.2" />
      <rect x="3" y="14" width="7" height="7" rx="1.2" />
      <rect x="14" y="14" width="7" height="7" rx="1.2" />
    </>
  ),
  bolt: <path d="M13 2 4.5 13.5H11l-1 8.5L18.5 10.5H12z" />,
  lock: (
    <>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  'file-code': (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="m9.5 12-1.8 2 1.8 2" />
      <path d="m13.5 12 1.8 2-1.8 2" />
    </>
  ),
  'file-style': (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M8.5 12.5h5M8.5 15h5M8.5 17.5h3" />
    </>
  ),
}

interface IconProps {
  name: IconName
  size?: number
  className?: string
  title?: string
  style?: CSSProperties
  strokeWidth?: number
}

export function Icon({ name, size = 18, className, title, style, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  )
}

/** The Sandcastle brand mark — a crenellated keep with a flag. Not an emoji. */
export function Logo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Sandcastle"
      focusable="false"
    >
      {/* flag */}
      <path d="M12 2.4v4.2" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 2.7 16 3.9 12 5.1Z" fill="var(--accent)" />
      {/* crenellated keep */}
      <path
        d="M3.5 20.8v-8.3h2.2v-2h2.2v2h2v-2.9h2.2v2.9h2v-2h2.2v2h2.2v8.3Z"
        fill="var(--builder)"
        fillOpacity="0.18"
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* gate */}
      <path
        d="M9.9 20.8v-3a2.1 2.1 0 0 1 4.2 0v3"
        stroke="var(--ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
