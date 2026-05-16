import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import PolkaBackground from './PolkaBackground.jsx'
import ReactiveObject from './ReactiveObject.jsx'
import EngineTick from './EngineTick.jsx'
import { resolvePalette } from '../scene/palette.js'
import { PALETTES } from '../scene/SceneDirector.js'

const PALETTE_LEFT  = resolvePalette(PALETTES.BLACK_ON_WHITE)
const PALETTE_RIGHT = resolvePalette(PALETTES.WHITE_ON_BLACK)

function DisableACES() {
  const gl = useThree(s => s.gl)
  useEffect(() => { gl.toneMapping = 0 }, [gl])
  return null
}

export default function IntroSequence({ engine, onComplete }) {
  const doneRef = useRef(false)

  useEffect(() => {
    const bpm = engine.bpm || 120
    const twoBars = (8 * 60000) / bpm   // 8 beats = 2 bars in ms
    const t = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onComplete() }
    }, twoBars)
    return () => clearTimeout(t)
  }, [engine, onComplete])

  return (
    <div className="stage">
      <div className="stage-inner" style={{ background: '#000', position: 'relative' }}>
        {/* White left panel */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', background: '#fff', zIndex: 1 }} />

        {/* Inverted polka dots on each half */}
        <PolkaBackground engine={engine} palette={PALETTE_LEFT}  half="left" />
        <PolkaBackground engine={engine} palette={PALETTE_RIGHT} half="right" />

        {/* Static guitar + drums over the panels */}
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 0, 8], fov: 45, near: 0.1, far: 200 }}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'transparent', pointerEvents: 'none' }}
        >
          <EngineTick engine={engine} />
          <DisableACES />
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 6]} intensity={1.2} />

          <ReactiveObject
            url="/models/guitar.glb"
            engine={engine}
            palette={PALETTE_LEFT}
            position={[-2.0, 0, 0]}
            baseScale={1.55}
            spinAxis="y"
            spinDirection={1}
            spinSpeed={0}
            reactiveBand="bassPunch"
            punchAmount={0}
            fallbackGeometry="sphere"
          />
          <ReactiveObject
            url="/models/drums.glb"
            engine={engine}
            palette={PALETTE_RIGHT}
            position={[2.0, 0, 0]}
            baseScale={1.55}
            spinAxis="y"
            spinDirection={-1}
            spinSpeed={0}
            reactiveBand="bassPunch"
            punchAmount={0}
            fallbackGeometry="box"
          />

          <EffectComposer multisampling={0}>
            <Bloom intensity={0.45} luminanceThreshold={0.25} luminanceSmoothing={0.18} mipmapBlur />
          </EffectComposer>
        </Canvas>

        <div className="grain" />
        <div className="watermark">ANGINE DE POITRINE · {engine.bpm?.toFixed(0) ?? '—'} BPM</div>
      </div>
    </div>
  )
}
