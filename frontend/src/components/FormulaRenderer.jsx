import React, { useEffect, useRef } from 'react'

export default function FormulaRenderer({ html = '', className = '' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    // 1. Dynamic KaTeX script loading
    const loadKaTeX = async () => {
      if (!window.katex) {
        // Load stylesheet
        if (!document.getElementById('katex-css')) {
          const link = document.createElement('link')
          link.id = 'katex-css'
          link.rel = 'stylesheet'
          link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css'
          document.head.appendChild(link)
        }

        // Load JS core
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js'
          script.onload = resolve
          document.head.appendChild(script)
        })

        // Load Auto-Render contribution helper
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js'
          script.onload = resolve
          document.head.appendChild(script)
        })
      }

      // 2. Scan and parse math inside container
      if (window.renderMathInElement && containerRef.current) {
        window.renderMathInElement(containerRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
        })
      }
    }

    loadKaTeX()
  }, [html])

  return (
    <div
      ref={containerRef}
      className={`leading-relaxed text-sm ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
