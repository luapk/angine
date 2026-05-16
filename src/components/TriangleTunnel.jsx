import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Burst fly-through tunnel: quadratic speed ramp gives slow-approach → WHOOSH feel.
// Smaller TRI_SIZE (vs 5.5) lets perspective create genuine depth — far rings appear tiny.
const RING_COUNT = 26
const RING_SPACING = 3.2
const TRI_SIZE = 2.0

function makeTriangleGeometry(size) {
  const r = size
  const a0 = Math.PI / 2
  const a1 = a0 + (2 * Math.PI) / 3
  const a2 = a1 + (2 * Math.PI) / 3
  const v = (a) => [Math.cos(a) * r, Math.sin(a) * r, 0]
  const pts = [v(a0), v(a1), v(a2), v(a0)].flat()
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

export default function TriangleTunnel({ engine, palette }) {
  const group = useRef()
  const elapsed = useRef(0)

  const geometry = useMemo(() => makeTriangleGeometry(TRI_SIZE), [])
  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color(palette.keyline),
  }), [])

  const lines = useMemo(() => {
    const arr = []
    for (let i = 0; i < RING_COUNT; i++) {
      const line = new THREE.Line(geometry, material)
      line.position.set(0, 0, -i * RING_SPACING)
      arr.push(line)
    }
    return arr
  }, [geometry, material])

  useEffect(() => { material.color.set(palette.keyline) }, [palette, material])

  useEffect(() => {
    elapsed.current = 0
  }, [])

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  useFrame((_, dt) => {
    if (!group.current) return
    elapsed.current += dt
    const t = elapsed.current
    const v = engine.values

    // Quadratic speed ramp: ~8 u/s at t=0 → ~130 u/s at t=1.7s
    const speed = 8 + t * t * 46 + v.bassPunch * 7

    const totalDepth = RING_COUNT * RING_SPACING
    for (const line of lines) {
      line.position.z += speed * dt
      if (line.position.z > 10) line.position.z -= totalDepth
    }

    // Scale ramp: rings grow dramatically near end of 1-bar scene → "burst out" illusion
    const barDuration = (4 * 60) / (engine.bpm || 120)
    const tNorm = Math.min(t / barDuration, 1)
    const scaleUp = 1 + Math.pow(tNorm, 2.5) * 6
    group.current.scale.setScalar(scaleUp)
  })

  return (
    <group ref={group}>
      {lines.map((line, i) => <primitive key={i} object={line} />)}
    </group>
  )
}
