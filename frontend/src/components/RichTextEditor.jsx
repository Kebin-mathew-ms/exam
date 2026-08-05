import React, { useState } from 'react'
import { Bold, Italic, Code, List, HelpCircle, Eye, EyeOff } from 'lucide-react'

export default function RichTextEditor({
  value = '',
  onChange,
  label = 'Description',
  placeholder = 'Write question text here... supports HTML formatting and LaTeX inline formulas like \\( E=mc^2 \\)',
  disabled = false,
}) {
  const [previewOpen, setPreviewOpen] = useState(false)

  const insertText = (before, after = '') => {
    const textarea = document.getElementById('rich-textarea')
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    
    const selected = text.substring(start, end)
    const replacement = before + selected + after

    const newValue = text.substring(0, start) + replacement + text.substring(end)
    if (onChange) {
      onChange(newValue)
    }

    // Refocus and place cursor
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
    }, 0)
  }

  const cleanDescription = (html) => {
    // Strip HTML tags for clean text previews
    return html.replace(/<[^>]*>/g, '')
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
        
        {/* Toggle Preview */}
        <button
          type="button"
          onClick={() => setPreviewOpen((prev) => !prev)}
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
        >
          {previewOpen ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide Preview</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Show Preview</span>
            </>
          )}
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1.5 p-2 bg-muted/30 border-b flex-wrap">
          <button
            type="button"
            disabled={disabled}
            onClick={() => insertText('<strong>', '</strong>')}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Bold text"
          >
            <Bold className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            disabled={disabled}
            onClick={() => insertText('<em>', '</em>')}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Italic text"
          >
            <Italic className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-border mx-1" />

          <button
            type="button"
            disabled={disabled}
            onClick={() => insertText('<pre><code>', '</code></pre>')}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Code Snippet block"
          >
            <Code className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => insertText('<ul>\n  <li>', '</li>\n</ul>')}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Bullet points list"
          >
            <List className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-border mx-1" />

          <button
            type="button"
            disabled={disabled}
            onClick={() => insertText('\\(', '\\)')}
            className="p-1.5 rounded-md border text-xs px-2 hover:bg-muted text-muted-foreground font-semibold"
            title="Inline LaTeX Equation"
          >
            LaTeX
          </button>
          
          <button
            type="button"
            disabled={disabled}
            onClick={() => insertText('\\[', '\\]')}
            className="p-1.5 rounded-md border text-xs px-2 hover:bg-muted text-muted-foreground font-semibold"
            title="Block LaTeX Equation"
          >
            LaTeX Block
          </button>
        </div>

        {/* Text Input area */}
        <textarea
          id="rich-textarea"
          rows={6}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          className="w-full p-4 bg-background focus:outline-none text-sm resize-y leading-relaxed border-0"
        />
      </div>

      {/* Live Preview Panel */}
      {previewOpen && (
        <div className="p-4 rounded-xl border border-dashed bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Live Preview (HTML rendered)
          </span>
          <div
            className="text-sm leading-relaxed text-foreground"
            dangerouslySetInnerHTML={{ __html: value || '<i>No text entered to preview.</i>' }}
          />
        </div>
      )}
    </div>
  )
}
