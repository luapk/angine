import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const DOT_LAYOUTS = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]],
}

function makeFaceTexture(n) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 128, 128)
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 4
  ctx.strokeRect(4, 4, 120, 120)
  ctx.fillStyle = '#000000'
  const dots = DOT_LAYOUTS[n] || []
  for (const [u, v] of dots) {
    ctx.beginPath()
    ctx.arc(u * 128, v * 128, 9, 0, Math.PI * 2)
    ctx.fill()
  }
  return new THREE.CanvasTexture(canvas)
}

function Die({ position, bias }) {
  const meshRef = useRef()
  const materials = useMemo(() => {
    const faces = [1, 6, 2, 5, 3, 4]
    return faces.map(n => new THREE.MeshStandardMaterial({
      map: makeFaceTexture(n),
      roughness: 0.3,
      metalness: 0,
    }))
  }, [])

  useFrame((_, dt) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x += (0.28 + bias * 0.07) * dt
    meshRef.current.rotation.y += (0.44 + bias * 0.11) * dt
  })

  return (
    <mesh ref={meshRef} position={position} material={materials}>
      <boxGeometry args={[0.85, 0.85, 0.85]} />
    </mesh>
  )
}

export default function DiceScreen({ bpm, onPlay, onUpload }) {
  return (
    <div className="dice-screen">
      <div className="brand-garamond" style={{ textAlign: 'center' }}>
        ANGINE<br />DE<br />POITRINE
        <span className="brand-garamond-sub">VISUAL ENGINE · V0.1</span>
      </div>

      <div className="dice-canvas-wrap">
        <Canvas
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 0, 4.5], fov: 42 }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
        >
          <ambientLight intensity={1.0} />
          <directionalLight position={[3, 5, 4]} intensity={1.4} />
          <Die position={[-1.05, 0, 0]} bias={0} />
          <Die position={[1.05, 0, 0]} bias={1} />
        </Canvas>
      </div>

      <div className="dice-label">ROLL DICE TO PLAY</div>
      <div className="dice-bpm">{bpm?.toFixed(1)} BPM DETECTED</div>
      <button className="dice-btn" onClick={onPlay}>▶ START SEQUENCE</button>

      {onUpload && (
        <button
          className="dice-upload-link"
          onClick={onUpload}
        >
          UPLOAD DIFFERENT TRACK
        </button>
      )}
    </div>
  )
}
