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
  WORD_FLASH: 'WORD_FLASH',
  TRIANGLE_POLAR: 'TRIANGLE_POLAR',
  QUIET_TRIANGLE: 'QUIET_TRIANGLE',
  POLKA_ZOOM: 'POLKA_ZOOM',
  DOT_PARADE: 'DOT_PARADE',
})

export const WORDS = ['DADA', 'PYTHAGO', 'MANTRA', 'ROKNROLL', 'FANK LōB', "KLEK'N'KHN"]

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
      currentWord: WORDS[0],
      currentWords: [WORDS[0], WORDS[1]],
      lastWordIndex: -1,
      splitFlip: false,
      sceneStartBeat: 0,
      paletteStartBeat: 0,
      spinSeed: Math.random() * 1000,
      polkaSeed: Math.random() * 1000,
      lastPeakBeat: -100,
      recentScenes: [],   // last few, to suppress immediate repeats
      barCount: 0,
      cutCount: 0,
      quietBars: 0,
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
    const energy = this.engine.values.overall
    const beatInBar = Math.round(beat % 4)
    // At high energy, also allow cuts on beat 2 (half-bar) for faster editing feel
    const isHalfBar = !isBar && beatInBar === 2 && energy > 0.62

    if (!isBar && !isHalfBar) return
    if (isBar) this.state.barCount++

    const beatsInScene = beat - this.state.sceneStartBeat
    const barsInScene = beatsInScene / 4

    // Track consecutive quiet bars for quiet scene
    if (isBar) {
      if (energy < 0.15) {
        this.state.quietBars = (this.state.quietBars || 0) + 1
      } else {
        this.state.quietBars = 0
      }
    }
    // Trigger quiet triangle after 2 silent bars (only after track has been playing 8+ bars)
    if (this.state.quietBars >= 2 && this.state.barCount >= 8 && this.state.scene !== SCENES.QUIET_TRIANGLE) {
      this._cutTo(SCENES.QUIET_TRIANGLE, beat, { reason: 'quiet' })
      return
    }
    // Exit quiet triangle as soon as energy returns
    if (this.state.scene === SCENES.QUIET_TRIANGLE && energy > 0.2 && barsInScene >= 1) {
      this._cut(beat, { reason: 'quietEnd' })
      return
    }
    // Limit tunnel to 1 bar max — force cut to a different scene
    if (this.state.scene === SCENES.TUNNEL && barsInScene >= 1) {
      this._cut(beat, { reason: 'tunnelLimit' })
      return
    }
    // DOT_PARADE needs at least 2 bars to complete all 3 phases
    if (this.state.scene === SCENES.DOT_PARADE && barsInScene < 2) return

    const recentPeak = (beat - this.state.lastPeakBeat) < 4   // peak within last bar

    // Forced cut if scene has run too long
    if (barsInScene >= this.opts.maxBarsPerScene) {
      this._cut(beat, { reason: 'maxLength' })
      return
    }

    // Minimum dwell: half-bar at high energy, full bar otherwise
    const minDwell = energy > 0.62 ? 0.5 : this.opts.minBarsPerScene
    if (barsInScene < minDwell) return

    // Probability of cutting — energy weight raised so high-energy tracks cut faster
    let pCut = 0.18                            // base
    pCut += Math.min(0.4, barsInScene * 0.08)  // dwell penalty
    pCut += energy * 0.45                       // energy strongly pushes cuts (was 0.25)
    if (recentPeak) pCut += 0.5                // fresh peak → very likely to cut
    if (isFourBar) pCut += 0.15                // four-bar boundaries are natural cut points
    if (isHalfBar) pCut *= 0.6                 // half-bar cuts more conservative than full-bar

    if (Math.random() < pCut) {
      this._cut(beat, { recentPeak, energy, isFourBar })
    }
  }

  _onPeak(intensity) {
    const beat = this.engine.values.beat
    this.state.lastPeakBeat = beat

    // Don't flip palette on peaks — rapid inversion causes blue colour cast on models
    // Palette changes happen only on scene cuts

    // If near a bar boundary, cut to tunnel — but only after current scene has had at least one bar
    const beatInBar = beat % 4
    const beatsInScene = beat - this.state.sceneStartBeat
    if ((beatInBar > 3.5 || beatInBar < 0.15) && beatsInScene >= 3) {
      this._cutTo(SCENES.TUNNEL, beat, { reason: 'peakAtBar' })
    }
  }

  _flipPalette({ allowGold, intensity = 0.5 } = {}) {
    const scene = this.state.scene
    if (scene === SCENES.ONE_UP_GUITAR || scene === SCENES.ONE_UP_DRUMS) return

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
    if (nextScene === this.state.scene) return

    // Slide history
    this.state.recentScenes = [this.state.scene, ...this.state.recentScenes].slice(0, 3)
    this.state.scene = nextScene
    this.state.sceneStartBeat = beat
    this.state.spinSeed = Math.random() * 1000
    this.state.polkaSeed = Math.random() * 1000
    this.state.cutCount++
    this.state.splitFlip = Math.random() < 0.5

    // For WORD_FLASH: pick a window of 2-3 consecutive words from the sequence,
    // starting after the previous appearance so we cycle through all of them.
    if (nextScene === SCENES.WORD_FLASH) {
      const count = Math.random() < 0.5 ? 2 : 3
      const start = (this.state.lastWordIndex + 1 + Math.floor(Math.random() * 2)) % WORDS.length
      const words = []
      for (let i = 0; i < count; i++) words.push(WORDS[(start + i) % WORDS.length])
      this.state.currentWords = words
      this.state.currentWord = words[0]
      this.state.lastWordIndex = (start + count - 1) % WORDS.length
    }

    // Solo guitar/drums always show black bg + white dots
    if (nextScene === SCENES.ONE_UP_GUITAR || nextScene === SCENES.ONE_UP_DRUMS) {
      this.state.palette = PALETTES.WHITE_ON_BLACK
      this._emit()
      return
    }

    // Tunnel always white-on-black
    if (nextScene === SCENES.TUNNEL) {
      this.state.palette = PALETTES.WHITE_ON_BLACK
      this._emit()
      return
    }

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

    const tunnelW = (recentPeak ? this.opts.tunnelPeakBoost * 0.5 : 0.5) *
                    (energy > 0.55 ? 1.2 : 0.3) *
                    (cur === SCENES.TUNNEL ? 0.0 : 1.0)
    const threeUpW = energy > 0.5 ? 2.5 : 1.0
    const twoUpW = 2.2
    const oneUpW = 2.0
    const splitW   = 3.2
    const wordW    = 2.5
    const triPolarW = 1.6
    const polkaZoomW = 2.0

    const candidates = [
      { value: SCENES.TUNNEL,         weight: tunnelW },
      { value: SCENES.THREE_UP,       weight: threeUpW },
      { value: SCENES.TWO_UP,         weight: twoUpW },
      { value: SCENES.ONE_UP_GUITAR,  weight: oneUpW },
      { value: SCENES.ONE_UP_DRUMS,   weight: oneUpW },
      { value: SCENES.ONE_UP_PYRAMID, weight: isFourBar ? oneUpW * 1.5 : oneUpW * 0.7 },
      { value: SCENES.SPLIT,          weight: splitW },
      { value: SCENES.WORD_FLASH,     weight: wordW },
      { value: SCENES.TRIANGLE_POLAR, weight: triPolarW },
      { value: SCENES.POLKA_ZOOM,     weight: polkaZoomW },
      { value: SCENES.DOT_PARADE,     weight: 1.6 },
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
