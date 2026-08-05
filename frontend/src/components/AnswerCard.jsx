import React from 'react'
import FormulaRenderer from './FormulaRenderer'

export default function AnswerCard({
  question = {},
  selectedOptionId = null,
  textAnswer = '',
  onAnswerChange,
  disabled = false,
}) {
  const typeId = question.question_type_id

  const handleOptionSelect = (optionId) => {
    if (disabled) return
    if (onAnswerChange) {
      onAnswerChange(optionId, '')
    }
  }

  const handleTextChange = (value) => {
    if (disabled) return
    if (onAnswerChange) {
      onAnswerChange(null, value)
    }
  }

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6 flex flex-col text-sm">
      {/* Description Body (HTML & LaTeX) */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
          Question Details ({parseFloat(question.marks)} Marks)
        </span>
        <FormulaRenderer html={question.description || ''} className="text-foreground leading-relaxed" />
      </div>

      {/* Answer inputs panel */}
      <div className="border-t border-dashed pt-5 space-y-4">
        {typeId === 1 && (
          // Multiple Choice (MCQ)
          <div className="space-y-3">
            {question.options?.map((opt) => {
              const isChecked = selectedOptionId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleOptionSelect(opt.id)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    isChecked
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    isChecked ? 'border-primary bg-primary text-white' : 'border-muted-foreground/30'
                  }`}>
                    {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-xs sm:text-sm leading-tight">{opt.option_text}</span>
                </button>
              )
            })}
          </div>
        )}

        {typeId === 2 && (
          // True / False
          <div className="grid grid-cols-2 gap-4">
            {question.options?.map((opt) => {
              const isChecked = selectedOptionId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleOptionSelect(opt.id)}
                  className={`p-4 rounded-xl border font-semibold text-center transition-all text-sm ${
                    isChecked
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {opt.option_text}
                </button>
              )
            })}
          </div>
        )}

        {(typeId === 3 || typeId === 5) && (
          // Short Answer or Fill in the Blank
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Your Answer Text
            </label>
            <input
              type="text"
              disabled={disabled}
              value={textAnswer || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full p-3 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Type your brief answer here..."
            />
          </div>
        )}

        {typeId === 4 && (
          // Long Essay Answer
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Your Essay Answer
            </label>
            <textarea
              disabled={disabled}
              rows={8}
              value={textAnswer || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full p-3.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none leading-relaxed"
              placeholder="Provide a detailed description explanation response here..."
            />
          </div>
        )}
      </div>
    </div>
  )
}
