import { useEffect, useRef, useState, useCallback } from 'react'
import { AudioEngine } from './audio/AudioEngine.js'
import { SceneDirector } from './scene/SceneDirector.js'
import UploadScreen from './components/UploadScreen.jsx'
import Visualizer from './components/Visualizer.jsx'
import DiceScreen from './components/DiceScreen.jsx'
import IntroSequence from './components/IntroSequence.jsx'

const DEFAULT_TRACK = '/audio/Sarniezz.mp3'

export default function App() {
  const [phase, setPhase] = useState('loading')  // auto-loads Sarniezz immediately
  const [status, setStatus] = useState('LOADING…')
  const [showHUD, setShowHUD] = useState(false)

  const engineRef = useRef(null)
  const directorRef = useRef(null)

  useEffect(() => {
    if (!engineRef.current) engineRef.current = new AudioEngine()
  }, [])

  const handleLoad = useCallback(async (file) => {
    setPhase('loading')
    setStatus('READING FILE…')
    try {
      const engine = engineRef.current
      await engine.load(file, (msg) => setStatus(msg))
      directorRef.current = new SceneDirector(engine, {
        goldRarity: 0.07,
        minBarsPerScene: 1,
        maxBarsPerScene: 8,
      })
      setStatus(`BPM ${engine.bpm.toFixed(1)} · READY`)
      setPhase('ready')
    } catch (err) {
      console.error(err)
      setStatus(`ERROR: ${err.message || 'failed to load'}`)
      setPhase('upload')
    }
  }, [])

  // Auto-load the default track on mount — skips the upload screen
  useEffect(() => {
    fetch(DEFAULT_TRACK)
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => handleLoad(new File([blob], 'Sarniezz.mp3', { type: 'audio/mpeg' })))
      .catch(() => setPhase('upload'))
  }, [handleLoad])

  const handlePlay = () => {
    engineRef.current?.play()
    setPhase('intro')
  }

  const handleIntroComplete = useCallback(() => {
    setPhase('playing')
  }, [])

  const handleUpload = () => setPhase('upload')

  const handleReturn = () => {
    engineRef.current?.stop()
    directorRef.current?.destroy()
    directorRef.current = null
    setPhase('upload')
    setStatus('')
  }

  // Hotkeys
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'h' || e.key === 'H') setShowHUD(v => !v)
      if (e.key === 'Escape') handleReturn()
      if (e.key === 'f' || e.key === 'F') {
        const root = document.documentElement
        if (!document.fullscreenElement) root.requestFullscreen?.()
        else document.exitFullscreen?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (phase === 'loading') {
    return (
      <div className="upload">
        <div className="upload-inner" style={{ textAlign: 'center' }}>
          <div className="brand-garamond">
            ANGINE<br />DE<br />POITRINE
            <span className="brand-garamond-sub">VISUAL ENGINE · V0.1</span>
          </div>
          <div className="status" style={{ marginTop: 24 }}>{status}</div>
        </div>
      </div>
    )
  }

  if (phase === 'ready' && engineRef.current && directorRef.current) {
    return (
      <DiceScreen
        bpm={engineRef.current.bpm}
        onPlay={handlePlay}
        onUpload={handleUpload}
      />
    )
  }

  if (phase === 'intro' && engineRef.current && directorRef.current) {
    return <IntroSequence engine={engineRef.current} onComplete={handleIntroComplete} />
  }

  if (phase === 'playing' && engineRef.current && directorRef.current) {
    return <Visualizer engine={engineRef.current} director={directorRef.current} showHUD={showHUD} />
  }

  // Upload screen — secondary option
  return (
    <UploadScreen
      onLoad={handleLoad}
      status={status}
    />
  )
}
