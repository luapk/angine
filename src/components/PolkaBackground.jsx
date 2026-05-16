import { useRef, useEffect, useState } from 'react'

/**
 * Polka-dot background. DOM element (not 3D), lives OUTSIDE the r3f Canvas.
 *
 * Default behaviour: polls engine.values via rAF for a bass-reactive dot pulse.
 *
 * `reveal` (one-element scenes only): the pulse is disabled (dots stay put —
 * no moving/sliding), and the SAME dot grid is animated in incrementally,
 * snapped to the beat, via a clip-path that is either an expanding circle or
 * a left→right column wipe (picked at random per appearance). clip-path
 * transitions give the snappy, eased motion.
 *
 * Do NOT use useFrame here — useFrame is Canvas-only.
 */
export default function PolkaBackground({ engine, palette, half, reveal }) {
  const ref = useRef(null)
  const modeRef = useRef('circle')
  const [step, setStep] = useState(0)

  // Bass pulse — only when NOT revealing (reveal must keep dots static)
  useEffect(() => {
    if (reveal) return
    let raf
    const loop = () => {
      const el = ref.current
      if (el && engine?.values) {
        const bp = engine.values.bassPunch || 0
        el.style.setProperty('--pitch', `${56 + bp * 22}px`)
        el.style.setProperty('--dot', `${7 + bp * 6}px`)
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [engine, reveal])

  // Beat-synced incremental reveal. BPM-based timing (engine.beatOffset makes
  // onBeat unreliable for sequencing — see CLAUDE.md).
  useEffect(() => {
    if (!reveal) return
    modeRef.current = Math.random() < 0.5 ? 'circle' : 'column'
    setStep(0)
    const bpm = engine?.bpm > 0 ? engine.bpm : 120
    const beatMs = 60000 / bpm
    let s = 0
    const id = setInterval(() => {
      s += 1
      setStep(s)
      if (s >= 4) clearInterval(id)
    }, beatMs)
    return () => clearInterval(id)
  }, [engine, reveal])

  // Palette change: update bg + dot colors
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--bg', palette.bg)
    el.style.setProperty('--polka', palette.polka)
  }, [palette])

  let clipPath = 'none'
  if (reveal) {
    if (modeRef.current === 'circle') {
      const r = Math.min(110, (step + 1) * 32)
      clipPath = `circle(${r}% at 50% 50%)`
    } else {
      const w = Math.min(100, (step + 1) * 26)
      clipPath = `inset(0 ${100 - w}% 0 0)`
    }
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top:    half === 'bottom' ? '50%' : 0,
        bottom: half === 'top'    ? '50%' : 0,
        left:   half === 'right'  ? '50%' : 0,
        right:  half === 'left'   ? '50%' : 0,
        zIndex: 1,
        '--bg': palette.bg,
        '--polka': palette.polka,
        '--pitch': '56px',
        '--dot': '7px',
        background: `
          radial-gradient(circle at center, var(--polka) calc(var(--dot) / 2), transparent calc(var(--dot) / 2 + 0.5px)) 0 0 / var(--pitch) var(--pitch),
          var(--bg)
        `,
        clipPath,
        WebkitClipPath: clipPath,
        transition: reveal
          ? 'clip-path 150ms cubic-bezier(0.16, 1, 0.3, 1), -webkit-clip-path 150ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'background-color 60ms linear',
      }}
    />
  )
}
