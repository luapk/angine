import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * ProceduralPyramid
 *
 * 4-sided pyramid (square base + apex), built procedurally — no GLB needed.
 *
 * Construction:
 *   - Outer solid pyramid: ConeGeometry with 4 radial segments, flat-shaded
 *     so the four faces read as distinct facets.
 *   - Edge highlights: EdgesGeometry on the same shape, drawn as line
 *     segments in the palette's keyline color — gives that crisp keyline-poster
 *     read even when the lighting is soft.
 *   - Inner wireframe pyramid: smaller, counter-rotates on Y for an
 *     "internal mechanism" feel. This is the Weirdcore signature.
 *
 * Audio reactivity:
 *   - Scale slams on bassPunch (same envelope as ReactiveObject)
 *   - Emissive intensity pulses with bass (faces "breathe")
 *   - Inner pyramid spins faster as mid energy rises
 *   - Treble adds chaotic micro-jitter to rotation (matches ReactiveObject feel)
 *
 * Props match ReactiveObject so it's a drop-in substitute for the pyramid slot.
 */
export default function ProceduralPyramid({
  engine,
  palette,
  position = [0, 0, 0],
  baseScale = 1,
  spinAxis = 'y',
  spinDirection = 1,
  spinSpeed = 0.8,
  reactiveBand = 'overall',
  punchAmount = 0.3,
  trebleWobble = 0.06,
  tilt = [0, 0, 0],
}) {
  const group = useRef()
  const materialRef = useRef()
  const edgesMatRef = useRef()

  const coneGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(0.5, 0.85, 4, 1)
    g.computeVertexNormals()
    return g
  }, [])

  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(coneGeom, 1), [coneGeom])

  useEffect(() => () => {
    coneGeom.dispose()
    edgesGeom.dispose()
  }, [coneGeom, edgesGeom])

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.set(palette.objectFg)
      materialRef.current.emissive.set(palette.pyramidEmissive || palette.objectEmissive)
    }
    if (edgesMatRef.current) edgesMatRef.current.color.set(palette.keyline)
  }, [palette])

  useFrame((_, dt) => {
    if (!group.current) return
    const v = engine.values
    const reactive = v[reactiveBand] || 0
    const bass = v.bassPunch || 0
    const treble = v.treble || 0

    const speed = spinSpeed * (1 + v.mid * 1.6) * spinDirection
    group.current.rotation.x += speed * dt

    // treble wobble on Y and Z only (not X since we spin on X)
    group.current.rotation.y += (Math.random() - 0.5) * treble * trebleWobble * dt * 60
    group.current.rotation.z += (Math.random() - 0.5) * treble * trebleWobble * dt * 60

    const s = baseScale * (1 + reactive * punchAmount)
    group.current.scale.set(s, s, s)

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0.35 + bass * 1.6
    }
  })

  return (
    <group ref={group} position={position} rotation={tilt}>
      <mesh geometry={coneGeom}>
        <meshStandardMaterial
          ref={materialRef}
          color={palette.objectFg}
          emissive={palette.pyramidEmissive || palette.objectEmissive}
          emissiveIntensity={0.35}
          flatShading
          roughness={0.6}
          metalness={0}
        />
      </mesh>
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial ref={edgesMatRef} color={palette.keyline} linewidth={2} />
      </lineSegments>
    </group>
  )
}
