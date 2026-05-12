import { useRef, useEffect, useState } from 'react'

const WORD_MS = 520

export default function WordFlash({ words, palette }) {
  const containerRef = useRef(null)
  const textRef = useRef(null)

  const list = Array.isArray(words) && words.length > 0 ? words : ['']
  const [idx, setIdx] = useState(0)
  const current = list[Math.min(idx, list.length - 1)]

  useEffect(() => {
    if (list.length <= 1) return
    const id = setInterval(() => {
      setIdx((i) => (i + 1 < list.length ? i + 1 : i))
    }, WORD_MS)
    return () => clearInterval(id)
  }, [list.length])

  useEffect(() => {
    const fit = () => {
      if (!containerRef.current || !textRef.current) return
      textRef.current.style.fontSize = '100px'
      const cw = containerRef.current.offsetWidth
      const ch = containerRef.current.offsetHeight
      const tw = textRef.current.scrollWidth
      const th = textRef.current.scrollHeight
      const scale = Math.min((cw / tw) * 0.92, (ch / th) * 0.85)
      textRef.current.style.fontSize = `${100 * scale}px`
    }
    document.fonts.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [current])

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
      }}
    >
      <span
        ref={textRef}
        key={current}
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontWeight: 400,
          color: palette.keyline,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          fontSize: '100px',
          animation: 'word-flash-in 0.12s ease-out forwards',
        }}
      >
        {current}
      </span>
    </div>
  )
}
