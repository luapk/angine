// AudioEngine
// ----------
// Owns the AudioContext, decodes uploaded file, runs BPM detection once on the
// buffer, then exposes per-frame reactive values + beat/peak events.
//
// Designed to be polled inside useFrame (not React state) so we don't re-render
// 60 times a second. The render layer reads engine.values.* directly.

import { analyze, guess } from 'web-audio-beat-detector'

// Frequency bands (Hz) — generous overlaps OK, we just want signal
const BANDS = {
  sub:   [20,   60],
  bass:  [60,   250],
  lowMid:[250,  500],
  mid:   [500,  2000],
  highMid:[2000,4000],
  treble:[4000, 12000],
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const lerp = (a, b, t) => a + (b - a) * t

export class AudioEngine {
  constructor() {
    this.ctx = null
    this.source = null
    this.buffer = null
    this.analyser = null
    this.gain = null
    this.freqData = null
    this.timeDomain = null

    this.bpm = 120
    this.beatOffset = 0     // seconds — when beat 0 lands inside the track
    this.startedAt = 0      // ctx.currentTime when playback began
    this.duration = 0
    this.playing = false

    // Per-frame smoothed values (read by visual layer)
    this.values = {
      sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0,
      overall: 0,
      flux: 0,            // spectral flux this frame
      bassPunch: 0,       // bass with very fast attack, slow release (kick visualizer)
      beat: 0,            // current beat number (fractional)
      bar: 0,             // current bar (fractional)
      sinceBeat: 0,       // seconds since last whole beat
    }

    // Event listeners
    this._onBeat = []     // (beatNumber, isBar, isFourBar) => void
    this._onPeak = []     // (intensity) => void

    // Internal tracking
    this._prevFreq = null         // for flux
    this._lastBeatTick = -1       // last whole beat number we fired
    this._fluxAvg = 0
    this._fluxVar = 0
    this._peakCooldown = 0        // seconds remaining
    this._fftSize = 2048
  }

  onBeat(fn) { this._onBeat.push(fn); return () => { this._onBeat = this._onBeat.filter(f => f !== fn) } }
  onPeak(fn) { this._onPeak.push(fn); return () => { this._onPeak = this._onPeak.filter(f => f !== fn) } }

  async load(file, onProgress) {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      this.ctx = new Ctx()
    }
    onProgress?.('DECODING')
    const arrayBuffer = await file.arrayBuffer()
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer)
    this.duration = this.buffer.duration

    onProgress?.('ANALYSING BPM')
    // Try precise analyze first (slower, more accurate); fallback to guess.
    try {
      this.bpm = await analyze(this.buffer)
    } catch (e) {
      try {
        const g = await guess(this.buffer)
        this.bpm = g.bpm
        this.beatOffset = g.offset || 0
      } catch (e2) {
        // Last-ditch fallback
        this.bpm = 120
      }
    }
    // Clamp into a sensible range
    if (this.bpm < 60) this.bpm *= 2
    if (this.bpm > 200) this.bpm /= 2
    onProgress?.(`BPM ${this.bpm.toFixed(1)}`)
    return { bpm: this.bpm, duration: this.duration }
  }

  play() {
    if (!this.buffer || this.playing) return
    if (this.ctx.state === 'suspended') this.ctx.resume()

    // Build graph
    this.source = this.ctx.createBufferSource()
    this.source.buffer = this.buffer
    this.gain = this.ctx.createGain()
    this.gain.gain.value = 1.0
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = this._fftSize
    this.analyser.smoothingTimeConstant = 0.6
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount)
    this.timeDomain = new Uint8Array(this.analyser.frequencyBinCount)
    this._prevFreq = new Float32Array(this.analyser.frequencyBinCount)

    this.source.connect(this.analyser)
    this.analyser.connect(this.gain)
    this.gain.connect(this.ctx.destination)

    this.startedAt = this.ctx.currentTime
    this.source.start(0)
    this.playing = true
    this._lastBeatTick = -1
  }

  stop() {
    if (this.source) {
      try { this.source.stop() } catch (e) { /* noop */ }
      this.source.disconnect()
      this.source = null
    }
    this.playing = false
  }

  pause() { if (this.ctx?.state === 'running')   this.ctx.suspend() }
  resume(){ if (this.ctx?.state === 'suspended') this.ctx.resume()  }
  get isPaused() { return this.ctx?.state === 'suspended' }

  /** Hz → FFT bin index */
  _binFor(hz) {
    const nyquist = this.ctx.sampleRate / 2
    return clamp(Math.round((hz / nyquist) * this.analyser.frequencyBinCount), 0, this.analyser.frequencyBinCount - 1)
  }

  _bandEnergy(loHz, hiHz) {
    const lo = this._binFor(loHz)
    const hi = this._binFor(hiHz)
    let sum = 0
    for (let i = lo; i <= hi; i++) sum += this.freqData[i]
    return sum / Math.max(1, hi - lo + 1) / 255
  }

  /** Called every frame */
  tick(dt) {
    if (!this.playing || !this.analyser) return

    this.analyser.getByteFrequencyData(this.freqData)

    // Bands — instantaneous
    const sub     = this._bandEnergy(...BANDS.sub)
    const bass    = this._bandEnergy(...BANDS.bass)
    const lowMid  = this._bandEnergy(...BANDS.lowMid)
    const mid     = this._bandEnergy(...BANDS.mid)
    const highMid = this._bandEnergy(...BANDS.highMid)
    const treble  = this._bandEnergy(...BANDS.treble)
    const overall = (sub + bass + lowMid + mid + highMid + treble) / 6

    // Smooth (low-pass) most bands
    const v = this.values
    v.sub     = lerp(v.sub,     sub,     0.4)
    v.bass    = lerp(v.bass,    bass,    0.4)
    v.lowMid  = lerp(v.lowMid,  lowMid,  0.35)
    v.mid     = lerp(v.mid,     mid,     0.3)
    v.highMid = lerp(v.highMid, highMid, 0.35)
    v.treble  = lerp(v.treble,  treble,  0.35)
    v.overall = lerp(v.overall, overall, 0.3)

    // Bass punch: instant attack, slow release (great for "kick = scale slam")
    if (bass > v.bassPunch) v.bassPunch = bass
    else v.bassPunch = lerp(v.bassPunch, bass, 0.12)

    // Spectral flux: sum of positive changes vs previous frame
    let flux = 0
    for (let i = 0; i < this.freqData.length; i++) {
      const d = this.freqData[i] / 255 - this._prevFreq[i]
      if (d > 0) flux += d
      this._prevFreq[i] = this.freqData[i] / 255
    }
    flux /= this.freqData.length
    v.flux = flux

    // Rolling stats for flux → peak detection
    this._fluxAvg = lerp(this._fluxAvg, flux, 0.02)
    const dev = flux - this._fluxAvg
    this._fluxVar = lerp(this._fluxVar, dev * dev, 0.02)
    const fluxStd = Math.sqrt(this._fluxVar)

    // Peak: flux is statistical outlier AND bass is meaningful
    this._peakCooldown = Math.max(0, this._peakCooldown - dt)
    if (this._peakCooldown === 0 && flux > this._fluxAvg + fluxStd * 2.2 && bass > 0.35) {
      const intensity = clamp((flux - this._fluxAvg) / Math.max(0.001, fluxStd * 4), 0, 1)
      this._peakCooldown = 0.25 // min 250ms between peak events
      this._onPeak.forEach(fn => fn(intensity))
    }

    // Beat clock — derived from BPM + currentTime
    const t = this.ctx.currentTime - this.startedAt - this.beatOffset
    const beatsPerSec = this.bpm / 60
    const beatFloat = t * beatsPerSec
    v.beat = beatFloat
    v.bar = beatFloat / 4
    const beatInt = Math.floor(beatFloat)
    v.sinceBeat = (beatFloat - beatInt) / beatsPerSec

    // Beat tick event
    if (beatInt !== this._lastBeatTick && beatInt >= 0) {
      this._lastBeatTick = beatInt
      const isBar = beatInt % 4 === 0
      const isFourBar = beatInt % 16 === 0
      this._onBeat.forEach(fn => fn(beatInt, isBar, isFourBar))
    }
  }
}
