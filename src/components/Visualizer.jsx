import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

import PolkaBackground from './PolkaBackground.jsx'
import PolkaZoom from './PolkaZoom.jsx'
import DotReveal from './DotReveal.jsx'
import SceneSwitcher from './SceneSwitcher.jsx'
import WordFlash from './WordFlash.jsx'
import EngineTick from './EngineTick.jsx'
import HUD from './HUD.jsx'
import DiceButton3D from './DiceButton3D.jsx'
import { resolvePalette } from '../scene/palette.js'
import { SCENES, PALETTES } from '../scene/SceneDirector.js'

function DisableACES() {
  const gl = useThree(s => s.gl)
  useEffect(() => { gl.toneMapping = 0 }, [gl])
  return null
}

const SPLIT_LEFT  = resolvePalette(PALETTES.WHITE_ON_BLACK)
const SPLIT_RIGHT = resolvePalette(PALETTES.BLACK_ON_WHITE)

const BTN = {
  background: 'rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.35)',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: 16,
  cursor: 'pointer',
  padding: '5px 10px',
  borderRadius: 3,
  lineHeight: 1,
  userSelect: 'none',
}

export default function Visualizer({ engine, director, showHUD }) {
  const [state, setState] = useState(director.state)
  useEffect(() => director.onChange((s) => setState({ ...s })), [director])

  const palette   = useMemo(() => resolvePalette(state.palette), [state.palette])
  const isTunnel    = state.scene === SCENES.TUNNEL
  const isSplit     = state.scene === SCENES.SPLIT
  const isWord      = state.scene === SCENES.WORD_FLASH
  const isQuiet     = state.scene === SCENES.QUIET_TRIANGLE
  const isTriPolar  = state.scene === SCENES.TRIANGLE_POLAR
  const isPolkaZoom  = state.scene === SCENES.POLKA_ZOOM
  const isDotParade  = state.scene === SCENES.DOT_PARADE
  const isTri2D      = false
  const splitFlip    = state.splitFlip

  // DOT_PARADE internal phase: 0=dots, 1=guitar grid, 2=drums grid (white bg)
  const [dotPhase, setDotPhase] = useState(0)
  useEffect(() => {
    if (!isDotParade) { setDotPhase(0); return }
    setDotPhase(0)
    const t1 = setTimeout(() => setDotPhase(1), 1600)
    const t2 = setTimeout(() => setDotPhase(2), 3600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isDotParade, state.spinSeed])

  // Hands flash: eligible every 4th scene cut, 25% chance, 400-700ms duration
  const [flashHands, setFlashHands] = useState(false)
  const flashTimerRef = useRef(null)
  const flashCutCountRef = useRef(0)
  useEffect(() => {
    flashCutCountRef.current++
    if (flashCutCountRef.current % 4 !== 0) return
    if (Math.random() > 0.25) return
    clearTimeout(flashTimerRef.current)
    setFlashHands(true)
    flashTimerRef.current = setTimeout(() => setFlashHands(false), 400 + Math.random() * 300)
    return () => clearTimeout(flashTimerRef.current)
  }, [state.spinSeed])

  // Pause / play
  const [paused, setPaused] = useState(false)
  const togglePlay = useCallback(() => {
    if (paused) { engine.resume(); setPaused(false) }
    else        { engine.pause();  setPaused(true)  }
  }, [engine, paused])

  const rollDice = useCallback(() => {
    director.forceCut()
  }, [director])

  return (
    <div className="stage">
      <div className="stage-inner" style={{
        background: flashHands ? '#000' : (isSplit || isQuiet || isTri2D || isDotParade) ? (isDotParade && dotPhase === 2 ? '#fff' : '#000') : palette.bg
      }}>
        {isPolkaZoom ? (
          <PolkaZoom engine={engine} palette={palette} />
        ) : isDotParade ? (
          <DotReveal show={dotPhase === 0} />
        ) : isSplit ? (
          <>
            <PolkaBackground engine={engine} palette={splitFlip ? SPLIT_RIGHT : SPLIT_LEFT}  half="left" />
            <PolkaBackground engine={engine} palette={splitFlip ? SPLIT_LEFT  : SPLIT_RIGHT} half="right" />
          </>
        ) : (!isTunnel && !isQuiet && !isTri2D) && (
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
          <DisableACES />

          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 6]} intensity={1.2} />
          <directionalLight position={[-5, -3, -4]} intensity={0.4} color={palette.accent} />

          <SceneSwitcher state={state} engine={engine} palette={palette} dotPhase={dotPhase} flashHands={flashHands} />

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

        {isWord && <WordFlash key={state.spinSeed} words={state.currentWords} palette={palette} />}

        <div className="grain" />

        {/* Dev scene tag */}
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 200,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.05em',
          padding: '3px 7px', borderRadius: 3, pointerEvents: 'none',
          opacity: 0.75,
        }}>
          {state.scene} · {state.palette}
        </div>

        {/* Transport controls */}
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, display: 'flex', gap: 8,
        }}>
          <button onClick={togglePlay} style={BTN} title="Pause / Play">
            {paused ? '▶' : '⏸'}
          </button>
          <DiceButton3D onClick={rollDice} />
        </div>

        {showHUD && <HUD engine={engine} director={director} />}
        <div className="watermark">ANGINE DE POITRINE · {engine.bpm?.toFixed(0) ?? '—'} BPM</div>
      </div>
    </div>
  )
}
