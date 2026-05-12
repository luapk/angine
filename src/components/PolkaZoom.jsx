import { useRef, useEffect } from 'react'

/**
 * Zooms into a single polka dot until it fills the screen.
 * DOM element, lives behind the Canvas. Pulses with bass.
 */
export default function PolkaZoom({ engine, palette }) {
  const dotRef = useRef(null)

  useEffect(() => {
    let raf
    let t0 = performance.now()
    const loop = () => {
      const el = dotRef.current
      if (el && engine?.values) {
        const t = (performance.now() - t0) / 1000
        // 4-second zoom from a tiny dot to filling the screen, then resets
        const cycle = (t % 4) / 4
        const eased = cycle * cycle * (3 - 2 * cycle)
        const bp = engine.values.bassPunch || 0
        const scale = 0.04 + eased * (2.4 + bp * 0.4)
        el.style.transform = `translate(-50%, -50%) scale(${scale})`
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [engine])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        background: palette.bg,
        overflow: 'hidden',
      }}
    >
      <div
        ref={dotRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '120vmax',
          height: '120vmax',
          borderRadius: '50%',
          background: palette.polka,
          transform: 'translate(-50%, -50%) scale(0.04)',
          transformOrigin: 'center',
          willChange: 'transform',
        }}
      />
    </div>
  )
}
