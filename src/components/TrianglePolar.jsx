import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Ring of 20 equilateral triangles arranged at equal angular intervals around
 * a circle. Each triangle's rotation speed follows a sine wave based on its
 * ring position (3 complete waves), creating a "cresting wave" pattern.
 * Even indices rotate CW, odd CCW. The whole group rotates slowly.
 *
 * Audio reactivity: overall → rotation speed, bassPunch → ring radius + scale.
 */
const COUNT = 20
const BASE_RADIUS = 3.0
const TRI_SIZE = 0.55
const WAVE_FREQ = 3  // complete sine waves around the ring

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

export default function TrianglePolar({ engine, palette }) {
  const group = useRef()
  // Per-triangle accumulated rotation angles
  const angles = useRef(new Float32Array(COUNT))

  // Shared geometry + material for all triangles
  const geometry = useMemo(() => makeTriangleGeometry(TRI_SIZE), [])
  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color(palette.keyline),
    transparent: true,
    opacity: 1,
  }), [])

  // Build line objects ONCE
  const lines = useMemo(() => {
    const arr = []
    for (let i = 0; i < COUNT; i++) {
      const line = new THREE.Line(geometry, material)
      arr.push(line)
    }
    return arr
  }, [geometry, material])

  // Palette updates → recolor shared material
  useEffect(() => { material.color.set(palette.keyline) }, [palette, material])

  // Cleanup on unmount
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  useFrame((_, dt) => {
    if (!group.current) return
    const v = engine.values

    // Overall audio modulates rotation speed
    const overallBoost = 1 + v.overall * 2.5
    // Bass pulses ring radius outward
    const radius = BASE_RADIUS + v.bassPunch * 1.2
    // Bass also pulses individual triangle scale
    const bassScale = 1 + v.bassPunch * 0.6

    for (let i = 0; i < COUNT; i++) {
      const line = lines[i]
      const frac = i / COUNT  // 0..1
      const angle = frac * Math.PI * 2  // angular position on ring

      // Sine wave across ring position → 3 crests per ring
      const waveFactor = Math.sin(frac * Math.PI * 2 * WAVE_FREQ)
      // Map waveFactor (-1..1) to rotation speed (slow→fast)
      const baseRotSpeed = 0.5 + 1.5 * ((waveFactor + 1) / 2)  // 0.5..2.0
      const rotSpeed = baseRotSpeed * overallBoost

      // Even indices CW (negative), odd CCW (positive)
      const dir = (i % 2 === 0) ? -1 : 1
      angles.current[i] += dir * rotSpeed * dt

      // Position on ring
      line.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      )
      line.rotation.z = angles.current[i]
      line.scale.setScalar(bassScale)
    }

    // Slow rotation of the whole group
    group.current.rotation.z += dt * 0.08 * (1 + v.overall * 0.3)
  })

  return (
    <group ref={group}>
      {lines.map((line, i) => <primitive key={i} object={line} />)}
    </group>
  )
}
