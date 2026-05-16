import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'
import ReactiveObject from './ReactiveObject.jsx'
import ProceduralPyramid from './ProceduralPyramid.jsx'
import GoldPyramid from './GoldPyramid.jsx'
import TriangleTunnel from './TriangleTunnel.jsx'
import TriangleThreeUp from './TriangleThreeUp.jsx'
import QuietTriangle from './QuietTriangle.jsx'
import DotParadeGrid from './DotParadeGrid.jsx'
import { SCENES, PALETTES } from '../scene/SceneDirector.js'
import { resolvePalette } from '../scene/palette.js'

const SPLIT_LEFT  = resolvePalette(PALETTES.WHITE_ON_BLACK)
const SPLIT_RIGHT = resolvePalette(PALETTES.BLACK_ON_WHITE)

const URLS = {
  guitar: '/models/guitar.glb',
  drums:  '/models/drums.glb',
}

const DANCER_URLS = [
  '/models/Guitar__Clapping_Run_withSkin.glb',
  '/models/Guitar__Jazz_Hands_withSkin.glb',
  '/models/Guitar_Cardio_Dance_withSkin.glb',
  '/models/Guitar_Cheer_with_Both_Hands_withSkin.glb',
  '/models/Guitar_Running_withSkin.glb',
  '/models/Guitar_Walking_withSkin.glb',
]

function HandsGLB() {
  const group = useRef()
  const elapsedRef = useRef(0)
  const gltf = useGLTF('/models/hands.glb')
  const scene = useMemo(() => {
    if (!gltf?.scene) return null
    const cloned = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 0.0001)
    cloned.scale.setScalar(9.0 / maxDim)
    const center = box.getCenter(new THREE.Vector3())
    cloned.position.sub(center.multiplyScalar(9.0 / maxDim))
    cloned.traverse(obj => {
      if (obj.isMesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach(mat => { if (mat.metalness !== undefined) mat.metalness = 0 })
      }
    })
    return cloned
  }, [gltf])
  useFrame((_, dt) => {
    if (!group.current) return
    elapsedRef.current += dt
    const t = elapsedRef.current
    // Crash in at 2.5×, spring-bounce back to 1× with oscillation
    const bounce = 1 + 1.5 * Math.exp(-t * 9) * (1 + 0.4 * Math.sin(t * 22))
    group.current.scale.setScalar(bounce)
    group.current.rotation.y += dt * 2.2
  })
  if (!scene) return null
  return <group ref={group}><primitive object={scene} /></group>
}

function HandsDisplay() {
  return (
    <Suspense fallback={null}>
      <HandsGLB />
    </Suspense>
  )
}

// Peak-triggered hands scene: slow crash-zoom toward camera, no rotation
function HandsZoomGLB() {
  const group = useRef()
  const elapsedRef = useRef(0)
  const gltf = useGLTF('/models/hands.glb')
  const scene = useMemo(() => {
    if (!gltf?.scene) return null
    const cloned = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 0.0001)
    cloned.scale.setScalar(9.0 / maxDim)
    const center = box.getCenter(new THREE.Vector3())
    cloned.position.sub(center.multiplyScalar(9.0 / maxDim))
    cloned.traverse(obj => {
      if (obj.isMesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach(mat => { if (mat.metalness !== undefined) mat.metalness = 0 })
      }
    })
    return cloned
  }, [gltf])

  useFrame((_, dt) => {
    if (!group.current) return
    elapsedRef.current += dt
    // Linear zoom: starts filling screen, crashes closer over ~1 second
    const s = 1.1 + elapsedRef.current * 1.2
    group.current.scale.setScalar(s)
    // No rotation
  })

  if (!scene) return null
  return <group ref={group}><primitive object={scene} /></group>
}

/**
 * Picks the scene tree based on director state.
 * Keyed on scene + spinSeed so each cut remounts → hard cut feel.
 */
export default function SceneSwitcher({ state, engine, palette, dotPhase, flashHands }) {
  const { scene, spinSeed, splitFlip } = state

  // Generative quirks per scene instance — derived from spinSeed so they stay
  // stable for the duration of the scene but vary between cuts
  const quirks = useMemo(() => {
    const r = mulberry32(Math.floor(spinSeed))
    return {
      spinAxis: 'y',              // always Y — no vertical tipping for 3D objects
      counterAxis: 'y',
      direction: r() < 0.5 ? 1 : -1,
      tiltA: [ (r()-0.5)*0.4, 0, (r()-0.5)*0.3 ],
      tiltB: [ (r()-0.5)*0.4, 0, (r()-0.5)*0.3 ],
      heroAxis: 'y',              // always Y — no vertical tipping
      heroDir: r() < 0.5 ? 1 : -1,
      heroSpeed: 0.4 + r() * 1.2,
      sizeMul: 0.85 + r() * 0.4,
    }
  }, [spinSeed])

  if (flashHands) return <HandsDisplay key="hands-flash" />

  switch (scene) {
    case SCENES.HANDS_ZOOM:
      return (
        <Suspense fallback={null}>
          <HandsZoomGLB key={`hz-${spinSeed}`} />
        </Suspense>
      )

    case SCENES.WORD_FLASH:
      return null   // text rendered as DOM overlay in Visualizer

    case SCENES.TUNNEL:
      return <TriangleTunnel key={`tun-${spinSeed}`} engine={engine} palette={palette} />

    case SCENES.ONE_UP_GUITAR:
      return (
        <ReactiveObject
          key={`g-${spinSeed}`}
          url={URLS.guitar}
          engine={engine}
          palette={palette}
          position={[0, 0, 0]}
          baseScale={3.4 * quirks.sizeMul}
          spinAxis={quirks.heroAxis}
          spinDirection={quirks.heroDir}
          spinSpeed={quirks.heroSpeed}
          reactiveBand="bassPunch"
          punchAmount={0.30}
          fallbackGeometry="sphere"
        />
      )

    case SCENES.ONE_UP_DRUMS:
      return (
        <ReactiveObject
          key={`d-${spinSeed}`}
          url={URLS.drums}
          engine={engine}
          palette={palette}
          position={[0, 0, 0]}
          baseScale={3.4 * quirks.sizeMul}
          spinAxis={quirks.heroAxis}
          spinDirection={-quirks.heroDir}
          spinSpeed={quirks.heroSpeed * 1.1}
          reactiveBand="bassPunch"
          punchAmount={0.30}
          fallbackGeometry="box"
        />
      )

    case SCENES.ONE_UP_PYRAMID:
      return (
        <ProceduralPyramid
          key={`p-${spinSeed}`}
          engine={engine}
          palette={palette}
          position={[0, 0, 0]}
          baseScale={3.6 * quirks.sizeMul}
          spinAxis={quirks.heroAxis}
          spinDirection={quirks.heroDir}
          spinSpeed={quirks.heroSpeed * 1.4}
          reactiveBand="overall"
          punchAmount={0.25}
        />
      )

    case SCENES.THREE_UP: {
      const gap = 2.6
      const sideScale = 1.2 * quirks.sizeMul
      return (
        <group key={`3-${spinSeed}`}>
          <ReactiveObject
            url={URLS.guitar}
            engine={engine}
            palette={palette}
            position={[-gap, 0, 0]}
            baseScale={sideScale}
            spinAxis={quirks.spinAxis}
            spinDirection={quirks.direction}
            spinSpeed={0.9}
            reactiveBand="bassPunch"
            punchAmount={0.4}
            tilt={quirks.tiltA}
            fallbackGeometry="sphere"
          />
          <GoldPyramid
            key={`gp-${spinSeed}`}
            engine={engine}
            position={[0, 0, 0]}
            baseScale={sideScale * 1.4}
            spinDirection={1}
            spinSpeed={1.3}
            reactiveBand="overall"
            punchAmount={0.3}
          />
          <ReactiveObject
            url={URLS.drums}
            engine={engine}
            palette={palette}
            position={[gap, 0, 0]}
            baseScale={sideScale}
            spinAxis={quirks.spinAxis}
            spinDirection={-quirks.direction}
            spinSpeed={0.9}
            reactiveBand="bassPunch"
            punchAmount={0.4}
            tilt={quirks.tiltB}
            fallbackGeometry="box"
          />
        </group>
      )
    }

    case SCENES.SPLIT: {
      // Each model centered at ±gap; baseScale×(1+punch) must stay ≤ gap
      // to avoid crossing the centre line. gap=3.2, scale=2.8, punch=0.12 → max 3.14
      const gap = 3.2
      const leftUrl  = splitFlip ? URLS.drums  : URLS.guitar
      const rightUrl = splitFlip ? URLS.guitar : URLS.drums
      const leftPal  = splitFlip ? SPLIT_RIGHT : SPLIT_LEFT
      const rightPal = splitFlip ? SPLIT_LEFT  : SPLIT_RIGHT
      const leftFallback  = splitFlip ? 'box'    : 'sphere'
      const rightFallback = splitFlip ? 'sphere' : 'box'
      return (
        <group key={`split-${spinSeed}`}>
          <ReactiveObject
            url={leftUrl}
            engine={engine}
            palette={leftPal}
            position={[-gap, 0, 0]}
            baseScale={2.8}
            spinAxis={quirks.spinAxis}
            spinDirection={quirks.direction}
            spinSpeed={0.6}
            reactiveBand="bassPunch"
            punchAmount={0.12}
            tilt={quirks.tiltA}
            fallbackGeometry={leftFallback}
          />
          <ReactiveObject
            url={rightUrl}
            engine={engine}
            palette={rightPal}
            position={[gap, 0, 0]}
            baseScale={2.8}
            spinAxis={quirks.spinAxis}
            spinDirection={-quirks.direction}
            spinSpeed={0.6}
            reactiveBand="bassPunch"
            punchAmount={0.12}
            tilt={quirks.tiltB}
            fallbackGeometry={rightFallback}
          />
        </group>
      )
    }

    case SCENES.POLKA_ZOOM: {
      // Pick a hero object based on spinSeed so each appearance varies
      const heroPick = Math.floor(spinSeed) % 3
      if (heroPick === 0) {
        return (
          <ProceduralPyramid
            key={`pz-${spinSeed}`}
            engine={engine}
            palette={palette}
            position={[0, 0, 0]}
            baseScale={2.4 * quirks.sizeMul}
            spinAxis={quirks.heroAxis}
            spinDirection={quirks.heroDir}
            spinSpeed={quirks.heroSpeed * 1.1}
            reactiveBand="overall"
            punchAmount={0.22}
          />
        )
      }
      return (
        <ReactiveObject
          key={`pz-${spinSeed}`}
          url={heroPick === 1 ? URLS.guitar : URLS.drums}
          engine={engine}
          palette={palette}
          position={[0, 0, 0]}
          baseScale={2.4 * quirks.sizeMul}
          spinAxis={quirks.heroAxis}
          spinDirection={quirks.heroDir}
          spinSpeed={quirks.heroSpeed}
          reactiveBand="bassPunch"
          punchAmount={0.28}
          fallbackGeometry={heroPick === 1 ? 'sphere' : 'box'}
        />
      )
    }

    case SCENES.GUITAR_DANCER: {
      const dancerIdx = Math.floor(spinSeed) % DANCER_URLS.length
      const dancerDir = quirks.heroDir
      return (
        <ReactiveObject
          key={`dancer-${spinSeed}`}
          url={DANCER_URLS[dancerIdx]}
          engine={engine}
          palette={palette}
          position={[0, -1.0, 0]}
          baseScale={4.0 * quirks.sizeMul}
          spinAxis="y"
          spinDirection={dancerDir}
          spinSpeed={quirks.heroSpeed * 0.6}
          reactiveBand="overall"
          punchAmount={0.18}
          trebleWobble={0.02}
          tilt={[0.3, 0, 0]}
          fallbackGeometry="sphere"
        />
      )
    }

    case SCENES.TRIANGLE_POLAR:
      return <TriangleThreeUp key={`tt-${spinSeed}`} engine={engine} palette={palette} spinSeed={spinSeed} />

    case SCENES.QUIET_TRIANGLE:
      return <QuietTriangle key={`qt-${spinSeed}`} engine={engine} />

    case SCENES.DOT_PARADE:
      // Phase 0: dots are DOM layer (DotReveal in Visualizer) — nothing in Canvas
      // Phase 1: guitar grid
      // Phase 2: drums grid (white bg also handled in Visualizer)
      if (dotPhase === 0) return null
      return (
        <DotParadeGrid
          key={`dp-${spinSeed}-${dotPhase}`}
          url={dotPhase === 1 ? URLS.guitar : URLS.drums}
          engine={engine}
        />
      )

    case SCENES.TWO_UP:
    default: {
      const gap = 2.0
      return (
        <group key={`2-${spinSeed}`}>
          <ReactiveObject
            url={URLS.guitar}
            engine={engine}
            palette={palette}
            position={[-gap, 0, 0]}
            baseScale={1.55 * quirks.sizeMul}
            spinAxis={quirks.spinAxis}
            spinDirection={quirks.direction}
            spinSpeed={0.8}
            reactiveBand="bassPunch"
            punchAmount={0.42}
            tilt={quirks.tiltA}
            fallbackGeometry="sphere"
          />
          <ReactiveObject
            url={URLS.drums}
            engine={engine}
            palette={palette}
            position={[gap, 0, 0]}
            baseScale={1.55 * quirks.sizeMul}
            spinAxis={quirks.spinAxis}
            spinDirection={-quirks.direction}
            spinSpeed={0.8}
            reactiveBand="bassPunch"
            punchAmount={0.42}
            tilt={quirks.tiltB}
            fallbackGeometry="box"
          />
        </group>
      )
    }
  }
}

// Tiny seeded RNG so each spinSeed yields consistent quirks
function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
