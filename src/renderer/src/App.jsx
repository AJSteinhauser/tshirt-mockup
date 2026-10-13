import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Sidebar from './components/Sidebar.jsx'
import CottageEaves from './components/CottageEaves.jsx'
import { EmbroideringNeedle, NEEDLE_CYCLE_MS } from './components/embroidery.jsx'
import TemplateSetup from './screens/TemplateSetup.jsx'
import ShirtCalibration from './screens/ShirtCalibration.jsx'
import DesignPlacement from './screens/DesignPlacement.jsx'
import ExportGrid from './screens/ExportGrid.jsx'
import { SIDES, calibratedShirtsFor, firstReadySide } from './lib/setupStatus.js'

const MIN_SPLASH_CYCLES = 2

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const PAGE_TURN = {
  hidden: { opacity: 0, x: 18, transition: { duration: 0 } },
  shown: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 420, damping: 36 } }
}

function ScreenPanel({ active, children }) {
  return (
    <motion.div
      className="screen-frame"
      style={{ display: active ? undefined : 'none' }}
      variants={PAGE_TURN}
      initial="hidden"
      animate={active ? 'shown' : 'hidden'}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('arrange')
  const [visited, setVisited] = useState(() => new Set(['arrange']))
  const [exportsCompleted, setExportsCompleted] = useState(0)
  const mainRef = useRef(null)
  const [templateSrcs, setTemplateSrcs] = useState({ front: null, back: null })
  const [templateQuads, setTemplateQuads] = useState({ front: null, back: null })
  const [shirtFiles, setShirtFiles] = useState([])
  const [shirtsConfig, setShirtsConfig] = useState({})
  const [loading, setLoading] = useState(true)

  const [studioSide, setStudioSide] = useState('front')
  const [templateSide, setTemplateSide] = useState('front')
  const [designs, setDesigns] = useState({ front: null, back: null })
  const [transforms, setTransforms] = useState({ front: null, back: null })

  useEffect(() => {
    async function init() {
      const startedAt = performance.now()
      const [frontSrc, backSrc, files, config] = await Promise.all([
        window.api.getTemplateImage('front'),
        window.api.getTemplateImage('back'),
        window.api.listShirtImages(),
        window.api.loadConfig()
      ])
      const quads = { front: config.template?.front?.quad ?? null, back: config.template?.back?.quad ?? null }
      const shirts = config.shirts ?? {}
      setTemplateSrcs({ front: frontSrc, back: backSrc })
      setTemplateQuads(quads)
      setShirtFiles(files)
      setShirtsConfig(shirts)
      setStudioSide(firstReadySide({ templateQuads: quads, shirtFiles: files, shirtsConfig: shirts }) ?? 'front')
      const cycles = Math.max(MIN_SPLASH_CYCLES, Math.ceil((performance.now() - startedAt) / NEEDLE_CYCLE_MS))
      await wait(cycles * NEEDLE_CYCLE_MS - (performance.now() - startedAt))
      setLoading(false)
    }
    init()
  }, [])

  function navigate(next) {
    setScreen(next)
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)))
    mainRef.current?.scrollTo(0, 0)
  }

  function setTemplateQuadForSide(s, quad) {
    setTemplateQuads((prev) => ({ ...prev, [s]: quad }))
  }

  function setDesignForSide(s, design) {
    setDesigns((prev) => ({ ...prev, [s]: design }))
  }

  function setTransformForSide(s, transform) {
    setTransforms((prev) => ({ ...prev, [s]: transform }))
  }

  const calibratedCount = shirtFiles.filter((f) => shirtsConfig[f]?.quad).length
  const templatesDone = SIDES.filter((s) => templateQuads[s]).length
  const badges = {
    template: { text: `${templatesDone}/2`, tone: templatesDone === 2 ? 'done' : 'pending' },
    mockups: {
      text: `${calibratedCount}/${shirtFiles.length}`,
      tone: shirtFiles.length > 0 && calibratedCount === shirtFiles.length ? 'done' : 'pending'
    },
    gather: designs[studioSide] && {
      text: calibratedShirtsFor(studioSide, shirtFiles, shirtsConfig).length,
      tone: 'neutral'
    }
  }

  const gardenStatus =
    templatesDone === 2 && calibratedCount > 0
      ? `${calibratedCount} mockups hung up & ready`
      : 'A few things to set up in the Workroom'

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="loading" className="app-loading" exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          <EmbroideringNeedle />
          <span>Threading the needle…</span>
        </motion.div>
      ) : (
        <motion.div
          key="app"
          className="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Sidebar
            screen={screen}
            onNavigate={navigate}
            badges={badges}
            status={gardenStatus}
            celebrate={exportsCompleted}
          />
          <CottageEaves swingKey={screen} />
          <div className="app-main">
            <main ref={mainRef} data-scroll-root>
              {visited.has('template') && (
                <ScreenPanel active={screen === 'template'}>
                  <TemplateSetup
                    side={templateSide}
                    onSideChange={setTemplateSide}
                    templateSrcs={templateSrcs}
                    templateQuads={templateQuads}
                    onSaved={setTemplateQuadForSide}
                  />
                </ScreenPanel>
              )}
              {visited.has('mockups') && (
                <ScreenPanel active={screen === 'mockups'}>
                  <ShirtCalibration
                    active={screen === 'mockups'}
                    shirtFiles={shirtFiles}
                    shirtsConfig={shirtsConfig}
                    templateSrcs={templateSrcs}
                    templateQuads={templateQuads}
                    designs={designs}
                    transforms={transforms}
                    onShirtFilesChanged={setShirtFiles}
                    onShirtsConfigChanged={setShirtsConfig}
                    onSaved={(filename, partial) =>
                      setShirtsConfig((prev) => ({
                        ...prev,
                        [filename]: {
                          ...(prev[filename] ?? { quad: null, side: 'front', tags: [], name: filename }),
                          ...partial
                        }
                      }))
                    }
                  />
                </ScreenPanel>
              )}
              {visited.has('arrange') && (
                <ScreenPanel active={screen === 'arrange'}>
                  <DesignPlacement
                    side={studioSide}
                    onSideChange={setStudioSide}
                    onNavigate={navigate}
                    templateSrcs={templateSrcs}
                    templateQuads={templateQuads}
                    shirtFiles={shirtFiles}
                    shirtsConfig={shirtsConfig}
                    design={designs[studioSide]}
                    setDesign={(d) => setDesignForSide(studioSide, d)}
                    transform={transforms[studioSide]}
                    setTransform={(t) => setTransformForSide(studioSide, t)}
                  />
                </ScreenPanel>
              )}
              {visited.has('gather') && (
                <ScreenPanel active={screen === 'gather'}>
                  <ExportGrid
                    active={screen === 'gather'}
                    side={studioSide}
                    onSideChange={setStudioSide}
                    onNavigate={navigate}
                    templateQuads={templateQuads}
                    shirtFiles={shirtFiles}
                    shirtsConfig={shirtsConfig}
                    design={designs[studioSide]}
                    transform={transforms[studioSide]}
                    onExported={() => setExportsCompleted((n) => n + 1)}
                  />
                </ScreenPanel>
              )}
            </main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
