/**
 * DotReveal — DOM component (no R3F).
 * Renders a 6×3 grid of white circles on a black background.
 * Each circle animates in left-to-right, row-by-row, with an 80ms stagger.
 * The keyframe `dot-appear` is defined in styles.css.
 */
export default function DotReveal({ show }) {
  if (!show) return null

  const cols = 6
  const rows = 3
  const total = cols * rows

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
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          width: '78.5%',
          height: '55.8%',
        }}
      >
        {Array.from({ length: total }, (_, i) => (
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
                animation: `dot-appear 200ms ease-out both`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
