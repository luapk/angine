import { useState, useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

import PolkaBackground from './PolkaBackground.jsx'
import SceneSwitcher from './SceneSwitcher.jsx'
import EngineTick from './EngineTick.jsx'
import HUD from './HUD.jsx'
import { resolvePalette } from '../scene/palette.js'
import { SCENES } from '../scene/SceneDirector.js'

/**
 * Drives chromatic aberration offset from engine.values each frame.
 * Sibling of EffectComposer (NOT wrapped around the effect — composer
 * requires direct effect children).
 */
function ChromaUpdater({ engine, target }) {
  useFrame(() => {
    if (!target.current?.offset) return
    const t = engine.values.treble || 0
    const b = engine.values.bassPunch || 0
    const amount = 0.0008 + t * 0.006 + b * 0.003
    target.current.offset.set(amount, amount * 0.6)
  })
  return null
}

export default function Visualizer({ engine, director, showHUD }) {
  // Re-render when director changes scene/palette
  const [state, setState] = useState(director.state)
  useEffect(() => director.onChange((s) => setState({ ...s })), [director])

  const palette = useMemo(() => resolvePalette(state.palette), [state.palette])
  const isTunnel = state.scene === SCENES.TUNNEL

  // Invert-flash overlay on peaks
  const flashRef = useRef(null)
  useEffect(() => {
    const unsub = engine.onPeak((intensity) => {
      if (!flashRef.current) return
      flashRef.current.classList.add('on')
      const dur = 90 + intensity * 140
      setTimeout(() => flashRef.current?.classList.remove('on'), dur)
    })
    return () => unsub?.()
  }, [engine])

  const chromaRef = useRef()

  return (
    <div className="stage">
      <div className="stage-inner" style={{ background: palette.bg }}>
        {!isTunnel && <PolkaBackground engine={engine} palette={palette} />}

        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 0, 8], fov: 45, near: 0.1, far: 200 }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            background: 'transparent',
            pointerEvents: 'none',
          }}
        >
          <EngineTick engine={engine} />
          <ChromaUpdater engine={engine} target={chromaRef} />

          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 6]} intensity={1.2} />
          <directionalLight position={[-5, -3, -4]} intensity={0.4} color={palette.accent} />

          <SceneSwitcher state={state} engine={engine} palette={palette} />

          <EffectComposer multisampling={0}>
            <Bloom
              intensity={isTunnel ? 0.7 : 0.45}
              luminanceThreshold={0.25}
              luminanceSmoothing={0.18}
              mipmapBlur
            />
            <ChromaticAberration
              ref={chromaRef}
              blendFunction={BlendFunction.NORMAL}
              offset={[0.001, 0.0006]}
              radialModulation={false}
              modulationOffset={0}
            />
            <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
            <Vignette eskil={false} offset={0.25} darkness={isTunnel ? 0.65 : 0.35} />
          </EffectComposer>
        </Canvas>

        <div ref={flashRef} className="invert-flash" />
        <div className="grain" />

        {showHUD && <HUD engine={engine} director={director} />}
        <div className="watermark">ANGINE DE POITRINE · {engine.bpm?.toFixed(0) ?? '—'} BPM</div>
      </div>
    </div>
  )
}
