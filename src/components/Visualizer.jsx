import { useState, useEffect, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

import PolkaBackground from './PolkaBackground.jsx'
import SceneSwitcher from './SceneSwitcher.jsx'
import EngineTick from './EngineTick.jsx'
import HUD from './HUD.jsx'
import { resolvePalette } from '../scene/palette.js'
import { SCENES, PALETTES } from '../scene/SceneDirector.js'

const SPLIT_LEFT  = resolvePalette(PALETTES.WHITE_ON_BLACK)
const SPLIT_RIGHT = resolvePalette(PALETTES.BLACK_ON_WHITE)

export default function Visualizer({ engine, director, showHUD }) {
  const [state, setState] = useState(director.state)
  useEffect(() => director.onChange((s) => setState({ ...s })), [director])

  const palette = useMemo(() => resolvePalette(state.palette), [state.palette])
  const isTunnel = state.scene === SCENES.TUNNEL
  const isSplit  = state.scene === SCENES.SPLIT

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

  return (
    <div className="stage">
      <div className="stage-inner" style={{ background: isSplit ? '#000' : palette.bg }}>
        {isSplit ? (
          <>
            <PolkaBackground engine={engine} palette={SPLIT_LEFT}  half="left" />
            <PolkaBackground engine={engine} palette={SPLIT_RIGHT} half="right" />
          </>
        ) : !isTunnel && (
          <PolkaBackground engine={engine} palette={palette} />
        )}

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
