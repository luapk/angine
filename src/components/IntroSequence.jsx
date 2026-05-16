import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useThree } from '@react-three/fiber'
import PolkaBackground from './PolkaBackground.jsx'
import ReactiveObject from './ReactiveObject.jsx'
import EngineTick from './EngineTick.jsx'
import { resolvePalette } from '../scene/palette.js'
import { PALETTES } from '../scene/SceneDirector.js'

const PALETTE_LEFT  = resolvePalette(PALETTES.BLACK_ON_WHITE)  // black dots on white bg
const PALETTE_RIGHT = resolvePalette(PALETTES.WHITE_ON_BLACK)  // white dots on black bg

function DisableACES() {
  const gl = useThree(s => s.gl)
  useEffect(() => { gl.toneMapping = 0 }, [gl])
  return null
}

export default function IntroSequence({ engine, onComplete }) {
  const [subPhase, setSubPhase] = useState(0)
  const [moving, setMoving] = useState(false)
  const beatCountRef = useRef(0)

  useEffect(() => {
    const unsub = engine.onBeat(() => {
      beatCountRef.current++
      const b = beatCountRef.current
      if (b === 2) setSubPhase(1)
      if (b === 3) setSubPhase(2)
      if (b === 5) setSubPhase(3)
      if (b === 7) { setSubPhase(4); setMoving(true) }
      if (b >= 9) onComplete()
    })
    return () => unsub()
  }, [engine, onComplete])

  const showPanels = subPhase >= 1
  const showDots   = subPhase >= 2
  const showModels = subPhase >= 3
  const spinSpeed  = moving ? 0.8 : 0
  const punch      = moving ? 0.42 : 0

  return (
    <div className="stage">
      <div className="stage-inner" style={{ background: '#000', position: 'relative' }}>
        {/* White left panel */}
        {showPanels && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', background: '#fff', zIndex: 1 }} />
        )}

        {/* Polka dots on each half */}
        {showDots && (
          <>
            <PolkaBackground engine={engine} palette={PALETTE_LEFT}  half="left" />
            <PolkaBackground engine={engine} palette={PALETTE_RIGHT} half="right" />
          </>
        )}

        {/* 3D models */}
        {showModels && (
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
              spinAxis="x"
              spinDirection={1}
              spinSpeed={spinSpeed}
              reactiveBand="bassPunch"
              punchAmount={punch}
              fallbackGeometry="sphere"
            />
            <ReactiveObject
              url="/models/drums.glb"
              engine={engine}
              palette={PALETTE_RIGHT}
              position={[2.0, 0, 0]}
              baseScale={1.55}
              spinAxis="x"
              spinDirection={-1}
              spinSpeed={spinSpeed}
              reactiveBand="bassPunch"
              punchAmount={punch}
              fallbackGeometry="box"
            />

            <EffectComposer multisampling={0}>
              <Bloom intensity={0.45} luminanceThreshold={0.25} luminanceSmoothing={0.18} mipmapBlur />
            </EffectComposer>
          </Canvas>
        )}

        <div className="grain" />
        <div className="watermark">ANGINE DE POITRINE · {engine.bpm?.toFixed(0) ?? '—'} BPM</div>
      </div>
    </div>
  )
}
