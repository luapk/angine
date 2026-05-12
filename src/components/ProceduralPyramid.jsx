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
  const innerGroup = useRef()
  const materialRef = useRef()
  const edgesMatRef = useRef()
  const innerEdgesMatRef = useRef()

  // Geometry: 4 radial segments + 1 height segment = square-base pyramid.
  // Radius 0.5, height 0.85 → fits a unit sphere with the apex slightly above
  // center. The slight tallness reads more "pyramid" than "square diamond".
  const coneGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(0.5, 0.85, 4, 1)
    // Re-center vertically (cone's pivot is mid-height by default — already centered, good)
    g.computeVertexNormals()       // for flat shading we'd usually want this, but flatShading on material handles it
    return g
  }, [])

  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(coneGeom, 1), [coneGeom])

  // Inner pyramid — slightly smaller, just edges (no solid)
  const innerEdgesGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(0.32, 0.55, 4, 1)
    return new THREE.EdgesGeometry(g, 1)
  }, [])

  useEffect(() => () => {
    coneGeom.dispose()
    edgesGeom.dispose()
    innerEdgesGeom.dispose()
  }, [coneGeom, edgesGeom, innerEdgesGeom])

  // Palette → material colors
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.set(palette.objectFg)
      materialRef.current.emissive.set(palette.pyramidEmissive || palette.objectEmissive)
    }
    if (edgesMatRef.current) edgesMatRef.current.color.set(palette.keyline)
    if (innerEdgesMatRef.current) innerEdgesMatRef.current.color.set(palette.accent)
  }, [palette])

  useFrame((_, dt) => {
    if (!group.current) return
    const v = engine.values
    const reactive = v[reactiveBand] || 0
    const bass = v.bassPunch || 0
    const treble = v.treble || 0

    // Outer spin
    const speed = spinSpeed * (1 + v.mid * 1.6) * spinDirection
    group.current.rotation[spinAxis] += speed * dt

    // Treble jitter (consistent with ReactiveObject)
    group.current.rotation.x += (Math.random() - 0.5) * treble * trebleWobble * dt * 60
    group.current.rotation.z += (Math.random() - 0.5) * treble * trebleWobble * dt * 60

    // Scale slam
    const s = baseScale * (1 + reactive * punchAmount)
    group.current.scale.set(s, s, s)

    // Inner pyramid: counter-rotate on Y, faster, plus a slight tilt drift
    if (innerGroup.current) {
      innerGroup.current.rotation.y -= (1.4 + v.mid * 3.5) * dt * spinDirection
      innerGroup.current.rotation.x = Math.sin(performance.now() * 0.001) * 0.18
    }

    // Emissive pulse — outer pyramid faces "breathe" with bass
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0.35 + bass * 1.6
    }
  })

  return (
    <group ref={group} position={position} rotation={tilt}>
      {/* Outer solid pyramid — flat shading shows the 4 facets */}
      <mesh geometry={coneGeom}>
        <meshStandardMaterial
          ref={materialRef}
          color={palette.objectFg}
          emissive={palette.pyramidEmissive || palette.objectEmissive}
          emissiveIntensity={0.35}
          flatShading
          roughness={0.55}
          metalness={0.2}
        />
      </mesh>

      {/* Outer edge highlights — crisp keyline read */}
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial ref={edgesMatRef} color={palette.keyline} linewidth={2} />
      </lineSegments>

      {/* Inner counter-rotating wireframe pyramid */}
      <group ref={innerGroup} rotation={[0, Math.PI / 4, 0]}>
        <lineSegments geometry={innerEdgesGeom}>
          <lineBasicMaterial ref={innerEdgesMatRef} color={palette.accent} linewidth={1} transparent opacity={0.85} />
        </lineSegments>
      </group>
    </group>
  )
}
