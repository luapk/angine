import { useMemo } from 'react'
import ReactiveObject from './ReactiveObject.jsx'
import ProceduralPyramid from './ProceduralPyramid.jsx'
import TriangleTunnel from './TriangleTunnel.jsx'
import TrianglePolar from './TrianglePolar.jsx'
import TriangleField from './TriangleField.jsx'
import QuietTriangle from './QuietTriangle.jsx'
import { SCENES, PALETTES } from '../scene/SceneDirector.js'
import { resolvePalette } from '../scene/palette.js'

const SPLIT_LEFT  = resolvePalette(PALETTES.WHITE_ON_BLACK)
const SPLIT_RIGHT = resolvePalette(PALETTES.BLACK_ON_WHITE)

const URLS = {
  guitar: '/models/guitar.glb',
  drums:  '/models/drums.glb',
}

/**
 * Picks the scene tree based on director state.
 * Keyed on scene + spinSeed so each cut remounts → hard cut feel.
 */
export default function SceneSwitcher({ state, engine, palette }) {
  const { scene, spinSeed } = state

  // Generative quirks per scene instance — derived from spinSeed so they stay
  // stable for the duration of the scene but vary between cuts
  const quirks = useMemo(() => {
    const r = mulberry32(Math.floor(spinSeed))
    return {
      spinAxis: r() < 0.7 ? 'y' : (r() < 0.5 ? 'x' : 'z'),
      counterAxis: r() < 0.6 ? 'y' : 'x',
      direction: r() < 0.5 ? 1 : -1,
      tiltA: [ (r()-0.5)*0.4, 0, (r()-0.5)*0.3 ],
      tiltB: [ (r()-0.5)*0.4, 0, (r()-0.5)*0.3 ],
      // For one-up scenes, occasionally use exotic spin axis
      heroAxis: r() < 0.5 ? 'y' : (r() < 0.5 ? 'x' : 'z'),
      heroDir: r() < 0.5 ? 1 : -1,
      heroSpeed: 0.4 + r() * 1.2,
      // For two/three-up, scale variance
      sizeMul: 0.85 + r() * 0.4,
    }
  }, [spinSeed])

  switch (scene) {
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
      return (
        <group key={`3-${spinSeed}`}>
          <ReactiveObject
            url={URLS.guitar}
            engine={engine}
            palette={palette}
            position={[-gap, 0, 0]}
            baseScale={1.2 * quirks.sizeMul}
            spinAxis={quirks.spinAxis}
            spinDirection={quirks.direction}
            spinSpeed={0.9}
            reactiveBand="bassPunch"
            punchAmount={0.4}
            tilt={quirks.tiltA}
            fallbackGeometry="sphere"
          />
          <ProceduralPyramid
            engine={engine}
            palette={palette}
            position={[0, 0, 0]}
            baseScale={1.35 * quirks.sizeMul}
            spinAxis={'y'}
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
            baseScale={1.2 * quirks.sizeMul}
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
      const gap = 3.5
      return (
        <group key={`split-${spinSeed}`}>
          <ReactiveObject
            url={URLS.guitar}
            engine={engine}
            palette={SPLIT_LEFT}
            position={[-gap, 0, 0]}
            baseScale={6.8}
            spinAxis={quirks.spinAxis}
            spinDirection={quirks.direction}
            spinSpeed={0.6}
            reactiveBand="bassPunch"
            punchAmount={0.38}
            tilt={quirks.tiltA}
            fallbackGeometry="sphere"
          />
          <ReactiveObject
            url={URLS.drums}
            engine={engine}
            palette={SPLIT_RIGHT}
            position={[gap, 0, 0]}
            baseScale={6.8}
            spinAxis={quirks.spinAxis}
            spinDirection={-quirks.direction}
            spinSpeed={0.6}
            reactiveBand="bassPunch"
            punchAmount={0.38}
            tilt={quirks.tiltB}
            fallbackGeometry="box"
          />
        </group>
      )
    }

    case SCENES.TRIANGLE_POLAR:
      return <TrianglePolar key={`tp-${spinSeed}`} engine={engine} palette={palette} />

    case SCENES.TRIANGLE_FIELD:
      return <TriangleField key={`tf-${spinSeed}`} engine={engine} palette={palette} spinSeed={spinSeed} />

    case SCENES.QUIET_TRIANGLE:
      return <QuietTriangle key={`qt-${spinSeed}`} engine={engine} />

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
