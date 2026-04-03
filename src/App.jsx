import { useState, useRef, useCallback } from 'react'
import './index.css'

// Configure API URL — change this to your HF Space URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860'

function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [fileType, setFileType] = useState(null) // 'image' or 'pdf'
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('') // '', 'error', 'success'
  const [dragOver, setDragOver] = useState(false)
  const [previewModal, setPreviewModal] = useState(null) // index of asset in fullscreen
  const fileInputRef = useRef(null)

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return

    const isPdf = selectedFile.type === 'application/pdf'
    const isImage = selectedFile.type.startsWith('image/')

    if (!isPdf && !isImage) {
      setStatus('Please upload an image or PDF file.')
      setStatusType('error')
      return
    }

    setFile(selectedFile)
    setFileType(isPdf ? 'pdf' : 'image')
    setStatus('')
    setStatusType('')
    setAssets([])

    if (isImage) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    handleFileSelect(droppedFile)
  }, [handleFileSelect])

  // FIX: Only trigger file input from the zone click, not the input itself
  const handleZoneClick = useCallback((e) => {
    // Prevent double-trigger: if the click came from the input itself, ignore
    if (e.target === fileInputRef.current) return
    fileInputRef.current?.click()
  }, [])

  const handleExtract = async () => {
    if (!file) return

    setLoading(true)
    setAssets([])
    setStatus('🔍 Detecting visual elements... (may take 15-30s on CPU)')
    setStatusType('')

    try {
      const formData = new FormData()
      const endpoint = fileType === 'pdf' ? '/extract-pdf' : '/extract'
      const fieldName = fileType === 'pdf' ? 'pdf' : 'image'

      formData.append(fieldName, file)
      formData.append('bg_color', bgColor)
      formData.append('tolerance', '45')

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Server error: ${response.status}`)
      }

      const data = await response.json()

      if (data.count === 0) {
        setStatus('No visual assets found. Try a different slide with more illustrations.')
        setStatusType('error')
      } else {
        setAssets(data.assets)
        setStatus(`✅ Extracted ${data.count} visual assets`)
        setStatusType('success')
      }
    } catch (err) {
      console.error(err)
      setStatus(`Error: ${err.message}`)
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  const downloadAsset = (base64, index) => {
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${base64}`
    link.download = `asset_${String(index + 1).padStart(4, '0')}.png`
    link.click()
  }

  const downloadAllZip = async () => {
    if (assets.length === 0) return

    setStatus('📦 Creating ZIP...')
    setStatusType('')

    try {
      const JSZip = (await import('jszip')).default
      const { saveAs } = await import('file-saver')

      const zip = new JSZip()
      assets.forEach((b64, i) => {
        const binary = atob(b64)
        const bytes = new Uint8Array(binary.length)
        for (let j = 0; j < binary.length; j++) {
          bytes[j] = binary.charCodeAt(j)
        }
        zip.file(`asset_${String(i + 1).padStart(4, '0')}.png`, bytes)
      })

      const blob = await zip.generateAsync({ type: 'blob' })
      saveAs(blob, 'extracted_assets.zip')
      setStatus(`✅ Downloaded ${assets.length} assets as ZIP`)
      setStatusType('success')
    } catch (err) {
      console.error(err)
      setStatus(`ZIP error: ${err.message}`)
      setStatusType('error')
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">🎨 Visual Asset Extractor</h1>
        <p className="app-subtitle">
          Upload a presentation slide or PDF to extract all visual elements
          (charts, diagrams, icons, illustrations) as <strong>transparent PNGs</strong> ready
          for <strong>video editing</strong> — powered by Grounding DINO + intelligent background removal.
        </p>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Upload */}
          <div className="sidebar-card">
            <h3>📤 Upload</h3>
            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={handleZoneClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  handleFileSelect(e.target.files[0])
                  // Reset input value so same file can be re-selected
                  e.target.value = ''
                }}
                style={{ display: 'none' }}
              />
              {file ? (
                <>
                  {preview && <img src={preview} alt="Preview" className="upload-preview" />}
                  <div className="upload-filename">
                    {fileType === 'pdf' ? '📄' : '🖼️'} {file.name}
                  </div>
                </>
              ) : (
                <>
                  <div className="upload-icon">📎</div>
                  <div className="upload-text">
                    <strong>Drop an image or PDF here</strong>
                    <br />or click to browse
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Background Color */}
          <div className="sidebar-card">
            <h3>🎨 Background Color</h3>
            <div className="color-picker-row">
              <input
                type="color"
                className="color-picker-input"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
              />
              <input
                type="text"
                className="color-hex-input"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                placeholder="#FFFFFF"
                maxLength={7}
              />
            </div>
          </div>

          {/* Extract Button */}
          <button
            className="extract-btn"
            onClick={handleExtract}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Extracting...
              </>
            ) : (
              <>🔍 Extract Visual Assets</>
            )}
          </button>

          {/* Download ZIP */}
          <button
            className="download-btn"
            onClick={downloadAllZip}
            disabled={assets.length === 0}
          >
            📦 Download All as ZIP ({assets.length})
          </button>

          {/* Concepts */}
          <div className="sidebar-card">
            <div className="concept-list">
              <strong>🔍 Detects:</strong> charts · diagrams · graphs · tables ·
              illustrations · infographics · figures · photos ·
              icons · symbols · arrows · bars · persons · badges
              <br /><br />
              <strong>🚫 Excludes:</strong> text blocks · logos · watermarks
            </div>
          </div>
        </aside>

        {/* Gallery */}
        <section className="gallery-section">
          <div className="gallery-header">
            <span className="gallery-title">
              🎨 Extracted Assets
            </span>
            {assets.length > 0 && (
              <span className="gallery-count">{assets.length} assets</span>
            )}
          </div>

          {status && (
            <div className={`status-bar ${statusType}`}>{status}</div>
          )}

          <div className="gallery-grid">
            {assets.length === 0 && !loading ? (
              <div className="gallery-empty">
                <div className="gallery-empty-icon">🖼️</div>
                <div className="gallery-empty-text">
                  Upload a slide and click Extract to see assets here
                </div>
              </div>
            ) : (
              assets.map((b64, idx) => (
                <div key={idx} className="asset-card">
                  <span className="asset-index">#{idx + 1}</span>
                  <img
                    src={`data:image/png;base64,${b64}`}
                    alt={`Asset ${idx + 1}`}
                    loading="lazy"
                  />
                  <div className="asset-overlay">
                    <button
                      className="overlay-btn preview-btn"
                      onClick={() => setPreviewModal(idx)}
                      title="Preview fullscreen"
                    >
                      🔍 Preview
                    </button>
                    <button
                      className="overlay-btn download-btn-overlay"
                      onClick={() => downloadAsset(b64, idx)}
                      title="Download PNG"
                    >
                      ⬇ Download
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Fullscreen Preview Modal */}
      {previewModal !== null && (
        <div className="preview-modal-backdrop" onClick={() => setPreviewModal(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setPreviewModal(null)}>✕</button>
            <div className="preview-nav">
              <button
                className="preview-arrow"
                disabled={previewModal === 0}
                onClick={() => setPreviewModal(Math.max(0, previewModal - 1))}
              >
                ◀
              </button>
              <span className="preview-counter">
                {previewModal + 1} / {assets.length}
              </span>
              <button
                className="preview-arrow"
                disabled={previewModal === assets.length - 1}
                onClick={() => setPreviewModal(Math.min(assets.length - 1, previewModal + 1))}
              >
                ▶
              </button>
            </div>
            <img
              className="preview-image"
              src={`data:image/png;base64,${assets[previewModal]}`}
              alt={`Preview ${previewModal + 1}`}
            />
            <button
              className="preview-download-btn"
              onClick={() => downloadAsset(assets[previewModal], previewModal)}
            >
              ⬇ Download This Asset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
