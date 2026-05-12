import { useEffect, useRef } from 'react'

/** Lightweight debug HUD — toggled with 'H'. Updates DOM directly to avoid React re-renders. */
export default function HUD({ engine, director, visible = true }) {
  const ref = useRef(null)

  useEffect(() => {
    let raf
    const loop = () => {
      if (ref.current && engine && director) {
        const v = engine.values
        const s = director.state
        ref.current.innerHTML = `
          <div class="row"><span class="label">BPM</span><span class="gold">${engine.bpm?.toFixed(1) ?? '—'}</span></div>
          <div class="row"><span class="label">BEAT</span><span>${v.beat?.toFixed(2) ?? '0.00'}</span></div>
          <div class="row"><span class="label">BAR</span><span>${v.bar?.toFixed(2) ?? '0.00'}</span></div>
          <div class="row"><span class="label">SCENE</span><span>${s.scene}</span></div>
          <div class="row"><span class="label">PAL</span><span>${s.palette}</span></div>
          <div class="row"><span class="label">CUTS</span><span>${s.cutCount}</span></div>
          <div class="row"><span class="label">BASS</span><span>${(v.bassPunch * 100).toFixed(0)}</span></div>
          <div class="row"><span class="label">MID</span><span>${(v.mid * 100).toFixed(0)}</span></div>
          <div class="row"><span class="label">TRBL</span><span>${(v.treble * 100).toFixed(0)}</span></div>
        `
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [engine, director])

  if (!visible) return null
  return <div ref={ref} className="hud" />
}
