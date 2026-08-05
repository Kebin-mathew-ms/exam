import React from 'react'

export default function QuestionPalette({
  questions = [],
  activeQuestionIndex = 0,
  answers = {}, // questionId -> { is_visited, is_answered, is_marked_for_review }
  onQuestionClick,
}) {
  const getBadgeClass = (qId, isCurrent) => {
    const state = answers[qId] || { is_visited: false, is_answered: false, is_marked_for_review: false }
    
    let base = 'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs border transition-all cursor-pointer select-none '

    if (isCurrent) {
      base += 'ring-2 ring-primary ring-offset-2 scale-105 '
    }

    if (state.is_marked_for_review && state.is_answered) {
      // Answered & Marked for review -> Indigo/Purple
      return base + 'bg-indigo-600 border-indigo-700 text-white shadow-xs'
    } else if (state.is_marked_for_review) {
      // Marked for review -> Purple
      return base + 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900/30 dark:text-purple-400'
    } else if (state.is_answered) {
      // Answered -> Green
      return base + 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
    } else if (state.is_visited) {
      // Visited -> Yellow/Orange
      return base + 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/30 dark:text-amber-400'
    } else {
      // Not Visited -> Gray
      return base + 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900/20 dark:border-slate-800 dark:text-slate-400'
    }
  }

  return (
    <div className="space-y-3 bg-card border rounded-xl p-4 shadow-xs">
      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
        Question Navigation
      </h4>
      
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground border-b pb-3.5 mb-1.5 font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200" />
          <span>Not Visited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-200" />
          <span>Visited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-emerald-600" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-purple-100 border border-purple-200" />
          <span>For Review</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 mt-0.5">
          <div className="w-3.5 h-3.5 rounded bg-indigo-600" />
          <span>Answered & Review</span>
        </div>
      </div>

      {/* Palette Grid */}
      <div className="grid grid-cols-5 gap-2.5 max-h-56 overflow-y-auto pr-1">
        {questions.map((q, index) => {
          const isCurrent = index === activeQuestionIndex
          return (
            <button
              key={q.id}
              onClick={() => onQuestionClick && onQuestionClick(index)}
              className={getBadgeClass(q.id, isCurrent)}
            >
              {(index + 1).toString().padStart(2, '0')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
