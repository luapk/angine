import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
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
  '/models/Guitar_Cardio_Dance_withSkin.glb',
  '/models/Guitar_Walking_withSkin.glb',
  '/models/Guitar__Clapping_Run_withSkin.glb',
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
    const bounce = 1 + 1.5 * Math.exp(-t * 9) * (1 + 0.4 * Math.sin(t * 22))
    group.current.scale.setScalar(bounce)
    // Gentle sway, capped at ±10° (0.175 rad)
    group.current.rotation.y = 0.175 * Math.sin(t * 1.8)
  })
  if (!scene) return null
  return <group ref={group}><primitive object={scene} dispose={null} /></group>
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
  return <group ref={group}><primitive object={scene} dispose={null} /></group>
}

// Dancer GLBs use SkinnedMesh — can't use clone(true) or ReactiveObject.
// The static bind-pose bounding box does NOT match where the posed/skinned
// mesh actually renders, so we measure the live posed bounds a few frames in
// (via SkinnedMesh.computeBoundingBox) and stand the character on the bottom
// edge of the viewport.
function DancerGLB({ url, engine, spinDirection, spinSpeed, portrait }) {
  const groupRef = useRef()
  const gltf = useGLTF(url)
  const placedRef = useRef(false)
  const frameRef = useRef(0)

  const object = useMemo(() => {
    if (!gltf?.scene) return null
    const cloned = skeletonClone(gltf.scene)

    // Scale to fit the viewport height so the full character is visible.
    // landscape fov45 z=8 → ~6.6 tall; portrait fov72 → ~11.2 tall.
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 0.0001)
    const targetH = portrait ? 9.0 : 5.5
    cloned.scale.multiplyScalar(targetH / maxDim)

    // Clone materials so we don't corrupt the useGLTF cache, then push contrast.
    const contrast = (c) => Math.min(1, Math.max(0, (c - 0.5) * 1.35 + 0.5))
    const applyMat = (m) => {
      const mat = m.clone()
      mat.metalness = 0
      mat.roughness = 0.8
      if (mat.emissive) mat.emissive.set('#000000')
      mat.emissiveIntensity = 0
      if (mat.color) mat.color.setRGB(contrast(mat.color.r), contrast(mat.color.g), contrast(mat.color.b))
      return mat
    }
    cloned.traverse(obj => {
      if (obj.isMesh && obj.material) {
        obj.material = Array.isArray(obj.material)
          ? obj.material.filter(Boolean).map(applyMat)
          : applyMat(obj.material)
      }
    })

    return cloned
  }, [gltf, portrait])

  const clips = useMemo(() => gltf.animations || [], [gltf])
  const { actions } = useAnimations(clips, groupRef)

  useEffect(() => {
    const first = Object.values(actions || {})[0]
    if (first) { first.reset().play() }
    return () => { Object.values(actions || {}).forEach(a => a?.stop()) }
  }, [actions])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return

    // Wait a few frames so the animation mixer has posed the skeleton, then
    // measure the real skinned bounds and drop the feet onto the bottom frame.
    if (!placedRef.current) {
      frameRef.current++
      if (frameRef.current >= 5) {
        g.updateWorldMatrix(true, true)
        const wb = new THREE.Box3()
        let found = false
        g.traverse(o => {
          if (o.isSkinnedMesh && typeof o.computeBoundingBox === 'function') {
            o.computeBoundingBox()
            if (o.boundingBox) {
              wb.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld))
              found = true
            }
          } else if (o.isMesh && o.geometry) {
            if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
            wb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld))
            found = true
          }
        })
        if (found && isFinite(wb.min.y) && wb.max.y > wb.min.y) {
          const c = wb.getCenter(new THREE.Vector3())
          const floorY = portrait ? -5.6 : -3.2
          g.position.x -= c.x
          g.position.y += floorY - wb.min.y
          placedRef.current = true
        }
      }
    }

    const v = engine.values
    g.rotation.y += spinDirection * spinSpeed * (1 + v.mid * 0.6) * dt
  })

  if (!object) return null
  return (
    <group ref={groupRef}>
      <primitive object={object} dispose={null} />
    </group>
  )
}

/**
 * Picks the scene tree based on director state.
 * Keyed on scene + spinSeed so each cut remounts → hard cut feel.
 */
export default function SceneSwitcher({ state, engine, palette, dotPhase, flashHands, portrait }) {
  const { scene, spinSeed, splitFlip } = state

  // Spacing tuned against the actual viewport. Camera z=8:
  //   landscape fov45 → visible ≈ 11.8w × 6.6h
  //   portrait  fov70 → visible ≈ 6.3w × 11.2h
  // Objects are sized so half-extent + offset never exceeds the visible bound.
  const TWO_OFF   = portrait ? 2.7 : 2.5
  const THREE_OFF = portrait ? 3.5 : 3.1
  const SPLIT_OFF = portrait ? 2.8 : 3.0
  const TWO_SCALE   = 2.2
  const THREE_SIDE  = 1.4
  const SPLIT_SCALE = portrait ? 2.4 : 4.0

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
    case SCENES.DOT_GRID:
      return null   // DOM layers rendered in Visualizer

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
          baseScale={4.0 * quirks.sizeMul}
          spinAxis={quirks.heroAxis}
          spinDirection={quirks.heroDir}
          spinSpeed={quirks.heroSpeed}
          reactiveBand="bassPunch"
          punchAmount={0.22}
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
          baseScale={3.8 * quirks.sizeMul}
          spinAxis={quirks.heroAxis}
          spinDirection={-quirks.heroDir}
          spinSpeed={quirks.heroSpeed * 1.1}
          reactiveBand="bassPunch"
          punchAmount={0.22}
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
          baseScale={3.5 * quirks.sizeMul}
          spinAxis={quirks.heroAxis}
          spinDirection={quirks.heroDir}
          spinSpeed={quirks.heroSpeed * 1.4}
          reactiveBand="overall"
          punchAmount={0.22}
        />
      )

    case SCENES.THREE_UP: {
      const off = THREE_OFF
      const sideScale = THREE_SIDE * quirks.sizeMul
      // Portrait: stack guitar / pyramid / drums top → bottom
      const posA = portrait ? [0,  off, 0] : [-off, 0, 0]
      const posC = portrait ? [0, -off, 0] : [ off, 0, 0]
      return (
        <group key={`3-${spinSeed}`}>
          <ReactiveObject
            url={URLS.guitar}
            engine={engine}
            palette={palette}
            position={posA}
            baseScale={sideScale}
            spinAxis={quirks.spinAxis}
            spinDirection={quirks.direction}
            spinSpeed={0.9}
            reactiveBand="bassPunch"
            punchAmount={0.3}
            tilt={quirks.tiltA}
            fallbackGeometry="sphere"
          />
          <GoldPyramid
            key={`gp-${spinSeed}`}
            engine={engine}
            position={[0, 0, 0]}
            baseScale={sideScale * 1.15}
            spinDirection={1}
            spinSpeed={1.3}
            reactiveBand="overall"
            punchAmount={0.25}
          />
          <ReactiveObject
            url={URLS.drums}
            engine={engine}
            palette={palette}
            position={posC}
            baseScale={sideScale}
            spinAxis={quirks.spinAxis}
            spinDirection={-quirks.direction}
            spinSpeed={0.9}
            reactiveBand="bassPunch"
            punchAmount={0.3}
            tilt={quirks.tiltB}
            fallbackGeometry="box"
          />
        </group>
      )
    }

    case SCENES.SPLIT: {
      const leftUrl  = splitFlip ? URLS.drums  : URLS.guitar
      const rightUrl = splitFlip ? URLS.guitar : URLS.drums
      const leftPal  = splitFlip ? SPLIT_RIGHT : SPLIT_LEFT
      const rightPal = splitFlip ? SPLIT_LEFT  : SPLIT_RIGHT
      const leftFallback  = splitFlip ? 'box'    : 'sphere'
      const rightFallback = splitFlip ? 'sphere' : 'box'
      // Portrait: objects sit in top / bottom panel; landscape: left / right
      const posA = portrait ? [0,  SPLIT_OFF, 0] : [-SPLIT_OFF, 0, 0]
      const posB = portrait ? [0, -SPLIT_OFF, 0] : [ SPLIT_OFF, 0, 0]
      return (
        <group key={`split-${spinSeed}`}>
          <ReactiveObject
            url={leftUrl}
            engine={engine}
            palette={leftPal}
            position={posA}
            baseScale={SPLIT_SCALE}
            spinAxis={quirks.spinAxis}
            spinDirection={quirks.direction}
            spinSpeed={0.6}
            reactiveBand="bassPunch"
            punchAmount={0.10}
            tilt={quirks.tiltA}
            fallbackGeometry={leftFallback}
          />
          <ReactiveObject
            url={rightUrl}
            engine={engine}
            palette={rightPal}
            position={posB}
            baseScale={SPLIT_SCALE}
            spinAxis={quirks.spinAxis}
            spinDirection={-quirks.direction}
            spinSpeed={0.6}
            reactiveBand="bassPunch"
            punchAmount={0.10}
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
            baseScale={3.4 * quirks.sizeMul}
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
      const dancerFallback = (
        <ProceduralPyramid
          engine={engine} palette={palette}
          position={[0, 0, 0]} baseScale={3.5}
          spinAxis="y" spinDirection={quirks.heroDir} spinSpeed={1.0}
          reactiveBand="overall" punchAmount={0.2}
        />
      )
      return (
        <group key={`dancer-${spinSeed}`}>
          {/* Extra scene lights: palette accent is black on BLACK_ON_WHITE so we add white fill */}
          <directionalLight position={[3, 7, 5]} intensity={2.2} />
          <directionalLight position={[-4, 2, 4]} intensity={0.9} />
        <Suspense fallback={dancerFallback}>
          <DancerGLB
            url={DANCER_URLS[dancerIdx]}
            engine={engine}
            spinDirection={quirks.heroDir}
            spinSpeed={quirks.heroSpeed * 0.5}
            portrait={portrait}
          />
        </Suspense>
        </group>
      )
    }

    case SCENES.TRIANGLE_POLAR:
      return <TriangleThreeUp key={`tt-${spinSeed}`} engine={engine} palette={palette} spinSeed={spinSeed} portrait={portrait} />

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
      const off = TWO_OFF
      const posA = portrait ? [0,  off, 0] : [-off, 0, 0]
      const posB = portrait ? [0, -off, 0] : [ off, 0, 0]
      return (
        <group key={`2-${spinSeed}`}>
          <ReactiveObject
            url={URLS.guitar}
            engine={engine}
            palette={palette}
            position={posA}
            baseScale={TWO_SCALE * quirks.sizeMul}
            spinAxis={quirks.spinAxis}
            spinDirection={quirks.direction}
            spinSpeed={0.8}
            reactiveBand="bassPunch"
            punchAmount={0.24}
            tilt={quirks.tiltA}
            fallbackGeometry="sphere"
          />
          <ReactiveObject
            url={URLS.drums}
            engine={engine}
            palette={palette}
            position={posB}
            baseScale={TWO_SCALE * quirks.sizeMul}
            spinAxis={quirks.spinAxis}
            spinDirection={-quirks.direction}
            spinSpeed={0.8}
            reactiveBand="bassPunch"
            punchAmount={0.24}
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
