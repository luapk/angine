import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Renders the polka-dot background as a DOM element (not 3D).
 * Reads engine.values.bassPunch every frame for size pulse.
 */
export default function PolkaBackground({ engine, palette }) {
  const ref = useRef(null)

  // CSS-driven pulse. We use useFrame to update CSS vars at frame rate.
  useFrame(() => {
    if (!ref.current) return
    const bp = engine.values.bassPunch || 0
    // base dot pitch = 56px; pulse ±18px with bass punch
    const pitch = 56 + bp * 22
    const dot = 7 + bp * 6
    ref.current.style.setProperty('--pitch', `${pitch}px`)
    ref.current.style.setProperty('--dot', `${dot}px`)
  })

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.setProperty('--bg', palette.bg)
    ref.current.style.setProperty('--polka', palette.polka)
  }, [palette])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
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
