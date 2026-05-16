import { useEffect, useRef, useState } from 'react'

/**
 * DotGridReveal — full-bleed dot grid, beat-synced reveal.
 *
 * Columns of dots extend off-frame top and bottom. Each appearance randomly
 * picks one of two reveal modes:
 *   'column' — entire columns slide in from the left, one per beat
 *   'circle' — dots expand outward from centre, two rings per beat
 *
 * Beat cadence: BPM-based setInterval (engine.beatOffset makes onBeat
 * unreliable for sequencing — see CLAUDE.md).
 */
const COLS = 8
const ROWS = 20           // tall enough to bleed off-frame top+bottom
const CELL = `${100 / COLS}vw`   // square cells filling full viewport width

const CX = (COLS - 1) / 2   // 3.5
const CY = (ROWS - 1) / 2   // 9.5

export default function DotGridReveal({ engine }) {
  const [step, setStep] = useState(0)
  const modeRef = useRef('column')

  useEffect(() => {
    modeRef.current = Math.random() < 0.5 ? 'column' : 'circle'
    setStep(0)
    const bpm = engine?.bpm > 0 ? engine.bpm : 120
    const beatMs = 60000 / bpm
    let s = 0
    const id = setInterval(() => { s++; setStep(s) }, beatMs)
    return () => clearInterval(id)
  }, [engine])

  const mode = modeRef.current

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Grid is centred vertically and much taller than viewport — bleeds off frame */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL})`,
        }}
      >
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)

          if (mode === 'column') {
            const entered = col <= step
            return (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div
                  style={{
                    width: '55%',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    background: '#fff',
                    // Slide entire column in from the left as a unit
                    transform: entered ? 'translateX(0)' : 'translateX(-100vw)',
                    transition: entered ? 'transform 200ms cubic-bezier(0.22,1,0.36,1)' : 'none',
                  }}
                />
              </div>
            )
          }

          // Circle mode: expanding radius, 2 rings per beat
          const d = Math.hypot(col - CX, row - CY)
          const on = d <= step * 2
          return (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div
                style={{
                  width: '55%',
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  background: '#fff',
                  transform: on ? 'scale(1)' : 'scale(0)',
                  opacity: on ? 1 : 0,
                  transition: 'transform 140ms ease-out, opacity 140ms ease-out',
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
