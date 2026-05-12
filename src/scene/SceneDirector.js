// SceneDirector
// -------------
// Generative state machine. Subscribes to AudioEngine beat/peak events and
// decides what to render next. Cuts happen ONLY on bar boundaries (4 beats)
// or on detected peaks. Maintains memory to avoid repetition.

export const SCENES = Object.freeze({
  TWO_UP: 'TWO_UP',
  THREE_UP: 'THREE_UP',
  ONE_UP_GUITAR: 'ONE_UP_GUITAR',
  ONE_UP_DRUMS: 'ONE_UP_DRUMS',
  ONE_UP_PYRAMID: 'ONE_UP_PYRAMID',
  TUNNEL: 'TUNNEL',
  SPLIT: 'SPLIT',
  CLOSEUP_GUITAR: 'CLOSEUP_GUITAR',
  CLOSEUP_DRUMS: 'CLOSEUP_DRUMS',
})

export const PALETTES = Object.freeze({
  WHITE_ON_BLACK: 'WHITE_ON_BLACK',   // black bg, white polka / white keyline
  BLACK_ON_WHITE: 'BLACK_ON_WHITE',   // white bg, black polka / black keyline
  GOLD_ACCENT:    'GOLD_ACCENT',      // rare — black bg, gold accents
})

const ALL_SCENES = Object.values(SCENES)
const ONE_UPS = [SCENES.ONE_UP_GUITAR, SCENES.ONE_UP_DRUMS, SCENES.ONE_UP_PYRAMID]

// Weighted random pick: items = [{value, weight}]
function weightedPick(items, rng = Math.random) {
  const total = items.reduce((s, x) => s + x.weight, 0)
  let r = rng() * total
  for (const it of items) {
    r -= it.weight
    if (r <= 0) return it.value
  }
  return items[items.length - 1].value
}

export class SceneDirector {
  constructor(engine, opts = {}) {
    this.engine = engine
    this.opts = {
      goldRarity: 0.07,        // ~7% of palette flips land on gold
      tunnelPeakBoost: 4.0,    // tunnel weight multiplier when peak is fresh
      minBarsPerScene: 1,      // can't cut more often than every bar
      maxBarsPerScene: 8,      // force a cut after this many bars
      ...opts,
    }

    this.state = {
      scene: SCENES.TWO_UP,
      palette: PALETTES.WHITE_ON_BLACK,
      sceneStartBeat: 0,
      paletteStartBeat: 0,
      spinSeed: Math.random() * 1000,
      polkaSeed: Math.random() * 1000,
      lastPeakBeat: -100,
      recentScenes: [],   // last few, to suppress immediate repeats
      barCount: 0,
      cutCount: 0,
    }

    // Subscribe
    this._unsubBeat = engine.onBeat((beat, isBar, isFourBar) => this._onBeat(beat, isBar, isFourBar))
    this._unsubPeak = engine.onPeak((intensity) => this._onPeak(intensity))

    // Listeners for state changes (scene cuts, palette flips)
    this._listeners = []
  }

  onChange(fn) { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter(f => f !== fn) } }
  _emit() { for (const fn of this._listeners) fn(this.state) }

  destroy() { this._unsubBeat?.(); this._unsubPeak?.() }

  _onBeat(beat, isBar, isFourBar) {
    if (!isBar) return
    this.state.barCount++

    const beatsInScene = beat - this.state.sceneStartBeat
    const barsInScene = beatsInScene / 4
    const recentPeak = (beat - this.state.lastPeakBeat) < 4   // peak within last bar
    const energy = this.engine.values.overall

    // Forced cut if scene has run too long
    if (barsInScene >= this.opts.maxBarsPerScene) {
      this._cut(beat, { reason: 'maxLength' })
      return
    }

    // Don't cut too often
    if (barsInScene < this.opts.minBarsPerScene) return

    // Probability of cutting this bar
    let pCut = 0.18                            // base
    pCut += Math.min(0.4, barsInScene * 0.08)  // dwell penalty
    pCut += energy * 0.25                       // energy pushes cuts
    if (recentPeak) pCut += 0.5                // fresh peak → very likely to cut
    if (isFourBar) pCut += 0.15                // four-bar boundaries are natural cut points

    if (Math.random() < pCut) {
      this._cut(beat, { recentPeak, energy, isFourBar })
    }
  }

  _onPeak(intensity) {
    const beat = this.engine.values.beat
    this.state.lastPeakBeat = beat

    // Always flip palette on a real peak — instant, doesn't wait for bar
    if (intensity > 0.4) {
      this._flipPalette({ allowGold: true, intensity })
    }

    // If we're on the lead-in to a bar (within last quarter beat), force a tunnel cut
    const beatInBar = beat % 4
    if (beatInBar > 3.5 || beatInBar < 0.15) {
      this._cutTo(SCENES.TUNNEL, beat, { reason: 'peakAtBar' })
    }
  }

  _flipPalette({ allowGold, intensity = 0.5 } = {}) {
    const r = Math.random()
    const current = this.state.palette

    let next
    if (allowGold && r < this.opts.goldRarity * (0.5 + intensity)) {
      next = PALETTES.GOLD_ACCENT
    } else {
      // Flip between WHITE_ON_BLACK and BLACK_ON_WHITE (away from gold if we're there)
      if (current === PALETTES.WHITE_ON_BLACK) next = PALETTES.BLACK_ON_WHITE
      else if (current === PALETTES.BLACK_ON_WHITE) next = PALETTES.WHITE_ON_BLACK
      else next = Math.random() < 0.5 ? PALETTES.WHITE_ON_BLACK : PALETTES.BLACK_ON_WHITE
    }

    this.state.palette = next
    this.state.paletteStartBeat = this.engine.values.beat
    this._emit()
  }

  _cut(beat, ctx = {}) {
    const next = this._pickNextScene(ctx)
    this._cutTo(next, beat, ctx)
  }

  _cutTo(nextScene, beat, ctx = {}) {
    if (nextScene === this.state.scene && nextScene !== SCENES.TUNNEL) return

    // Slide history
    this.state.recentScenes = [this.state.scene, ...this.state.recentScenes].slice(0, 3)
    this.state.scene = nextScene
    this.state.sceneStartBeat = beat
    this.state.spinSeed = Math.random() * 1000
    this.state.polkaSeed = Math.random() * 1000
    this.state.cutCount++

    // ~40% of cuts also flip the palette; peak cuts almost always do
    const pPaletteFlip = ctx.recentPeak ? 0.85 : 0.35
    if (Math.random() < pPaletteFlip) {
      this._flipPalette({ allowGold: ctx.recentPeak === true })
    } else {
      this._emit()
    }
  }

  _pickNextScene({ energy = 0, recentPeak = false, isFourBar = false } = {}) {
    const recent = new Set(this.state.recentScenes)
    const cur = this.state.scene

    const tunnelW = (recentPeak ? this.opts.tunnelPeakBoost : 1.0) *
                    (energy > 0.55 ? 2.5 : 0.6) *
                    (cur === SCENES.TUNNEL ? 0.1 : 1.0)
    const threeUpW = energy > 0.5 ? 2.5 : 1.0
    const twoUpW = 2.2
    const oneUpW = 2.0
    const splitW = 1.8
    const closeupW = energy > 0.6 ? 2.0 : 0.7   // close-ups suit high intensity

    const candidates = [
      { value: SCENES.TUNNEL,         weight: tunnelW },
      { value: SCENES.THREE_UP,       weight: threeUpW },
      { value: SCENES.TWO_UP,         weight: twoUpW },
      { value: SCENES.ONE_UP_GUITAR,  weight: oneUpW },
      { value: SCENES.ONE_UP_DRUMS,   weight: oneUpW },
      { value: SCENES.ONE_UP_PYRAMID, weight: isFourBar ? oneUpW * 1.5 : oneUpW * 0.7 },
      { value: SCENES.SPLIT,          weight: splitW },
      { value: SCENES.CLOSEUP_GUITAR, weight: closeupW },
      { value: SCENES.CLOSEUP_DRUMS,  weight: closeupW },
    ].filter(c => c.value !== cur)

    // Soft penalty for very recent scenes
    for (const c of candidates) {
      if (recent.has(c.value)) c.weight *= 0.35
    }

    return weightedPick(candidates)
  }

  // Called from useFrame for sub-bar reactive values (spin speed, scale jitter)
  // The visual layer reads state synchronously.
  read() { return this.state }
}
