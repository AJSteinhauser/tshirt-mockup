import { motion } from 'motion/react'
import { BasketIcon, HoopIcon, ScissorsIcon, ShirtIcon, SprigIcon } from './ornaments.jsx'

const SECTIONS = [
  {
    title: 'Studio',
    items: [
      { id: 'arrange', label: 'Arrange', Icon: ScissorsIcon },
      { id: 'gather', label: 'Gather & export', Icon: BasketIcon }
    ]
  },
  {
    title: 'Workroom',
    subtitle: 'one-time setup',
    items: [
      { id: 'template', label: 'Template', Icon: HoopIcon },
      { id: 'mockups', label: 'Mockups', Icon: ShirtIcon }
    ]
  }
]

export default function Sidebar({ screen, onNavigate, badges }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <SprigIcon size={22} />
        <span>Sewing Room</span>
      </div>
      {SECTIONS.map((section) => (
        <nav key={section.title} className="sidebar-section">
          <div className="sidebar-section-title">
            {section.title}
            {section.subtitle && <span className="sidebar-section-subtitle">{section.subtitle}</span>}
          </div>
          {section.items.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`sidebar-item ${screen === id ? 'active' : ''}`}
              aria-current={screen === id ? 'page' : undefined}
              onClick={() => onNavigate(id)}
            >
              {screen === id && (
                <motion.span
                  layoutId="sidebar-active"
                  className="sidebar-item-bg"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={18} />
              <span className="sidebar-item-label">{label}</span>
              {badges[id] && (
                <span className={`sidebar-badge sidebar-badge-${badges[id].tone}`}>{badges[id].text}</span>
              )}
            </button>
          ))}
        </nav>
      ))}
    </aside>
  )
}
