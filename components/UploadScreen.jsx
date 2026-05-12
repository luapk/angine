import { useState, useCallback, useRef } from 'react'

export default function UploadScreen({ onLoad, status }) {
  const [hot, setHot] = useState(false)
  const inputRef = useRef(null)

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file (mp3, wav, ogg, m4a, flac).')
      return
    }
    onLoad(file)
  }, [onLoad])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setHot(false)
    const f = e.dataTransfer.files?.[0]
    handleFile(f)
  }, [handleFile])

  return (
    <div className="upload" onDragOver={(e) => { e.preventDefault(); setHot(true) }} onDragLeave={() => setHot(false)} onDrop={onDrop}>
      <div className="upload-inner">
        <div className="brand">
          ANGINE<br />DE<br />POITRINE
          <span className="dim">VISUAL ENGINE · V0.1</span>
        </div>

        <div className="divider" />

        <div className="meta">
          <span>FORMAT</span><span><b>16:9</b> · 1920×1080 · 60FPS</span>
          <span>PALETTE</span><span><b>BLACK</b> · <b>WHITE</b> · <span className="gold">GOLD</span></span>
          <span>REACTIVITY</span><span><b>BPM AUTO</b> · BEAT QUANTISED</span>
          <span>SCENES</span><span><b>GENERATIVE</b> · WEIGHTED CUTS</span>
        </div>

        <div
          className={'dropzone' + (hot ? ' hot' : '')}
          onClick={() => inputRef.current?.click()}
        >
          DROP AUDIO TO BEGIN
          <span className="small">OR CLICK TO BROWSE · .MP3 .WAV .M4A .OGG .FLAC</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div className="status">{status || ' '}</div>
      </div>
    </div>
  )
}
