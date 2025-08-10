import { useState, useEffect, useRef } from 'react'
import './App.css'

function Line({ idx, left, right, status }) {
  return (
    <div className={`diff-line ${status}`} tabIndex={0}>
      <div className="line-number">{idx + 1}</div>
      <pre className="text text-left">{left}</pre>
      <pre className="text text-right">{right}</pre>
    </div>
  )
}

function useHashRoute(setView) {
  useEffect(() => {
    const applyRoute = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === '/diff') setView('diff')
      else setView('edit')
    }
    applyRoute()
    window.addEventListener('hashchange', applyRoute)
    return () => window.removeEventListener('hashchange', applyRoute)
  }, [setView])
}

function App() {
  const [text1, setText1] = useState('')
  const [text2, setText2] = useState('')
  const [diffLines, setDiffLines] = useState([])
  const [view, setView] = useState('edit')
  const diffTextRef = useRef('')

  // Sync view with URL hash (simple routing)
  useHashRoute(setView)

  useEffect(() => {
    // ensure the editors container gets large-editors class while on edit view
    const root = document.querySelector('.editors')
    if (!root) return
    if (view === 'edit') root.classList.add('large-editors')
    else root.classList.remove('large-editors')
  }, [view])

  const computeDiff = (leftText, rightText) => {
    const lines1 = leftText.split('\n')
    const lines2 = rightText.split('\n')
    const maxLength = Math.max(lines1.length, lines2.length)
    const result = []

    for (let i = 0; i < maxLength; i++) {
      const l = (lines1[i] || '').replace(/\t/g, '  ')
      const r = (lines2[i] || '').replace(/\t/g, '  ')
      const status = l === r ? 'same' : 'different'
      result.push({ left: l, right: r, status })
    }

    return result
  }

  const handleCompare = () => {
    const result = computeDiff(text1, text2)
    setDiffLines(result)
    // prepare a plain-text export
    diffTextRef.current = result
      .map((r, i) => `${i + 1} | ${r.status === 'different' ? 'DIFF' : 'SAME'}\n- ${r.left}\n+ ${r.right}\n`)
      .join('\n')
    // navigate to diff "page"
    window.location.hash = '/diff'
    setView('diff')
    // scroll diff into view after render
    setTimeout(() => {
      const c = document.querySelector('.diff-container')
      if (c) c.scrollTop = 0
    }, 60)
  }

  const handleClear = () => {
    setText1('')
    setText2('')
    setDiffLines([])
  }

  const handleBack = () => {
    // go back to editor view and keep inputs
    window.location.hash = ''
    setView('edit')
  }

  const copyDiff = async () => {
    try {
      await navigator.clipboard.writeText(diffTextRef.current || '')
      // small visual feedback could be added; for now, use alert
      alert('Diff copied to clipboard')
    } catch (e) {
      alert('Copy failed')
    }
  }

  const downloadDiff = () => {
    const blob = new Blob([diffTextRef.current || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diff.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // Editor page
  if (view === 'edit') {
    return (
      <div className="App">
        <header className="header">
          <div className="brand">
            <h1>Checkdiff</h1>
            <p className="tagline">Paste two texts, compare on the next page</p>
          </div>

          <div className="controls">
            <button className="btn primary" onClick={handleCompare}>
              Compare
            </button>
            <button className="btn ghost" onClick={handleClear}>
              Clear
            </button>
          </div>
        </header>

        <main className="main edit">
          <section className="editors">
            <div className="editor">
              <h3>Original</h3>
              <textarea
                placeholder="Paste first text here"
                value={text1}
                onChange={(e) => setText1(e.target.value)}
              />
            </div>

            <div className="editor">
              <h3>Modified</h3>
              <textarea
                placeholder="Paste second text here"
                value={text2}
                onChange={(e) => setText2(e.target.value)}
              />
            </div>
          </section>

          <section className="results" aria-hidden>
            <div className="results-header">
              <h3>Live summary</h3>
              <div className="summary">
                <span>{text1.split('\n').length} lines</span>
                <span>{text2.split('\n').length} lines</span>
              </div>
            </div>

            <div style={{ color: 'var(--muted)', paddingTop: 8 }}>
              When you press Compare you'll be taken to the comparison page where differences are shown side-by-side.
            </div>
          </section>
        </main>

        <footer className="footer">
          <small>Checkdiff — text comparison made simple</small>
        </footer>
      </div>
    )
  }

  // Diff page
  const differing = diffLines.filter((l) => l.status === 'different').length
  const same = diffLines.filter((l) => l.status === 'same').length

  return (
    <div className="App">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn" onClick={handleBack} aria-label="Back to editors">
            ← Back
          </button>
          <div className="brand">
            <h1>Comparison</h1>
            <p className="tagline">Differences shown side-by-side</p>
          </div>
        </div>

        <div className="controls">
          <button className="btn ghost" onClick={copyDiff}>
            Copy
          </button>
          <button className="btn ghost" onClick={downloadDiff}>
            Download
          </button>
        </div>
      </header>

      <main className="main" style={{ gridTemplateColumns: '1fr' }}>
        <section className="results" style={{ paddingBottom: 20 }}>
          <div className="results-header">
            <h3>Summary</h3>
            <div className="summary">
              <span>{differing} differing lines</span>
              <span>{same} identical lines</span>
            </div>
          </div>

          <div className="diff-container" role="list">
            {differing === 0 ? (
              <div style={{ color: 'var(--muted)' }}>No differences to show</div>
            ) : (
              diffLines
                .map((d, i) => ({ d, i }))
                .filter(({ d }) => d.status === 'different')
                .map(({ d, i }) => (
                  <Line key={i} idx={i} left={d.left} right={d.right} status={d.status} />
                ))
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <small>Checkdiff — comparison</small>
      </footer>
    </div>
  )
}

export default App
