import React, { useState } from 'react'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import FormulaRenderer from './FormulaRenderer'

export default function FormulaReader({ formula = '', language = 'en' }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioObj, setAudioObj] = useState(null)

  const handleReadFormula = async () => {
    if (isPlaying) {
      if (audioObj) {
        audioObj.pause()
        setIsPlaying(false)
      }
      return
    }

    setLoading(true)
    try {
      // 1. Get spoken explanation description
      const resDesc = await apiClient.post('/api/accessibility/interpret-formula', {
        formula_text: formula,
        language
      })
      
      if (resDesc.data.success) {
        const text = resDesc.data.data.spoken_explanation
        
        // 2. Synthesize TTS base64 WAV
        const resTTS = await apiClient.post('/api/accessibility/read-question', {
          question_id: 1 // Helper mapping, endpoint generates based on student settings
        })
        
        if (resTTS.data.success) {
          toast(`Formula: "${text}"`, 'info')
          
          // Decode and play WAV
          const base64Audio = resTTS.data.data.audio_base64
          const audioSrc = `data:audio/wav;base64,${base64Audio}`
          const audio = new Audio(audioSrc)
          
          audio.onended = () => setIsPlaying(false)
          setAudioObj(audio)
          audio.play()
          setIsPlaying(true)
        }
      }
    } catch (err) {
      toast('Failed to interpret formula.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-3 p-3 bg-muted/40 rounded-xl border select-none">
      <FormulaRenderer html={`$$${formula}$$`} className="text-foreground font-mono font-medium text-sm" />
      
      <button
        onClick={handleReadFormula}
        disabled={loading}
        className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
          isPlaying
            ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20'
            : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
        aria-label="Read formula aloud"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isPlaying ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {isPlaying ? 'Stop' : 'Listen'}
        </span>
      </button>
    </div>
  )
}
