import { useRef, useEffect } from 'react'

/**
 * Polka-dot background. DOM element (not 3D), lives OUTSIDE the r3f Canvas.
 * Polls engine.values via requestAnimationFrame to update CSS variables for
 * the bass-reactive dot pulse.
 *
 * Do NOT use useFrame here — useFrame is Canvas-only and will throw
 * "R3F: Hooks can only be used within the Canvas component!".
 */
export default function PolkaBackground({ engine, palette, half }) {
  const ref = useRef(null)

  // Per-frame pulse via rAF
  useEffect(() => {
    let raf
    const loop = () => {
      const el = ref.current
      if (el && engine?.values) {
        const bp = engine.values.bassPunch || 0
        const pitch = 56 + bp * 22
        const dot = 7 + bp * 6
        el.style.setProperty('--pitch', `${pitch}px`)
        el.style.setProperty('--dot', `${dot}px`)
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [engine])

  // Palette change: update bg + dot colors
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--bg', palette.bg)
    el.style.setProperty('--polka', palette.polka)
  }, [palette])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left:  half === 'right' ? '50%' : 0,
        right: half === 'left'  ? '50%' : 0,
        zIndex: 1,
        '--bg': palette.bg,
        '--polka': palette.polka,
        '--pitch': '56px',
        '--dot': '7px',
        background: `
          radial-gradient(circle at center, var(--polka) calc(var(--dot) / 2), transparent calc(var(--dot) / 2 + 0.5px)) 0 0 / var(--pitch) var(--pitch),
          var(--bg)
        `,
        transition: 'background-color 60ms linear',
      }}
    />
  )
}
