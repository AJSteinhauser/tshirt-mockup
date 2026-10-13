import { useEffect, useState } from 'react'
import QuadEditor from '../components/QuadEditor.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SideToggle from '../components/SideToggle.jsx'
import SaveStitch from '../components/SaveStitch.jsx'
import QuadShortcutHints from '../components/QuadShortcutHints.jsx'
import { useElementSize } from '../lib/useElementSize.js'
import { EmbroideredSprig } from '../components/embroidery.jsx'

const AUTOSAVE_DELAY = 500

function quadsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function TemplateSetup({ side, onSideChange, templateSrcs, templateQuads, onSaved }) {
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
  const [slotRef, slot] = useElementSize()

  return (
    <div className="screen screen-fit">
      <ScreenHeader
        eyebrow="Workroom · Template"
        title={`Mark the ${side} print area`}
        hint="Drag the corners to outline where designs may print. Set it once and leave it."
      >
        {localQuad && <SaveStitch status={status} />}
        <button className="btn btn-ghost" onClick={() => setLocalQuad(initialQuad)} disabled={!isDirty}>
          Undo changes
        </button>
        <SideToggle value={side} onChange={onSideChange} />
      </ScreenHeader>
      <div className="hoop-card hoop-fill">
        <EmbroideredSprig variant={side === 'front' ? 'daisy' : 'bluebells'} />
        <div ref={slotRef} className="canvas-slot">
          {templateSrcs[side] && (
            <QuadEditor
              imageSrc={templateSrcs[side]}
              quad={localQuad}
              onChange={setLocalQuad}
              maxWidth={slot.width}
              maxHeight={slot.height}
            />
          )}
        </div>
      </div>
      <QuadShortcutHints />
    </div>
  )
}
