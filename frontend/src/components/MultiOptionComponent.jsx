import React from 'react'
import { Plus, Trash, CheckCircle2, Circle } from 'lucide-react'

export default function MultiOptionComponent({
  options = [],
  onChange,
  disabled = false,
}) {
  const handleAddOption = () => {
    const newOptions = [
      ...options,
      { option_text: '', is_correct: false, display_order: options.length + 1 },
    ]
    if (onChange) onChange(newOptions)
  }

  const handleRemoveOption = (index) => {
    const filtered = options.filter((_, idx) => idx !== index)
    // Recalculate display orders
    const updated = filtered.map((opt, idx) => ({ ...opt, display_order: idx + 1 }))
    if (onChange) onChange(updated)
  }

  const handleTextChange = (index, value) => {
    const updated = options.map((opt, idx) =>
      idx === index ? { ...opt, option_text: value } : opt
    )
    if (onChange) onChange(updated)
  }

  const handleCorrectToggle = (index) => {
    // For single-choice or multiple choice MCQs:
    // Let's toggle it! Marking it as correct.
    const updated = options.map((opt, idx) =>
      idx === index ? { ...opt, is_correct: !opt.is_correct } : opt
    )
    if (onChange) onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          MCQ / Option Mapping
        </label>
        
        <button
          type="button"
          disabled={disabled}
          onClick={handleAddOption}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary hover:bg-primary/5 rounded-lg text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Option
        </button>
      </div>

      <div className="space-y-3">
        {options.map((opt, index) => (
          <div key={index} className="flex items-center gap-3 bg-muted/10 p-3 rounded-xl border">
            {/* Mark as Correct Circle Toggle */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleCorrectToggle(index)}
              className={`p-1.5 rounded-lg transition-colors focus:outline-none ${
                opt.is_correct
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title={opt.is_correct ? 'Correct Answer selected' : 'Mark as correct'}
            >
              {opt.is_correct ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>

            {/* Option Input Text */}
            <input
              type="text"
              disabled={disabled}
              value={opt.option_text}
              onChange={(e) => handleTextChange(index, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + index)}...`}
              className="flex-1 p-2 bg-background border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:outline-none"
            />

            {/* Remove option button */}
            {options.length > 2 && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemoveOption(index)}
                className="p-2 rounded-lg border bg-background hover:bg-rose-50 dark:hover:bg-rose-950/20 text-muted-foreground hover:text-rose-600 transition-colors"
                title="Remove option row"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {options.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center py-4">
            No options defined. Click "Add Option" to begin mapping answers.
          </p>
        )}
      </div>
    </div>
  )
}
