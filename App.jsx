import { useEffect, useRef, useState } from 'react'
import { AudioEngine } from './audio/AudioEngine.js'
import { SceneDirector } from './scene/SceneDirector.js'
import UploadScreen from './components/UploadScreen.jsx'
import Visualizer from './components/Visualizer.jsx'

export default function App() {
  const [phase, setPhase] = useState('upload')   // 'upload' | 'loading' | 'playing'
  const [status, setStatus] = useState('')
  const [showHUD, setShowHUD] = useState(false)

  const engineRef = useRef(null)
  const directorRef = useRef(null)

  // Initialise engine on first mount
  useEffect(() => {
    if (!engineRef.current) engineRef.current = new AudioEngine()
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
      // Tiny grace period so user sees BPM before the show kicks off
      setStatus(`BPM ${engine.bpm.toFixed(1)} · STARTING`)
      await new Promise((res) => setTimeout(res, 250))
      engine.play()
      setPhase('playing')
    } catch (err) {
      console.error(err)
      setStatus(`ERROR: ${err.message || 'failed to load'}`)
      setPhase('upload')
    }
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

  if (phase === 'playing' && engineRef.current && directorRef.current) {
    return <Visualizer engine={engineRef.current} director={directorRef.current} showHUD={showHUD} />
  }

  return <UploadScreen onLoad={handleLoad} status={status} />
}
