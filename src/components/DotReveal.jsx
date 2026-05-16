import { useEffect, useRef, useState } from 'react'

/**
 * DotReveal — DOM component (no R3F).
 * A 6×3 grid of white dots on black, revealed in time to the beat. Each
 * appearance randomly picks one of two reveal modes:
 *   'circle' — an expanding circular mask from the centre, one ring per beat
 *   'column' — two columns at a time, left → right, one step per beat
 * Beat cadence uses BPM-based timing (engine.beatOffset makes onBeat
 * unreliable for sequencing — see CLAUDE.md).
 */
const COLS = 6
const ROWS = 3
const CX = (COLS - 1) / 2
const CY = (ROWS - 1) / 2

export default function DotReveal({ show, engine }) {
  const [step, setStep] = useState(0)
  const modeRef = useRef('circle')

  useEffect(() => {
    if (!show) return
    modeRef.current = Math.random() < 0.5 ? 'circle' : 'column'
    setStep(0)
    const bpm = engine?.bpm > 0 ? engine.bpm : 120
    const beatMs = 60000 / bpm
    let s = 0
    const id = setInterval(() => { s += 1; setStep(s) }, beatMs)
    return () => clearInterval(id)
  }, [show, engine])

  if (!show) return null

  const total = COLS * ROWS
  const isVisible = (i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    if (modeRef.current === 'column') {
      // two columns per beat, left → right
      return col <= step * 2 + 1
    }
    // expanding circular mask: 3 rings, one per beat
    const d = Math.hypot(col - CX, row - CY)
    const ring = d < 1 ? 0 : d < 2 ? 1 : 2
    return ring <= step
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          width: '78.5%',
          height: '55.8%',
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const on = isVisible(i)
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '40%',
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  background: '#fff',
                  transform: on ? 'scale(1)' : 'scale(0)',
                  opacity: on ? 1 : 0,
                  transition: 'transform 130ms ease-out, opacity 130ms ease-out',
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
