import { useState } from 'react'

export default function TagInput({ tags, onChange }) {
  const [draft, setDraft] = useState('')

  function commitDraft() {
    const cleaned = draft
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (cleaned.length === 0) return
    const next = [...tags]
    for (const t of cleaned) {
      if (!next.some((existing) => existing.toLowerCase() === t.toLowerCase())) next.push(t)
    }
    onChange(next)
    setDraft('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitDraft()
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="tag-input" onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
      {tags.map((tag) => (
        <span key={tag} className="tag-pill">
          {tag}
          <button
            type="button"
            className="tag-pill-remove"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(tag)
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={tags.length === 0 ? 'add tags…' : ''}
      />
    </div>
  )
}
