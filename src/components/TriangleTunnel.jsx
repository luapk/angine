import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Concentric triangle tunnel. ~44 triangle line-loops stacked along Z, all the
 * same world-space size; perspective creates the concentric look on screen.
 * Staggered Z rotation per ring creates a helix/twist feel.
 *
 * Speed and twist scale with bass/overall/mid energy.
 */
const RING_COUNT = 44
const RING_SPACING = 2.6
const TRI_SIZE = 5.5

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

export default function TriangleTunnel({ engine, palette }) {
  const group = useRef()

  // One geometry + one material shared across all rings
  const geometry = useMemo(() => makeTriangleGeometry(TRI_SIZE), [])
  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color(palette.keyline),
    transparent: true,
    opacity: 1,
  }), [])

  // Build line objects ONCE
  const lines = useMemo(() => {
    const arr = []
    for (let i = 0; i < RING_COUNT; i++) {
      const line = new THREE.Line(geometry, material)
      line.position.set(0, 0, -i * RING_SPACING + 3)
      arr.push(line)
    }
    return arr
  }, [geometry, material])

  // Palette updates → just recolor the shared material
  useEffect(() => { material.color.set(palette.keyline) }, [palette, material])

  // Cleanup on unmount
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  useFrame((_, dt) => {
    if (!group.current) return
    const v = engine.values
    const baseSpeed = 20
    const speed = baseSpeed * (1 + v.bassPunch * 1.5 + v.overall * 0.7)

    const recycleDist = RING_COUNT * RING_SPACING
    for (const line of lines) {
      line.position.z += speed * dt
      if (line.position.z > 5) line.position.z -= recycleDist
    }

    group.current.rotation.z += dt * 0.06 * (1 + v.treble * 0.8)
  })

  return (
    <group ref={group}>
      {lines.map((line, i) => <primitive key={i} object={line} />)}
    </group>
  )
}
