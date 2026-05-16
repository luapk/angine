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
    handleFile(e.dataTransfer.files?.[0])
  }, [handleFile])

  return (
    <div className="upload" onDragOver={(e) => { e.preventDefault(); setHot(true) }} onDragLeave={() => setHot(false)} onDrop={onDrop}>
      <div className="upload-inner">
        <div className="brand-garamond">
          ANGINE<br />DE<br />POITRINE
          <span className="brand-garamond-sub">VISUAL ENGINE · V0.1</span>
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

        {defaultFile && (
          <div
            className="dropzone"
            style={{ marginTop: 12, borderStyle: 'solid', borderColor: 'var(--gold)', color: 'var(--gold)' }}
            onClick={() => onLoad(defaultFile)}
          >
            ▶ SARNIEZZ.MP3
            <span className="small" style={{ color: 'var(--gold)' }}>PLAY DEFAULT TRACK</span>
          </div>
        )}

        <div className="status">{status || ' '}</div>
      </div>
    </div>
  )
}
