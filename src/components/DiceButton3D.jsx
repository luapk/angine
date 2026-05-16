import { useRef, useMemo, useState } from 'react'
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
  canvas.width = 128; canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 128, 128)
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 4
  ctx.strokeRect(4, 4, 120, 120)
  ctx.fillStyle = '#000000'
  for (const [u, v] of (DOT_LAYOUTS[n] || [])) {
    ctx.beginPath()
    ctx.arc(u * 128, v * 128, 9, 0, Math.PI * 2)
    ctx.fill()
  }
  return new THREE.CanvasTexture(canvas)
}

function Die({ hoveredRef }) {
  const meshRef = useRef()
  const materials = useMemo(() => {
    const faces = [1, 6, 2, 5, 3, 4]
    return faces.map(n => new THREE.MeshStandardMaterial({ map: makeFaceTexture(n), roughness: 0.3, metalness: 0 }))
  }, [])

  useFrame((_, dt) => {
    if (!meshRef.current) return
    const speed = hoveredRef.current ? 3.2 : 1.0
    meshRef.current.rotation.x += 0.28 * speed * dt
    meshRef.current.rotation.y += 0.44 * speed * dt
  })

  return (
    <mesh ref={meshRef} material={materials}>
      <boxGeometry args={[0.85, 0.85, 0.85]} />
    </mesh>
  )
}

export default function DiceButton3D({ onClick }) {
  const [hovered, setHovered] = useState(false)
  const hoveredRef = useRef(false)
  hoveredRef.current = hovered

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        background: '#000',
        border: hovered ? '1.5px solid rgba(255,255,255,0.85)' : '1.5px solid rgba(255,255,255,0.3)',
        cursor: 'pointer',
        overflow: 'hidden',
        transform: hovered ? 'scale(1.18)' : 'scale(1)',
        transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        boxShadow: hovered ? '0 0 14px rgba(255,255,255,0.35)' : 'none',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <Canvas
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 2.2], fov: 42 }}
        style={{ background: 'transparent', width: '100%', height: '100%', display: 'block' }}
      >
        <ambientLight intensity={1.0} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} />
        <Die hoveredRef={hoveredRef} />
      </Canvas>
    </div>
  )
}
