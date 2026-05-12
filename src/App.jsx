import { useEffect, useRef, useState } from 'react'
import { AudioEngine } from './audio/AudioEngine.js'
import { SceneDirector } from './scene/SceneDirector.js'
import UploadScreen from './components/UploadScreen.jsx'
import Visualizer from './components/Visualizer.jsx'
import DiceScreen from './components/DiceScreen.jsx'

const DEFAULT_TRACK = '/audio/Sarniezz.mp3'

export default function App() {
  const [phase, setPhase] = useState('upload')   // 'upload' | 'loading' | 'ready' | 'playing'
  const [status, setStatus] = useState('')
  const [showHUD, setShowHUD] = useState(false)
  const [defaultFile, setDefaultFile] = useState(null)

  const engineRef = useRef(null)
  const directorRef = useRef(null)

  // Initialise engine on first mount
  useEffect(() => {
    if (!engineRef.current) engineRef.current = new AudioEngine()
  }, [])

  // Pre-fetch the default track so it's ready for one-click start
  useEffect(() => {
    fetch(DEFAULT_TRACK)
      .then(r => r.ok ? r.blob() : null)
      .then(blob => {
        if (blob) setDefaultFile(new File([blob], 'Sarniezz.mp3', { type: 'audio/mpeg' }))
      })
      .catch(() => {})
  }, [])

  const handleLoad = async (file) => {
    setPhase('loading')
    setStatus('READING FILE…')
    try {
      const engine = engineRef.current
      await engine.load(file, (msg) => setStatus(msg))
      // Create director AFTER load so engine.bpm is populated
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
  }

  const handlePlay = () => {
    engineRef.current?.play()
    setPhase('playing')
  }

  // Hotkeys
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'h' || e.key === 'H') setShowHUD((v) => !v)
      if (e.key === 'Escape') {
        engineRef.current?.stop()
        directorRef.current?.destroy()
        directorRef.current = null
        setPhase('upload')
        setStatus('')
      }
      if (e.key === 'f' || e.key === 'F') {
        const root = document.documentElement
        if (!document.fullscreenElement) root.requestFullscreen?.()
        else document.exitFullscreen?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (phase === 'ready' && engineRef.current && directorRef.current) {
    return <DiceScreen bpm={engineRef.current.bpm} onPlay={handlePlay} />
  }

  if (phase === 'playing' && engineRef.current && directorRef.current) {
    return <Visualizer engine={engineRef.current} director={directorRef.current} showHUD={showHUD} />
  }

  return (
    <UploadScreen
      onLoad={handleLoad}
      status={status}
      defaultFile={defaultFile}
    />
  )
}
