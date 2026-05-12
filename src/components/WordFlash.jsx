import { useRef, useEffect, useState } from 'react'

const ASCII_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&?'

function randomChar() {
  return ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
}

function scrambleWord(word) {
  return word
    .split('')
    .map(ch => (ch === ' ' ? ' ' : randomChar()))
    .join('')
}

export default function WordFlash({ word, palette }) {
  const containerRef = useRef(null)
  const textRef = useRef(null)
  const hiddenRef = useRef(null)

  const [displayed, setDisplayed] = useState(() => scrambleWord(word))

  // Reset scramble whenever word changes
  useEffect(() => {
    setDisplayed(scrambleWord(word))
  }, [word])

  // Scramble animation: reveal characters left to right over ~1.4s
  useEffect(() => {
    const nonSpaceCount = word.replace(/ /g, '').length
    if (nonSpaceCount === 0) {
      setDisplayed(word)
      return
    }

    const intervalMs = Math.max(55, Math.round(1400 / nonSpaceCount))
    let lockedCount = 0

    const id = setInterval(() => {
      lockedCount += 1

      // Build displayed string: lock chars left-to-right (skipping spaces)
      let nonSpaceSeen = 0
      const next = word.split('').map(ch => {
        if (ch === ' ') return ' '
        nonSpaceSeen += 1
        if (nonSpaceSeen <= lockedCount) return ch
        return randomChar()
      }).join('')

      setDisplayed(next)

      if (lockedCount >= nonSpaceCount) {
        clearInterval(id)
      }
    }, intervalMs)

    return () => clearInterval(id)
  }, [word])

  // Font sizing: measure the hidden span (final word) and apply to the visible span
  useEffect(() => {
    const fit = () => {
      if (!containerRef.current || !textRef.current || !hiddenRef.current) return
      // Reset to baseline so measurements are fresh
      hiddenRef.current.style.fontSize = '100px'
      const cw = containerRef.current.offsetWidth
      const ch = containerRef.current.offsetHeight
      const tw = hiddenRef.current.scrollWidth
      const th = hiddenRef.current.scrollHeight
      const scale = Math.min((cw / tw) * 0.92, (ch / th) * 0.85)
      const fontSize = `${100 * scale}px`
      hiddenRef.current.style.fontSize = fontSize
      textRef.current.style.fontSize = fontSize
    }

    document.fonts.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [word])

  const sharedStyle = {
    fontFamily: "'EB Garamond', Georgia, serif",
    fontWeight: 400,
    color: palette.keyline,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    fontSize: '100px',
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        animation: 'word-flash-in 0.12s ease-out forwards',
      }}
    >
      {/* Visible scrambling text */}
      <span ref={textRef} style={sharedStyle}>
        {displayed}
      </span>
      {/* Hidden reference span sized to the final word for stable layout */}
      <span
        ref={hiddenRef}
        style={{
          ...sharedStyle,
          opacity: 0,
          position: 'absolute',
          pointerEvents: 'none',
        }}
      >
        {word}
      </span>
    </div>
  )
}
