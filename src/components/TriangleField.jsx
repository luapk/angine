import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Field of 50 small triangles each moving on individual Lissajous paths.
 * Parameters are seeded from spinSeed via mulberry32 so each scene instance
 * is different but stable within the scene.
 *
 * Audio reactivity: overall → movement speed + rotation rate,
 *                   bassPunch → amplitude pulse + scale pulse.
 */
const COUNT = 50

// Tiny seeded RNG — same as SceneSwitcher
function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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

export default function TriangleField({ engine, palette, spinSeed = 1 }) {
  const group = useRef()
  // Per-triangle accumulated rotation angles
  const rotAngles = useRef(new Float32Array(COUNT))

  // Shared geometry + material
  const geometry = useMemo(() => makeTriangleGeometry(1.0), [])
  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: new THREE.Color(palette.keyline),
    transparent: true,
    opacity: 1,
  }), [])

  // Per-triangle parameters derived from spinSeed
  const params = useMemo(() => {
    const r = mulberry32(Math.floor(spinSeed))
    const FREQS = [1, 2, 3]
    return Array.from({ length: COUNT }, () => ({
      cx:       (r() - 0.5) * 9.0,   // ±4.5
      cy:       (r() - 0.5) * 5.6,   // ±2.8
      ax:       0.6 + r() * 1.4,     // 0.6–2.0
      ay:       0.6 + r() * 1.4,
      nx:       FREQS[Math.floor(r() * 3)],
      ny:       FREQS[Math.floor(r() * 3)],
      px:       r() * Math.PI * 2,
      py:       r() * Math.PI * 2,
      size:     0.18 + r() * 0.24,   // 0.18–0.42
      rotSpeed: (r() - 0.5) * 2.4,   // ±1.2
    }))
  }, [spinSeed])

  // Build line objects ONCE
  const lines = useMemo(() => {
    return Array.from({ length: COUNT }, () => new THREE.Line(geometry, material))
  }, [geometry, material])

  // Palette updates → recolor shared material
  useEffect(() => { material.color.set(palette.keyline) }, [palette, material])

  // Cleanup on unmount
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  useFrame((state, dt) => {
    if (!group.current) return
    const v = engine.values
    const t = state.clock.elapsedTime

    const speed = 0.35 + v.overall * 0.7
    const bassAmp = 1 + v.bassPunch * 0.4
    const rotBoost = 1 + v.overall * 0.4

    for (let i = 0; i < COUNT; i++) {
      const line = lines[i]
      const p = params[i]

      const x = p.cx + p.ax * bassAmp * Math.sin(p.nx * t * speed + p.px)
      const y = p.cy + p.ay * bassAmp * Math.cos(p.ny * t * speed + p.py)

      rotAngles.current[i] += p.rotSpeed * dt * rotBoost

      const sc = p.size * (1 + v.bassPunch * 0.5)

      line.position.set(x, y, 0)
      line.rotation.z = rotAngles.current[i]
      line.scale.setScalar(sc)
    }
  })

  return (
    <group ref={group}>
      {lines.map((line, i) => <primitive key={i} object={line} />)}
    </group>
  )
}
