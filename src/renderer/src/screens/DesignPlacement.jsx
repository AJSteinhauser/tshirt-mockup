import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import TransformLayer from '../components/TransformLayer.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SideToggle from '../components/SideToggle.jsx'
import DropZone from '../components/DropZone.jsx'
import Filmstrip from '../components/Filmstrip.jsx'
import NoticeCard from '../components/NoticeCard.jsx'
import SetupChecklist from '../components/SetupChecklist.jsx'
import { ArrowIcon, ScissorsIcon, SprigIcon, UploadIcon } from '../components/ornaments.jsx'
import { composeShirtPreview } from '../lib/warp.js'
import { loadImageData, loadImageElement } from '../lib/loadImage.js'
import { calibratedShirtsFor } from '../lib/setupStatus.js'

function readFileAsDesign(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name.replace(/\.[^.]+$/, ''), dataUrl: reader.result })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function DesignPlacement({
  templateSrcs,
  templateQuads,
  shirtFiles,
  shirtsConfig,
  side,
  onSideChange,
  onNavigate,
  design,
  setDesign,
  transform,
  setTransform
}) {
  const templateSrc = templateSrcs[side]
  const templateQuad = templateQuads[side]

  const calibratedShirts = useMemo(
    () => calibratedShirtsFor(side, shirtFiles, shirtsConfig),
    [shirtFiles, shirtsConfig, side]
  )
  const [previewShirt, setPreviewShirt] = useState(null)
  const [previewSrc, setPreviewSrc] = useState(null)

  useEffect(() => {
    if ((!previewShirt || !calibratedShirts.includes(previewShirt)) && calibratedShirts.length > 0) {
      setPreviewShirt(calibratedShirts[0])
    }
    if (calibratedShirts.length === 0) setPreviewShirt(null)
  }, [calibratedShirts, previewShirt])

  function applyDesign(picked) {
    setDesign(picked)
    setTransform(null)
  }

  async function handleBrowse() {
    const picked = await window.api.pickDesignImage()
    if (picked) applyDesign(picked)
  }

  async function handleDrop([file]) {
    applyDesign(await readFileAsDesign(file))
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      const shirtQuad = shirtsConfig[previewShirt]?.quad
      if (!design || !transform || !shirtQuad || !templateQuad) {
        setPreviewSrc(null)
        return
      }
      const [shirtImage, sourceImageData] = await Promise.all([
        window.api.getShirtImage(previewShirt).then(loadImageElement),
        loadImageData(design.dataUrl)
      ])
      if (cancelled) return
      const src = composeShirtPreview({ shirtImage, sourceImageData, transform, templateQuad, shirtQuad })
      if (!cancelled) setPreviewSrc(src)
    }
    const timer = setTimeout(run, 60)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [design, transform, previewShirt, templateQuad, shirtsConfig])

  const header = (
    <ScreenHeader
      eyebrow="Studio · Arrange"
      title={design ? design.name : `Place a ${side} design`}
      hint={
        design
          ? 'Drag to move · corner to scale · top handle to rotate. Anything past the stitched line gets trimmed.'
          : 'Position it once on the template and it lands on every calibrated mockup.'
      }
    >
      <SideToggle value={side} onChange={onSideChange} />
    </ScreenHeader>
  )

  if (!templateQuad || calibratedShirts.length === 0) {
    return (
      <div className="screen">
        {header}
        <NoticeCard icon={<SprigIcon size={28} />} title={`Let’s ready the ${side} side first`}>
          <p>A few one-time steps in the Workroom, then this is where every new design starts.</p>
          <SetupChecklist
            steps={[
              {
                title: `Mark the ${side} print area`,
                detail: 'Outline where a design is allowed on the flat template.',
                done: Boolean(templateQuad),
                action: (
                  <button className="btn btn-small" onClick={() => onNavigate('template')}>
                    Open template
                  </button>
                )
              },
              {
                title: 'Add mockup photos',
                detail: 'Lifestyle shots of your blank shirts.',
                done: shirtFiles.length > 0,
                action: (
                  <button className="btn btn-small" onClick={() => onNavigate('mockups')}>
                    Add mockups
                  </button>
                )
              },
              {
                title: `Calibrate a ${side} mockup`,
                detail: 'Match each photo to the template’s print area.',
                done: calibratedShirts.length > 0,
                action: (
                  <button className="btn btn-small" onClick={() => onNavigate('mockups')}>
                    Calibrate
                  </button>
                )
              }
            ]}
          />
        </NoticeCard>
      </div>
    )
  }

  return (
    <div className="screen">
      {header}

      <AnimatePresence mode="wait" initial={false}>
        {!design ? (
          <motion.div key="drop" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <DropZone onFiles={handleDrop} className="design-drop">
              <ScissorsIcon size={36} />
              <h3>Drop a design here</h3>
              <p className="hint">PNG with transparency works best.</p>
              <button className="btn" onClick={handleBrowse}>
                <UploadIcon size={16} /> Browse files
              </button>
            </DropZone>
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            className="placement-layout"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <DropZone onFiles={handleDrop} className="hoop-card placement-canvas">
              <TransformLayer
                templateSrc={templateSrc}
                templateQuad={templateQuad}
                designSrc={design.dataUrl}
                transform={transform}
                onChange={setTransform}
              />
              <button className="btn btn-ghost btn-small" onClick={handleBrowse}>
                <UploadIcon size={14} /> Swap design
              </button>
            </DropZone>

            <div className="preview-pane paper-card">
              <div className="preview-frame">
                <AnimatePresence>
                  {previewSrc && (
                    <motion.img
                      key={previewShirt}
                      className="preview-image"
                      src={previewSrc}
                      alt={`Preview on ${shirtsConfig[previewShirt]?.name ?? previewShirt}`}
                      initial={{ opacity: 0, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>
              </div>
              <span className="preview-caption">{shirtsConfig[previewShirt]?.name ?? previewShirt}</span>
              <Filmstrip
                shirts={calibratedShirts}
                shirtsConfig={shirtsConfig}
                value={previewShirt}
                onChange={setPreviewShirt}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {design && transform && (
        <div className="screen-footer">
          <button className="btn btn-primary" onClick={() => onNavigate('gather')}>
            Gather & export {calibratedShirts.length} mockups <ArrowIcon size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
