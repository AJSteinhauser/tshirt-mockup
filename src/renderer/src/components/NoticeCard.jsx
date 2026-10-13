import { motion } from 'motion/react'

export default function NoticeCard({ icon, title, children, action }) {
  return (
    <motion.div
      className="notice-card"
      initial={{ opacity: 0, y: 12, rotate: -0.6 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      {icon && <div className="notice-card-icon">{icon}</div>}
      <h3>{title}</h3>
      <div className="notice-card-body">{children}</div>
      {action && <div className="notice-card-action">{action}</div>}
    </motion.div>
  )
}
