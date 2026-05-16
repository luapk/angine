import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const GOLD = '#d4a017'
const FLASH_PATTERN_MS = [60, 60, 60, 60, 60, 60]  // alternating off/on × 3

export default function GoldPyramid({
  engine,
  position = [0, 0, 0],
  baseScale = 1,
  spinSpeed = 1.3,
  spinDirection = 1,
  reactiveBand = 'overall',
  punchAmount = 0.3,
}) {
  const group = useRef()

  const coneGeom = useMemo(() => {
    const g = new THREE.ConeGeometry(0.5, 0.85, 4, 1)
    g.computeVertexNormals()
    return g
  }, [])

  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(coneGeom, 1), [coneGeom])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: GOLD }), [])

  useEffect(() => () => {
    coneGeom.dispose()
    edgesGeom.dispose()
    mat.dispose()
  }, [coneGeom, edgesGeom, mat])

  // Flash on mount: off/on 3 times, then stay on
  useEffect(() => {
    if (!group.current) return
    group.current.visible = false
    const timeouts = []
    let t = 0
    FLASH_PATTERN_MS.forEach((dur, i) => {
      timeouts.push(setTimeout(() => {
        if (group.current) group.current.visible = (i % 2 === 1)
      }, t))
      t += dur
    })
    timeouts.push(setTimeout(() => {
      if (group.current) group.current.visible = true
    }, t))
    return () => timeouts.forEach(clearTimeout)
  }, [])

  useFrame((_, dt) => {
    if (!group.current) return
    const v = engine.values
    const reactive = v[reactiveBand] || 0
    group.current.rotation.y += spinSpeed * spinDirection * (1 + v.mid * 1.2) * dt
    const s = baseScale * (1 + reactive * punchAmount)
    group.current.scale.set(s, s, s)
  })

  return (
    <group ref={group} position={position}>
      <lineSegments geometry={edgesGeom} material={mat} />
    </group>
  )
}
