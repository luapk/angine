# Angine de Poitrine — Visual Engine

Generative, audio-reactive music visualizer (Weirdcore / keyline-poster aesthetic).
Single-page React app: loads a track, detects BPM, runs a beat-quantised scene
state machine, renders 3D + DOM layers.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build (also the fastest way to catch JSX/syntax errors)
- `npm run preview` — serve the build

## Stack

- **React 18** (JSX only, no TypeScript), **Vite 5**
- **@react-three/fiber 8** + **@react-three/drei 9** + **@react-three/postprocessing 2**
- **three 0.169**
- **web-audio-beat-detector** for BPM
- No test framework, no linter configured. `npm run build` is the gate.

## Architecture

```
App.jsx                phase machine: loading → ready → intro → playing (→ upload)
  AudioEngine.js       owns AudioContext; per-frame values + beat/peak events
  SceneDirector.js     weighted-random scene state machine, beat-quantised cuts
  Visualizer.jsx       Canvas + DOM layers; subscribes to director
    SceneSwitcher.jsx  maps director state → scene component tree
```

- **AudioEngine** is polled inside `useFrame` via `engine.values.*` (bass, mid,
  treble, bassPunch, overall, beat…). Do NOT route audio through React state —
  it would re-render 60×/s. `EngineTick.jsx` ticks the engine each frame.
- **`engine.beatOffset`** = seconds into the track before beat 0. This delays
  the first `onBeat` events, so UI sequencing (e.g. IntroSequence) uses
  **BPM-based `setTimeout`** (`60000/bpm` ms per beat), not beat listeners.
- **SceneDirector** cuts only on bar/half-bar boundaries or peaks. `forceCut()`
  is wired to the dice button. Some scenes force a palette in `_cutTo`
  (TUNNEL/ONE_UP_* → WHITE_ON_BLACK, GUITAR_DANCER → BLACK_ON_WHITE,
  HANDS_ZOOM → WHITE_ON_BLACK).
- **Palettes** resolved in `scene/palette.js`. Note BLACK_ON_WHITE has
  `accent: '#000000'`, so the palette-coloured directional light is dead in
  those scenes — GUITAR_DANCER adds its own white directionals to compensate.

## Scenes (SceneDirector.SCENES → SceneSwitcher cases)

TWO_UP, THREE_UP, ONE_UP_GUITAR/DRUMS/PYRAMID, TUNNEL, SPLIT, WORD_FLASH,
TRIANGLE_POLAR (TriangleThreeUp), QUIET_TRIANGLE, POLKA_ZOOM, DOT_PARADE,
GUITAR_DANCER, HANDS_ZOOM.

- **GUITAR_DANCER** picks one of 6 `DANCER_URLS` (SkinnedMesh GLBs). These use
  `DancerGLB` (not `ReactiveObject`) because `gltf.scene.clone(true)` breaks
  skinned meshes. `useAnimations` plays the pose clip. Fixed scale (no
  per-cut sizeMul) so size is consistent; intentionally large (cropping OK).
- **HANDS_ZOOM** is peak-triggered (see `_onPeak`): hands.glb scales toward
  camera, no rotation, ~2 beats, then cuts away. Distinct from the random
  `flashHands` overlay (which uses `HandsGLB`, ±10° sway + crash bounce).
- **TUNNEL** is deliberately rare now (peaks mostly trigger HANDS_ZOOM).

## Geometry / sizing rules (important)

Camera is at `z=8`. Visible bounds:

- **Landscape** `fov 45` → ≈ 11.8 wide × 6.6 tall
- **Portrait** `fov 70` → ≈ 6.3 wide × 11.2 tall

`ProceduralPyramid`/`GoldPyramid` use `ConeGeometry(0.5, 0.85)` — **not
normalised**: on-screen width = `baseScale`, height = `0.85·baseScale`.
`ReactiveObject` GLBs **are** normalised: max-dim = `baseScale`.
Worst case on screen ≈ `baseScale × 1.25 (max sizeMul) × (1 + punchAmount)`.
Keep that under the relevant viewport bound or it clips on desktop / overlaps
when stacked. Stacked-scene offsets must exceed each object's half-extent.

## Portrait / mobile

- `Visualizer` detects portrait (`window.innerHeight > innerWidth`), widens
  `camera.fov` to 70 via `CameraAdapt`, and passes `portrait` to SceneSwitcher.
- SceneSwitcher stacks multi-object scenes **vertically** in portrait
  (TWO_UP, THREE_UP, SPLIT) with orientation-specific offsets/scales.
- `PolkaBackground` supports `half="top"|"bottom"|"left"|"right"`; SPLIT uses
  top/bottom in portrait.
- `styles.css` has a portrait/`max-width:600px` media query: drops the 16:9
  letterbox (full-screen `100svh`), larger touch targets, compact dice screen.

## Conventions

- **All 3D objects spin on the Y axis only** (no X-axis "vertical tipping").
  `spinAxis`/`heroAxis` are hardcoded to `'y'` in SceneSwitcher quirks.
- Per-scene "quirks" come from a seeded Mulberry32 PRNG keyed on `spinSeed`,
  so a scene's look is stable for its duration but varies between cuts.
- Treble wobble is **EMA-smoothed** (`jitter += (target - jitter) * 0.1`) to
  avoid per-frame random jerk — see ReactiveObject / ProceduralPyramid.
- Hotkeys (App.jsx): **H** toggles HUD (on by default), **F** fullscreen,
  **Esc** returns to upload.
- Hard black / hard white only — avoid flashes/blends that grey out colours.

## Git workflow (read this)

- Develop on `claude/angine-visualiser-onboarding-3UHDC` **but the user wants
  changes on `main`** — push directly to `main` after each task so they see
  updates immediately.
- The GitHub remote uses **squash merges**, so local and remote histories
  diverge. Expect conflicts on `git pull origin main --no-rebase`; resolve by
  keeping our versions (`git checkout --ours <files>`) then commit + push.
- Large dancer/asset GLBs live in `public/models/` and were pulled from
  `origin/main` (they're not generated).

## Gotchas

- SkinnedMesh GLBs (the `Guitar_*_withSkin.glb` dancers) must NOT go through
  `ReactiveObject` (it clones with `clone(true)`); use `DancerGLB`.
- `useGLTF` caches scenes — `DancerGLB` mutates `gltf.scene` materials in place,
  which is safe only because each dancer URL is used by exactly one scene.
- Bundle is >500 kB (three + drei). Warning is expected, not an error.
