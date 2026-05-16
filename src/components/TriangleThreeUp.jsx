import ProceduralPyramid from './ProceduralPyramid.jsx'

// tilt=[Math.PI, 0, 0] flips the pyramid upside-down (apex pointing down) while
// still spinning cleanly on Y — the inverted middle creates △▽△ rhythm
const INVERTED = [Math.PI, 0, 0]
const UPRIGHT  = [0, 0, 0]

export default function TriangleThreeUp({ engine, palette, spinSeed, portrait }) {
  const spread = portrait ? 2.7 : 2.5
  const posA = portrait ? [0,  spread, 0] : [-spread, 0, 0]
  const posC = portrait ? [0, -spread, 0] : [ spread, 0, 0]

  return (
    <group key={spinSeed}>
      <ProceduralPyramid
        engine={engine}
        palette={palette}
        position={posA}
        baseScale={1.5}
        spinAxis="y"
        spinDirection={1}
        spinSpeed={0.9}
        tilt={UPRIGHT}
        reactiveBand="bassPunch"
        punchAmount={0.22}
        trebleWobble={0.04}
      />
      <ProceduralPyramid
        engine={engine}
        palette={palette}
        position={[0, 0, 0]}
        baseScale={1.5}
        spinAxis="y"
        spinDirection={-1}
        spinSpeed={1.1}
        tilt={INVERTED}
        reactiveBand="overall"
        punchAmount={0.22}
        trebleWobble={0}
      />
      <ProceduralPyramid
        engine={engine}
        palette={palette}
        position={posC}
        baseScale={1.5}
        spinAxis="y"
        spinDirection={1}
        spinSpeed={0.9}
        tilt={UPRIGHT}
        reactiveBand="bassPunch"
        punchAmount={0.22}
        trebleWobble={0.04}
      />
    </group>
  )
}
