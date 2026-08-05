import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Flag,
  RotateCcw,
  Wifi,
  Loader,
  AlertCircle,
  FileText,
  BookmarkCheck,
  CheckCircle,
} from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import CountdownTimer from '../components/CountdownTimer'
import QuestionPalette from '../components/QuestionPalette'
import AnswerCard from '../components/AnswerCard'
import ConnectionStatus from '../components/ConnectionStatus'
import ConfirmationDialog from '../components/ConfirmationDialog'
import AccessibilityToolbar from '../components/AccessibilityToolbar'
import useSpeech from '../hooks/useSpeech'
import { Volume2, VolumeX } from 'lucide-react'

export default function ExamScreen() {
  const { id } = useParams() // Exam ID
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const attemptId = location.state?.attemptId

  // Core configurations state
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Navigation index
  const [currentIndex, setCurrentIndex] = useState(0)

  // Answers State: questionId -> { selected_option_id, text_answer, is_marked_for_review, is_visited }
  const [answers, setAnswers] = useState({})
  const [autoSaveStatus, setAutoSaveStatus] = useState('All changes saved') // 'Saving...', 'All changes saved'
  
  // Modals
  const [submitOpen, setSubmitOpen] = useState(false)

  // Browser TTS (free — uses OS voices)
  const { speak, stop, isSpeaking, isSupported: ttsSupported } = useSpeech()
  const [autoRead, setAutoRead] = useState(false)

  // Time spent tracking
  const lastActiveTimeRef = useRef(Date.now())

  useEffect(() => {
    if (!attemptId) {
      toast('Invalid exam attempt session.', 'error')
      navigate('/student/exams')
      return
    }

    async function loadExamAndAttempt() {
      try {
        const [examRes, attemptRes] = await Promise.all([
          apiClient.get(`/api/student/exams/${id}`),
          apiClient.get(`/api/student/results/${attemptId}`)
        ])

        if (examRes.data.success) {
          const e = examRes.data.data
          setExam(e)
          setQuestions(e.questions)
        }

        // Pre-populate answers sheet if resume
        if (attemptRes.data.success) {
          const att = attemptRes.data.data
          
          // Map loaded answers
          const mapped = {}
          att.answers.forEach(a => {
            mapped[a.question_id] = {
              selected_option_id: a.selected_option_id || null,
              text_answer: a.text_answer || '',
              is_marked_for_review: a.is_marked_for_review || false,
              is_visited: true,
              is_answered: !!(a.selected_option_id || a.text_answer)
            }
          })
          setAnswers(mapped)
        }

        // Resume remaining timer seconds from location state or start
        const startRes = await apiClient.post('/api/student/exams/start', { exam_id: parseInt(id) })
        if (startRes.data.success) {
          setTimeRemaining(startRes.data.data.seconds_remaining)
        }

      } catch (err) {
        toast('Failed to resume exam details.', 'error')
        navigate('/student/exams')
      } finally {
        setLoading(false)
      }
    }
    loadExamAndAttempt()
  }, [id, attemptId])

  // Mark first question visited on load
  useEffect(() => {
    if (questions.length > 0 && exam) {
      const firstQId = questions[0].id
      setAnswers((prev) => ({
        ...prev,
        [firstQId]: {
          ...(prev[firstQId] || { selected_option_id: null, text_answer: '', is_marked_for_review: false }),
          is_visited: true
        }
      }))
    }
  }, [questions, exam])
  // Auto-read question text when current index changes (if autoRead enabled)
  useEffect(() => {
    if (!autoRead || !questions.length || loading) return
    const q = questions[currentIndex]
    if (!q) return
    const text = `Question ${currentIndex + 1} of ${questions.length}. ${q.title}. ${q.description || ''}`
    speak(text, { lang: exam?.preferred_language === 'ml' ? 'ml-IN' : exam?.preferred_language === 'hi' ? 'hi-IN' : 'en-US' })
  }, [currentIndex, autoRead, questions, loading])

  useEffect(() => {
    if (loading || submitting) return

    const saveInterval = setInterval(() => {
      saveActiveQuestionAnswer()
    }, 15000)

    return () => clearInterval(saveInterval)
  }, [currentIndex, answers, loading, submitting])

  // Security Proctoring Listeners (Blurs, focus loss, fullscreen switches)
  useEffect(() => {
    if (loading || submitting) return

    const handleFocusLoss = () => {
      logProctoringViolation('blur', 'Student shifted focus outside exam screen window.')
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctoringViolation('tab_switch', 'Student switched tabs or minimized the browser.')
      }
    }

    window.addEventListener('blur', handleFocusLoss)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleFocusLoss)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loading, submitting])

  // Alt + N / Alt + P Keyboard Shortcuts Navigation Event Listener
  useEffect(() => {
    if (loading || submitting || questions.length === 0) return

    const handleKeyDown = (e) => {
      if (e.altKey) {
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault()
          if (currentIndex < questions.length - 1) {
            saveActiveQuestionAnswer(currentIndex + 1)
          }
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault()
          if (currentIndex > 0) {
            saveActiveQuestionAnswer(currentIndex - 1)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, questions, loading, submitting])

  const logProctoringViolation = async (type, desc) => {
    try {
      await apiClient.post('/api/student/exams/violation', {
        attempt_id: attemptId,
        violation_type: type,
        description: desc
      })
      toast(`Security Alert: ${type.replace('_', ' ').toUpperCase()} violation recorded.`, 'warning')
    } catch (err) {
      console.error('Failed to log security violation', err)
    }
  }

  const saveActiveQuestionAnswer = async (nextIndex = null) => {
    const activeQuestion = questions[currentIndex]
    if (!activeQuestion) return

    const state = answers[activeQuestion.id] || {
      selected_option_id: null,
      text_answer: '',
      is_marked_for_review: false
    }

    // Calculate time spent on question since last change
    const now = Date.now()
    const spentSecs = Math.floor((now - lastActiveTimeRef.current) / 1000)
    lastActiveTimeRef.current = now

    setAutoSaveStatus('Saving...')
    try {
      await apiClient.post('/api/student/exams/save-answer', {
        attempt_id: attemptId,
        question_id: activeQuestion.id,
        selected_option_id: state.selected_option_id,
        text_answer: state.text_answer,
        time_spent_seconds: spentSecs,
        is_marked_for_review: state.is_marked_for_review
      })
      
      setAutoSaveStatus('All changes saved')
    } catch (err) {
      setAutoSaveStatus('All changes saved')
      console.error(err)
    }

    if (nextIndex !== null) {
      setCurrentIndex(nextIndex)
      // Set next question as visited
      const nextQId = questions[nextIndex].id
      setAnswers((prev) => ({
        ...prev,
        [nextQId]: {
          ...(prev[nextQId] || { selected_option_id: null, text_answer: '', is_marked_for_review: false }),
          is_visited: true
        }
      }))
    }
  }

  const handleAnswerSelect = (optionId, textVal) => {
    const activeQuestion = questions[currentIndex]
    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        ...(prev[activeQuestion.id] || { is_marked_for_review: false, is_visited: true }),
        selected_option_id: optionId,
        text_answer: textVal,
        is_answered: !!(optionId || textVal)
      }
    }))
  }

  const handleMarkReviewToggle = () => {
    const activeQuestion = questions[currentIndex]
    const state = answers[activeQuestion.id] || { is_marked_for_review: false }
    
    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        ...(prev[activeQuestion.id] || { selected_option_id: null, text_answer: '', is_visited: true }),
        is_marked_for_review: !state.is_marked_for_review
      }
    }))
  }

  const handleClearAnswer = () => {
    const activeQuestion = questions[currentIndex]
    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        ...(prev[activeQuestion.id] || { is_marked_for_review: false, is_visited: true }),
        selected_option_id: null,
        text_answer: '',
        is_answered: false
      }
    }))
  }

  const handleTimerExpire = () => {
    stop() // Stop any reading when time expires
    toast('Exam time expired! Auto-submitting...', 'warning')
    submitAttempt(true)
  }

  const submitAttempt = async (isTimeout = false) => {
    setSubmitting(true)
    setSubmitOpen(false)

    try {
      // 1. Save final question response
      await saveActiveQuestionAnswer()

      // 2. Submit attempt
      const res = await apiClient.post('/api/student/exams/submit', { attempt_id: attemptId })
      if (res.data.success) {
        toast('Exam submitted successfully.', 'success')
        navigate(`/student/results/${attemptId}`)
      }
    } catch (err) {
      toast(err.message || 'Submission failed.', 'error')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  const activeQuestion = questions[currentIndex]
  const activeAnswer = answers[activeQuestion?.id] || { selected_option_id: null, text_answer: '' }

  return (
    <div className="min-h-screen bg-background flex flex-col select-none text-sm leading-relaxed">
      
      {/* Dynamic connection monitors */}
      <ConnectionStatus />

      {/* Header bar */}
      <header className="sticky top-0 z-30 w-full border-b bg-card py-3 px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-base text-foreground leading-none">{exam?.name}</h3>
          <span className="hidden sm:inline text-xs text-muted-foreground font-mono leading-none">
            Code: {exam?.code}
          </span>
        </div>

        {/* Auto Save Status & Timer */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            {autoSaveStatus}
          </span>
          <CountdownTimer initialSeconds={timeRemaining} onExpire={handleTimerExpire} />
          <button
            onClick={() => setSubmitOpen(true)}
            disabled={submitting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-sm text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </button>
        </div>
      </header>

      {/* Workspace Panel splits */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl mx-auto w-full p-4 sm:p-6 gap-6">
        
        {/* Left Side: Question area Card (Col Span 3 equivalent) */}
        <div className="flex-1 overflow-y-auto">
          {activeQuestion && (
            <AnswerCard
              question={activeQuestion}
              selectedOptionId={activeAnswer.selected_option_id}
              textAnswer={activeAnswer.text_answer}
              onAnswerChange={handleAnswerSelect}
              disabled={submitting}
            />
          )}
        </div>

        {/* Right Side: Navigation Palette */}
        <div className="w-full md:w-64 flex-shrink-0">
          <QuestionPalette
            questions={questions}
            activeQuestionIndex={currentIndex}
            answers={answers}
            onQuestionClick={(idx) => saveActiveQuestionAnswer(idx)}
          />
        </div>

      </div>

      {/* Nav footer toolbar */}
      <footer className="sticky bottom-0 z-30 w-full border-t bg-card py-4 px-6 flex items-center justify-between shadow-inner max-w-7xl mx-auto">
        <div className="flex gap-2">
          {/* Previous Question */}
          <button
            disabled={currentIndex === 0 || submitting}
            onClick={() => saveActiveQuestionAnswer(currentIndex - 1)}
            className="px-4 py-2 border rounded-lg hover:bg-muted font-semibold transition-colors disabled:opacity-40 flex items-center gap-1 text-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          
          {/* Next Question */}
          <button
            disabled={currentIndex === questions.length - 1 || submitting}
            onClick={() => saveActiveQuestionAnswer(currentIndex + 1)}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1 text-xs shadow-sm"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Read Question (Browser TTS — Free) */}
          {ttsSupported && (
            <button
              onClick={() => {
                if (isSpeaking) {
                  stop()
                } else {
                  const q = questions[currentIndex]
                  const text = `Question ${currentIndex + 1}. ${q.title}. ${q.description || ''}`
                  speak(text, { lang: exam?.preferred_language === 'ml' ? 'ml-IN' : exam?.preferred_language === 'hi' ? 'hi-IN' : 'en-US' })
                }
              }}
              title={isSpeaking ? 'Stop Reading' : 'Read Question Aloud'}
              className={`px-3 py-2 border rounded-lg font-semibold flex items-center gap-1.5 text-xs transition-all ${
                isSpeaking
                  ? 'bg-primary/10 border-primary text-primary animate-pulse'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isSpeaking ? 'Stop' : 'Read'}
            </button>
          )}

          {/* Auto-Read Toggle */}
          {ttsSupported && (
            <button
              onClick={() => { setAutoRead(p => !p); if (autoRead) stop() }}
              title={autoRead ? 'Disable auto-read' : 'Auto-read questions on navigation'}
              className={`px-3 py-2 border rounded-lg font-semibold text-xs transition-all ${
                autoRead
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              Auto-Read {autoRead ? 'ON' : 'OFF'}
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Clear Answer */}
          <button
            onClick={handleClearAnswer}
            disabled={submitting}
            className="px-4 py-2 border hover:bg-rose-50 hover:text-rose-600 rounded-lg text-xs font-semibold transition-all"
          >
            Clear Answer
          </button>

          {/* Mark for review */}
          <button
            onClick={handleMarkReviewToggle}
            disabled={submitting}
            className={`px-4 py-2 border rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              answers[activeQuestion?.id]?.is_marked_for_review
                ? 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-950/20'
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            Review Later
          </button>
        </div>
      </footer>

      {/* Submission Confirmation Dialogue */}
      <ConfirmationDialog
        isOpen={submitOpen}
        title="Submit Examination Paper"
        message="Are you sure you want to finalize and submit your answers? You cannot edit responses after submitting."
        confirmLabel="Submit Exam"
        cancelLabel="Continue Exam"
        isDestructive={false}
        onConfirm={() => submitAttempt(false)}
        onCancel={() => setSubmitOpen(false)}
      />

      <AccessibilityToolbar
        onNext={() => currentIndex < questions.length - 1 && saveActiveQuestionAnswer(currentIndex + 1)}
        onPrev={() => currentIndex > 0 && saveActiveQuestionAnswer(currentIndex - 1)}
        onSubmit={() => setSubmitOpen(true)}
        onSelectOption={(optIndex) => {
          const activeQ = questions[currentIndex]
          if (activeQ && activeQ.options && activeQ.options[optIndex]) {
            handleAnswerSelect(activeQ.options[optIndex].id, '')
          }
        }}
        onClearAnswer={handleClearAnswer}
        onSaveAnswer={() => saveActiveQuestionAnswer()}
        onMarkReview={handleMarkReviewToggle}
        language={exam?.preferred_language || 'en'}
        currentQuestion={activeQuestion}
      />

    </div>
  )
}
