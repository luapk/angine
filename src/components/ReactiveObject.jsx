import { useRef, useMemo, Suspense } from 'react'
import React from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * ReactiveObject
 *
 * Loads a GLB and applies audio-reactive transformations.
 * Falls back to a primitive if the GLB fails to load.
 */

function useReactiveTransform({ ref, engine, baseScale, spinAxis, spinDirection, spinSpeed, reactiveBand, punchAmount, trebleWobble }) {
  useFrame((_, dt) => {
    if (!ref.current) return
    const v = engine.values
    const reactive = v[reactiveBand] || 0
    const treble = v.treble || 0

    const speed = spinSpeed * (1 + v.mid * 1.6) * spinDirection
    ref.current.rotation[spinAxis] += speed * dt

    ref.current.rotation.x += (Math.random() - 0.5) * treble * trebleWobble * dt * 60
    ref.current.rotation.z += (Math.random() - 0.5) * treble * trebleWobble * dt * 60

    // Never rotate past ±45° on Z
    const Z_LIMIT = Math.PI / 4
    if (ref.current.rotation.z > Z_LIMIT) ref.current.rotation.z = Z_LIMIT
    else if (ref.current.rotation.z < -Z_LIMIT) ref.current.rotation.z = -Z_LIMIT

    const s = baseScale * (1 + reactive * punchAmount)
    ref.current.scale.set(s, s, s)
  })
}

function GLBObject(props) {
  const { url, engine, palette, position, baseScale, spinAxis, spinDirection, spinSpeed, reactiveBand, punchAmount, trebleWobble, tilt } = props
  const group = useRef()
  const gltf = useGLTF(url)

  const scene = useMemo(() => {
    if (!gltf?.scene) return null
    const cloned = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 0.0001)
    const k = 1 / maxDim
    cloned.scale.setScalar(k)
    box.setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    cloned.position.sub(center)
    cloned.traverse(obj => {
      if (obj.isMesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach(mat => { if (mat.metalness !== undefined) mat.metalness = 0 })
      }
    })
    return cloned
  }, [gltf])

  useReactiveTransform({ ref: group, engine, baseScale, spinAxis, spinDirection, spinSpeed, reactiveBand, punchAmount, trebleWobble })

  if (!scene) return null
  return (
    <group ref={group} position={position} rotation={tilt}>
      <primitive object={scene} />
    </group>
  )
}

function FallbackObject(props) {
  const { engine, position, baseScale, spinAxis, spinDirection, spinSpeed, reactiveBand, punchAmount, trebleWobble, tilt, fallbackGeometry, palette } = props
  const group = useRef()
  useReactiveTransform({ ref: group, engine, baseScale, spinAxis, spinDirection, spinSpeed, reactiveBand, punchAmount, trebleWobble })

  const geom = fallbackGeometry === 'tetra' ? <tetrahedronGeometry args={[0.7, 0]} />
            : fallbackGeometry === 'box' ? <boxGeometry args={[1, 1, 1]} />
            : <icosahedronGeometry args={[0.7, 1]} />

  return (
    <group ref={group} position={position} rotation={tilt}>
      <mesh>
        {geom}
        <meshStandardMaterial
          color={palette?.objectFg || '#fff'}
          emissive={palette?.objectEmissive || '#000'}
          emissiveIntensity={0.4}
          roughness={0.55}
          metalness={0}
        />
      </mesh>
    </group>
  )
}

class GLBErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) {
    if (typeof window !== 'undefined') console.warn('[GLB] failed to load, using fallback:', err?.message)
  }
  render() {
    if (this.state.err) return this.props.fallback
    return this.props.children
  }
}

export default function ReactiveObject(props) {
  const {
    url,
    position = [0, 0, 0],
    baseScale = 1,
    spinAxis = 'y',
    spinDirection = 1,
    spinSpeed = 0.6,
    reactiveBand = 'bassPunch',
    punchAmount = 0.35,
    trebleWobble = 0.06,
    fallbackGeometry = 'sphere',
    tilt = [0, 0, 0],
    palette,
    engine,
  } = props

  const common = { engine, position, baseScale, spinAxis, spinDirection, spinSpeed, reactiveBand, punchAmount, trebleWobble, tilt, palette }

  if (!url) return <FallbackObject {...common} fallbackGeometry={fallbackGeometry} />

  return (
    <GLBErrorBoundary fallback={<FallbackObject {...common} fallbackGeometry={fallbackGeometry} />}>
      <Suspense fallback={<FallbackObject {...common} fallbackGeometry={fallbackGeometry} />}>
        <GLBObject {...common} url={url} />
      </Suspense>
    </GLBErrorBoundary>
  )
}

// Use local draco decoder to avoid CDN dependency (important for mobile)
useGLTF.setDecoderPath('/draco/')

// Preload to avoid pop-in
useGLTF.preload('/models/guitar.glb')
useGLTF.preload('/models/drums.glb')
useGLTF.preload('/models/hands.glb')
