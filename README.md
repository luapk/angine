# ANGINE DE POITRINE — Visual Engine

Generative, audio-reactive visualizer. Two 3D heads (guitar, drums) and a pyramid, choreographed across one-up / two-up / three-up scenes with concentric triangle-tunnel transitions and a flipping black-on-white / white-on-black polka backdrop. Gold as a rare accent. Built for LED screens; runs in any modern browser.

Aesthetic reference: Aphex Twin / Weirdcore. Tight, brutal, beat-quantised cuts.

## Stack

- Vite + React 18
- react-three-fiber + drei (Three.js r169)
- @react-three/postprocessing (bloom, chromatic aberration, noise, vignette)
- Web Audio API + `web-audio-beat-detector` for offline BPM analysis
- Deploy: Vercel

## Run locally

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

## Add the GLB assets

Drop your three GLB files into `public/models/`:

```
public/models/guitar.glb
public/models/drums.glb
public/models/pyramid.glb
```

Until those exist the visualizer will render primitive fallbacks (icosahedron, box, tetrahedron) so you can still see the system run.

## Deploy

### Vercel via GitHub
1. `git init && git add . && git commit -m "init"`
2. Push to a GitHub repo
3. In Vercel: New Project → import the repo → defaults will work (Vite preset is auto-detected; `vercel.json` is already here)
4. Deploy

### Vercel via CLI
```bash
npm i -g vercel
vercel
```

## Hotkeys

- **H** — toggle debug HUD (BPM / scene / palette / band levels)
- **F** — fullscreen
- **Esc** — return to upload screen

## How it works

1. **Audio load** — `AudioEngine` decodes the file with Web Audio API and runs `web-audio-beat-detector` once on the buffer to find BPM. Result is clamped into 60–200 BPM.
2. **Per-frame analysis** — frequency-band energy is computed each frame for sub / bass / lowMid / mid / highMid / treble. A `bassPunch` value with fast-attack/slow-release tracks kicks. A spectral-flux onset detector fires `onPeak` events when flux exceeds a rolling 2.2σ outlier threshold and bass is meaningful.
3. **Scene direction** — `SceneDirector` subscribes to beat ticks. Every bar (4 beats) it rolls weighted dice to decide whether to cut. Weights shift with current energy, time-in-scene, four-bar boundaries, and recency. Peaks override and force dramatic cuts (often to the triangle tunnel + palette flip).
4. **Rendering** — each scene is a tree of `ReactiveObject`s that read engine values inside `useFrame` and mutate transforms directly (no React re-renders per frame). Cuts cause a remount via `key` change for a hard-edit feel.
5. **Post** — bloom, chromatic aberration (treble-modulated), noise, vignette. DOM overlay handles the invert-flash on peaks.

## Tuning

Most tuning lives in two places:

- `src/scene/SceneDirector.js` — `goldRarity`, `minBarsPerScene`, `maxBarsPerScene`, and the weights inside `_pickNextScene` and `_onBeat`.
- `src/components/SceneSwitcher.jsx` — per-scene `baseScale`, `spinSpeed`, `punchAmount`.

If cuts feel too sparse, raise the `pCut` base (currently 0.18) in `SceneDirector._onBeat`. Too chaotic, lower it or raise `minBarsPerScene` to 2.

## LED screen notes

- Stage is locked to 16:9 (`aspect-ratio: 16 / 9`) inside `.stage-inner`. For a non-16:9 wall, change the aspect ratio in `src/styles.css` and the `Canvas` will scale automatically.
- For HDMI capture from a browser, run fullscreen (F) on a 1920×1080 display.
- For LED installations driven by a media server, build (`npm run build`) and serve `dist/` from a kiosk-mode browser.

## License

Private project. Do not distribute.
