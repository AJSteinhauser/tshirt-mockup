export default function ScreenHeader({ eyebrow, title, hint, children }) {
  return (
    <header className="screen-header">
      <div className="screen-header-text">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {hint && <p className="hint">{hint}</p>}
      </div>
      {children && <div className="screen-header-actions">{children}</div>}
    </header>
  )
}
