import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Single large equilateral triangle, always white.
 * Flashes gold when bassPunch is high. Spins slowly at 0.22 rad/s.
 * No palette prop — always white/gold regardless of scene palette.
 */
const TRI_RADIUS = 2.6
const SPIN_SPEED = 0.22

// Pre-created color instances — defined outside component to avoid recreation
const WHITE = new THREE.Color('#ffffff')
const GOLD  = new THREE.Color('#d4a017')

function makeTriangleGeometry(size) {
  const r = size
  const a0 = -Math.PI / 2
  const a1 = a0 + (2 * Math.PI) / 3
  const a2 = a1 + (2 * Math.PI) / 3
  const v = (a) => [Math.cos(a) * r, Math.sin(a) * r, 0]
  const pts = [v(a0), v(a1), v(a2), v(a0)].flat()
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

export default function QuietTriangle({ engine }) {
  const lineRef = useRef()

  const geometry = useMemo(() => makeTriangleGeometry(TRI_RADIUS), [])
  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color('#ffffff'),
    linewidth: 2,
  }), [])

  // Build the line object once
  const line = useMemo(() => new THREE.Line(geometry, material), [geometry, material])

  // Cleanup on unmount
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  useFrame((_, dt) => {
    if (!lineRef.current) return
    const v = engine.values

    // Slow spin
    lineRef.current.rotation.z += SPIN_SPEED * dt

    // Flash gold when bass punch is high, lerp back to white when low
    if (v.bassPunch > 0.35) {
      material.color.lerp(GOLD, 0.75)
    } else {
      material.color.lerp(WHITE, 0.05)
    }
  })

  return <primitive ref={lineRef} object={line} />
}
