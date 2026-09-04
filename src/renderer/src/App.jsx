import { useEffect, useState } from 'react'
import TemplateSetup from './screens/TemplateSetup.jsx'
import ShirtCalibration from './screens/ShirtCalibration.jsx'
import DesignPlacement from './screens/DesignPlacement.jsx'
import ExportGrid from './screens/ExportGrid.jsx'

const TABS = [
  { id: 'template', label: '1. Template Setup' },
  { id: 'calibration', label: '2. Shirt Calibration' },
  { id: 'placement', label: '3. Design Placement' },
  { id: 'export', label: '4. Export' }
]

export default function App() {
  const [tab, setTab] = useState('template')
  const [templateSrcs, setTemplateSrcs] = useState({ front: null, back: null })
  const [templateQuads, setTemplateQuads] = useState({ front: null, back: null })
  const [shirtFiles, setShirtFiles] = useState([])
  const [shirtsConfig, setShirtsConfig] = useState({})
  const [loading, setLoading] = useState(true)

  const [side, setSide] = useState('front')
  const [designs, setDesigns] = useState({ front: null, back: null })
  const [transforms, setTransforms] = useState({ front: null, back: null })

  useEffect(() => {
    async function init() {
      const [frontSrc, backSrc, files, config] = await Promise.all([
        window.api.getTemplateImage('front'),
        window.api.getTemplateImage('back'),
        window.api.listShirtImages(),
        window.api.loadConfig()
      ])
      setTemplateSrcs({ front: frontSrc, back: backSrc })
      setTemplateQuads({ front: config.template?.front?.quad ?? null, back: config.template?.back?.quad ?? null })
      setShirtFiles(files)
      setShirtsConfig(config.shirts ?? {})
      setLoading(false)
    }
    init()
  }, [])

  function setTemplateQuadForSide(s, quad) {
    setTemplateQuads((prev) => ({ ...prev, [s]: quad }))
  }

  function setDesignForSide(s, design) {
    setDesigns((prev) => ({ ...prev, [s]: design }))
  }

  function setTransformForSide(s, transform) {
    setTransforms((prev) => ({ ...prev, [s]: transform }))
  }

  if (loading) {
    return <div className="app-loading">Loading…</div>
  }

  return (
    <div className="app">
      <div className="top-bar">
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={t.id === tab ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="global-side-toggle">
          <span className="global-side-label">Working on:</span>
          <div className="side-toggle">
            <button className={side === 'front' ? 'active' : ''} onClick={() => setSide('front')}>
              Front
            </button>
            <button className={side === 'back' ? 'active' : ''} onClick={() => setSide('back')}>
              Back
            </button>
          </div>
        </div>
      </div>

      <main>
        {tab === 'template' && (
          <TemplateSetup
            side={side}
            templateSrcs={templateSrcs}
            templateQuads={templateQuads}
            onSaved={setTemplateQuadForSide}
          />
        )}
        {tab === 'calibration' && (
          <ShirtCalibration
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
        )}
        {tab === 'placement' && (
          <DesignPlacement
            side={side}
            templateSrcs={templateSrcs}
            templateQuads={templateQuads}
            shirtFiles={shirtFiles}
            shirtsConfig={shirtsConfig}
            design={designs[side]}
            setDesign={(d) => setDesignForSide(side, d)}
            transform={transforms[side]}
            setTransform={(t) => setTransformForSide(side, t)}
          />
        )}
        {tab === 'export' && (
          <ExportGrid
            side={side}
            templateQuads={templateQuads}
            shirtFiles={shirtFiles}
            shirtsConfig={shirtsConfig}
            design={designs[side]}
            transform={transforms[side]}
          />
        )}
      </main>
    </div>
  )
}
