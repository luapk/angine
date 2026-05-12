import { useRef, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const cols = 6
const rows = 3
const colGap = 1.85
const rowGap = 1.85

function gridPositions() {
  const positions = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - 2.5) * colGap
      const y = (r - 1) * rowGap
      positions.push([x, y, 0])
    }
  }
  return positions
}

const POSITIONS = gridPositions()
const TOTAL = cols * rows

function FallbackGrid() {
  return (
    <>
      {POSITIONS.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <icosahedronGeometry args={[0.3, 1]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </>
  )
}

function GridInner({ url, engine }) {
  const { scene: gltfScene } = useGLTF(url)
  const refs = useRef([])

  const clones = useMemo(() => {
    // Clone and normalize base scene
    const base = gltfScene.clone(true)

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(base)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = maxDim > 0 ? 0.7 / maxDim : 1

    // Center pivot
    const center = new THREE.Vector3()
    box.getCenter(center)
    base.position.sub(center.multiplyScalar(scale))
    base.scale.setScalar(scale)

    // Set metalness = 0 on all meshes
    base.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        for (const mat of mats) {
          mat.metalness = 0
        }
      }
    })

    // Create 18 individual clones
    return Array.from({ length: TOTAL }, () => base.clone(true))
  }, [gltfScene])

  useFrame((_, dt) => {
    const bp = engine?.values?.bassPunch ?? 0
    const speed = dt * 0.6 * (1 + bp * 0.8)
    for (let i = 0; i < refs.current.length; i++) {
      const group = refs.current[i]
      if (group) group.rotation.y += speed
    }
  })

  return (
    <>
      {POSITIONS.map(([x, y, z], i) => (
        <group
          key={i}
          ref={(el) => { refs.current[i] = el }}
          position={[x, y, z]}
        >
          <primitive object={clones[i]} />
        </group>
      ))}
    </>
  )
}

export default function DotParadeGrid({ url, engine }) {
  return (
    <Suspense fallback={<FallbackGrid />}>
      <GridInner url={url} engine={engine} />
    </Suspense>
  )
}
