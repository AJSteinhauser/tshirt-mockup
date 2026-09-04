import { useEffect, useState } from 'react'
import QuadEditor from '../components/QuadEditor.jsx'

const AUTOSAVE_DELAY = 500

function quadsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function TemplateSetup({ side, templateSrcs, templateQuads, onSaved }) {
  const [localQuad, setLocalQuad] = useState(templateQuads[side])
  const [initialQuad, setInitialQuad] = useState(templateQuads[side])
  const [status, setStatus] = useState('saved') // 'saving' | 'saved'

  // Snapshot only when the side actually changes — not when `templateQuads` updates from our
  // own autosave — so "Reset" reverts to how it was when this side was first opened, not to
  // whatever was last autosaved.
  useEffect(() => {
    const q = templateQuads[side]
    setLocalQuad(q)
    setInitialQuad(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side])

  useEffect(() => {
    if (!localQuad) return
    setStatus('saving')
    const timer = setTimeout(async () => {
      await window.api.saveTemplateQuad(side, localQuad)
      onSaved(side, localQuad)
      setStatus('saved')
    }, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuad, side])

  const isDirty = !quadsEqual(localQuad, initialQuad)

  return (
    <div className="screen">
      <h2>1. Template Setup — {side}</h2>
      <p className="hint">
        Drag the corners to mark the {side} print area. Changes save automatically.
      </p>
      {templateSrcs[side] && (
        <QuadEditor imageSrc={templateSrcs[side]} quad={localQuad} onChange={setLocalQuad} />
      )}
      <div className="actions">
        <button onClick={() => setLocalQuad(initialQuad)} disabled={!isDirty}>
          Reset
        </button>
        {localQuad && (
          <span className={status === 'saving' ? 'status-pending' : 'status-ok'}>
            {status === 'saving' ? 'Saving…' : 'Saved'}
          </span>
        )}
      </div>
    </div>
  )
}
