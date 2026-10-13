import { motion } from 'motion/react'
import { StitchCheck } from './ornaments.jsx'

export default function SetupChecklist({ steps }) {
  return (
    <motion.ol
      className="setup-checklist"
      initial="hidden"
      animate="shown"
      variants={{ shown: { transition: { staggerChildren: 0.08 } } }}
    >
      {steps.map((step, i) => (
        <motion.li
          key={step.title}
          className={`setup-step ${step.done ? 'done' : ''}`}
          variants={{ hidden: { opacity: 0, x: -10 }, shown: { opacity: 1, x: 0 } }}
        >
          <span className="setup-step-marker">{step.done ? <StitchCheck /> : i + 1}</span>
          <div className="setup-step-text">
            <strong>{step.title}</strong>
            <span>{step.detail}</span>
          </div>
          {!step.done && step.action}
        </motion.li>
      ))}
    </motion.ol>
  )
}
