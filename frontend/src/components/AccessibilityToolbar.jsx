import React, { useState, useEffect } from 'react'
import {
  Settings,
  Eye,
  Type,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Keyboard,
  HelpCircle,
  X,
  Play,
  Volume
} from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import useSpeech from '../hooks/useSpeech'

export default function AccessibilityToolbar({
  onNext,
  onPrev,
  onSubmit,
  onSelectOption,
  onClearAnswer,
  onSaveAnswer,
  onMarkReview,
  language = 'en',
  currentQuestion = null,   // Pass the active question object from ExamScreen
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  // Free browser TTS
  const speechLang = language === 'hi' ? 'hi-IN' : language === 'ml' ? 'ml-IN' : 'en-US'
  const { speak, stop, isSpeaking, isSupported: ttsSupported } = useSpeech()

  const readQuestion = () => {
    if (!currentQuestion) return
    if (isSpeaking) { stop(); return }
    const text = `${currentQuestion.title}. ${currentQuestion.description || ''}`
    speak(text, { lang: speechLang })
  }

  const readOptions = () => {
    if (!currentQuestion?.options?.length) return
    if (isSpeaking) { stop(); return }
    const optText = currentQuestion.options
      .map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o.option_text}`)
      .join('. ')
    speak(optText, { lang: speechLang })
  }
  
  // Settings preferences
  const [largeFont, setLargeFont] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [narrationEnabled, setNarrationEnabled] = useState(true)
  const [listening, setListening] = useState(false)

  // Modals
  const [helpOpen, setHelpOpen] = useState(false)
  const [speechConsoleOpen, setSpeechConsoleOpen] = useState(false)
  const [recognizedText, setRecognizedText] = useState('')

  // Speech Recognition Web API reference
  const recognitionRef = React.useRef(null)

  // 1. Initialize display settings classes on body
  useEffect(() => {
    const body = document.body
    if (largeFont) {
      body.classList.add('text-lg')
      body.classList.remove('text-sm')
    } else {
      body.classList.add('text-sm')
      body.classList.remove('text-lg')
    }
  }, [largeFont])

  useEffect(() => {
    const html = document.documentElement
    if (highContrast) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }, [highContrast])

  // 2. Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = false
      rec.lang = language === 'hi' ? 'hi-IN' : language === 'ml' ? 'ml-IN' : 'en-US'

      rec.onresult = async (event) => {
        const result = event.results[event.results.length - 1]
        if (result.isFinal) {
          const transcriptText = result[0].transcript.trim()
          setRecognizedText(transcriptText)
          
          // Call speech command mapping API
          try {
            const res = await apiClient.post('/api/accessibility/speech-command', {
              transcript: transcriptText
            })
            if (res.data.success) {
              const cmd = res.data.data.detected_command
              executeVoiceCommand(cmd)
            }
          } catch (err) {
            console.error('Failed processing voice command', err)
          }
        }
      }

      rec.onend = () => {
        if (listening) {
          rec.start() // Loop restart if toggled active
        }
      }

      recognitionRef.current = rec
    }
  }, [listening, language])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast('Speech Recognition Web API is not supported in this browser.', 'error')
      return
    }

    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
      toast('Voice command listening deactivated.', 'info')
    } else {
      setListening(true)
      recognitionRef.current.start()
      toast('Voice command listening activated. Speak commands...', 'success')
    }
  }

  const executeVoiceCommand = (cmd) => {
    toast(`Command matched: ${cmd}`, 'success')
    
    switch (cmd) {
      case 'NEXT_QUESTION':
        if (onNext) onNext()
        break
      case 'PREV_QUESTION':
        if (onPrev) onPrev()
        break
      case 'SUBMIT_EXAM':
        if (onSubmit) onSubmit()
        break
      case 'ANSWER_A':
        if (onSelectOption) onSelectOption(0)
        break
      case 'ANSWER_B':
        if (onSelectOption) onSelectOption(1)
        break
      case 'ANSWER_C':
        if (onSelectOption) onSelectOption(2)
        break
      case 'ANSWER_D':
        if (onSelectOption) onSelectOption(3)
        break
      case 'SAVE_ANSWER':
        if (onSaveAnswer) onSaveAnswer()
        break
      case 'CLEAR_ANSWER':
        if (onClearAnswer) onClearAnswer()
        break
      case 'MARK_REVIEW':
        if (onMarkReview) onMarkReview()
        break
      default:
        toast('Command unrecognized. Say "Help" for options.', 'warning')
        break
    }
  }

  return (
    <>
      {/* Floating Toggle Icon */}
      <div className="fixed bottom-20 right-6 z-40 select-none">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="p-3.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-full shadow-2xl transition-all scale-100 hover:scale-105 active:scale-95"
          aria-label="Toggle Accessibility Panel Toolbar"
        >
          <Settings className="w-5.5 h-5.5 animate-spin-slow" />
        </button>
      </div>

      {/* Main Toolbar Panel */}
      {open && (
        <div className="fixed bottom-36 right-6 z-40 bg-card border rounded-2xl p-4.5 shadow-2xl glass-panel w-72 flex flex-col gap-4 text-xs select-none">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-bold text-sm text-foreground">AI Accessibility Options</span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Toggle Font */}
            <button
              onClick={() => setLargeFont((prev) => !prev)}
              className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-colors ${
                largeFont ? 'bg-primary/5 border-primary text-primary font-bold' : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <Type className="w-4.5 h-4.5" />
              <span>Large Fonts</span>
            </button>

            {/* Toggle Contrast */}
            <button
              onClick={() => setHighContrast((prev) => !prev)}
              className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-colors ${
                highContrast ? 'bg-primary/5 border-primary text-primary font-bold' : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <Eye className="w-4.5 h-4.5" />
              <span>High Contrast</span>
            </button>

            {/* Read Question — Free Browser TTS */}
            {ttsSupported && (
              <button
                onClick={readQuestion}
                className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-colors col-span-2 ${
                  isSpeaking ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-4.5 h-4.5 animate-pulse" /> : <Volume2 className="w-4.5 h-4.5" />}
                <span>{isSpeaking ? 'Stop Reading' : 'Read Question'}</span>
              </button>
            )}

            {/* Read Options — Free Browser TTS */}
            {ttsSupported && currentQuestion?.options?.length > 0 && (
              <button
                onClick={readOptions}
                className="p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-colors col-span-2 hover:bg-muted text-muted-foreground"
              >
                <Volume className="w-4.5 h-4.5" />
                <span>Read Options</span>
              </button>
            )}

            {/* Toggle Speech Listener */}
            <button
              onClick={toggleListening}
              className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-colors col-span-2 ${
                listening ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20' : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {listening ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
              <span>{listening ? 'Listening Command...' : 'Activate Voice Assist'}</span>
            </button>
          </div>

          <div className="border-t pt-3 flex justify-between gap-2">
            <button
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline font-semibold"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Voice Help</span>
            </button>

            <button
              onClick={() => setSpeechConsoleOpen(true)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline font-semibold"
            >
              <Keyboard className="w-4 h-4" />
              <span>Shortcuts</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice Help Dialog Overlay */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-card border rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setHelpOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-4.5 h-4.5" />
            </button>
            
            <h4 className="font-bold text-base text-foreground border-b pb-2 flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              Supported Voice Command Aliases
            </h4>

            <div className="max-h-72 overflow-y-auto pr-1 space-y-3.5 text-xs text-muted-foreground leading-relaxed">
              <div>
                <p className="font-bold text-foreground mb-1">Navigation Commands</p>
                <p>English: "next question", "go next", "previous question", "go back"</p>
                <p className="mt-1">Malayalam: "അടുത്ത ചോദ്യം", "അടുത്തത്", "മുൻപത്തെ ചോദ്യം"</p>
              </div>
              <div className="border-t pt-3">
                <p className="font-bold text-foreground mb-1">Answer Selection Commands</p>
                <p>"answer option a", "select a", "select b"</p>
              </div>
              <div className="border-t pt-3">
                <p className="font-bold text-foreground mb-1">System Commands</p>
                <p>"save answer", "clear answer", "submit exam"</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcut Help Dialog */}
      {speechConsoleOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-card border rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setSpeechConsoleOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h4 className="font-bold text-base text-foreground border-b pb-2 flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              WCAG Keyboard Shortcuts Help
            </h4>

            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="flex justify-between border-b pb-1.5">
                <span>Next Question</span>
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded border text-foreground font-semibold">Alt + N</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span>Previous Question</span>
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded border text-foreground font-semibold">Alt + P</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span>Toggle Voice Commands</span>
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded border text-foreground font-semibold">Alt + V</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
