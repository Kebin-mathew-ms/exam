import { useState, useEffect, useCallback } from 'react'

export default function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState([])

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false)
      return
    }
    setIsSupported(true)
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices())
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [])

  const speak = useCallback((text, options, onEnd) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    if (!text || !text.trim()) return
    const lang   = (options && options.lang)   || 'en-US'
    const rate   = (options && options.rate)   || 0.95
    const pitch  = (options && options.pitch)  || 1.0
    const volume = (options && options.volume) || 1.0
    const plain  = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const utt    = new SpeechSynthesisUtterance(plain)
    utt.lang   = lang
    utt.rate   = rate
    utt.pitch  = pitch
    utt.volume = volume
    const all  = window.speechSynthesis.getVoices()
    const code = lang.split('-')[0]
    const v    = all.find(x => x.lang.startsWith(code) && x.localService) || all.find(x => x.lang.startsWith(code))
    if (v) utt.voice = v
    utt.onstart = () => setIsSpeaking(true)
    utt.onend   = () => { setIsSpeaking(false); if (onEnd) onEnd() }
    utt.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utt)
    setIsSpeaking(true)
  }, [])

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  return { speak, stop, isSpeaking, isSupported, voices }
}