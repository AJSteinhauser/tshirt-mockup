const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
}

const CornerIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M3 13V6a3 3 0 0 1 3-3h7" strokeDasharray="2 2.4" />
    <circle cx="3" cy="13" r="1.8" fill="currentColor" stroke="none" />
  </svg>
)

const ResizeIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M9.5 3H13v3.5M13 3 8.5 7.5M6.5 13H3V9.5M3 13l4.5-4.5" />
  </svg>
)

const MoveIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M8 2v12M2 8h12M6.3 3.7 8 2l1.7 1.7M6.3 12.3 8 14l1.7-1.7M3.7 6.3 2 8l1.7 1.7M12.3 6.3 14 8l-1.7 1.7" />
  </svg>
)

const HINTS = [
  { Icon: CornerIcon, key: null, action: 'Drag a corner', result: 'to nudge it into place' },
  { Icon: ResizeIcon, key: '⌘ / Ctrl', action: 'drag a corner', result: 'to resize · Shift keeps the shape' },
  { Icon: MoveIcon, key: '⌘ / Ctrl', action: 'drag inside', result: 'to move the whole box' }
]

export default function QuadShortcutHints() {
  return (
    <ul className="shortcut-hints" aria-label="Keyboard shortcuts">
      {HINTS.map(({ Icon, key, action, result }) => (
        <li key={action + result} className="shortcut-hint">
          <span className="shortcut-hint-icon">
            <Icon />
          </span>
          <span>
            {key && (
              <>
                <kbd>{key}</kbd>
                <span className="shortcut-hint-plus">+</span>
              </>
            )}
            <strong>{action}</strong> {result}
          </span>
        </li>
      ))}
    </ul>
  )
}
