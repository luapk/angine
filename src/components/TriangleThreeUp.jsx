import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'

const R = 1.35  // triangle circumradius

function triPoints(inverted) {
  const a0 = inverted ? -Math.PI / 2 : Math.PI / 2
  const pts = []
  for (let i = 0; i < 3; i++) {
    const a = a0 + (i * 2 * Math.PI) / 3
    pts.push([Math.cos(a) * R, Math.sin(a) * R, 0])
  }
  pts.push(pts[0])
  return pts
}

const PTS_UP   = triPoints(false)
const PTS_DOWN = triPoints(true)

function SpinTri({ position, inverted, direction, engine, palette }) {
  const group = useRef()
  useFrame((_, dt) => {
    if (!group.current) return
    const v = engine.values
    const speed = 0.9 * (1 + v.bassPunch * 0.6)
    group.current.rotation.x += speed * direction * dt
    const s = 1 + v.overall * 0.18
    group.current.scale.setScalar(s)
  })
  return (
    <group ref={group} position={position}>
      <Line points={inverted ? PTS_DOWN : PTS_UP} color={palette.keyline} lineWidth={3} />
    </group>
  )
}

export default function TriangleThreeUp({ engine, palette, spinSeed }) {
  return (
    <group key={spinSeed}>
      <SpinTri position={[-2.6, 0, 0]} inverted={false} direction={1}  engine={engine} palette={palette} />
      <SpinTri position={[0, 0, 0]}    inverted={true}  direction={-1} engine={engine} palette={palette} />
      <SpinTri position={[2.6, 0, 0]}  inverted={false} direction={1}  engine={engine} palette={palette} />
    </group>
  )
}
