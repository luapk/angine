import { useRef, useEffect } from 'react'

export default function WordFlash({ word, palette }) {
  const containerRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    const fit = () => {
      if (!containerRef.current || !textRef.current) return
      textRef.current.style.fontSize = '100px'
      const cw = containerRef.current.offsetWidth
      const ch = containerRef.current.offsetHeight
      const tw = textRef.current.offsetWidth
      const th = textRef.current.offsetHeight
      const scale = Math.min((cw / tw) * 0.92, (ch / th) * 0.85)
      textRef.current.style.fontSize = `${100 * scale}px`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [word])

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
      <span
        ref={textRef}
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontWeight: 400,
          color: palette.keyline,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {word}
      </span>
    </div>
  )
}
