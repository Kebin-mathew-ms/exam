import React, { useState } from 'react'
import { CheckCircle, AlertTriangle, ShieldCheck, Search, Loader } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'

export default function CertificateVerification() {
  const { toast } = useToast()
  
  const [certNumber, setCertNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!certNumber.trim()) return

    setLoading(true)
    setResult(null)
    try {
      const res = await apiClient.get(`/api/certificates/verify/${certNumber.trim()}`)
      if (res.data.success) {
        setResult({
          success: true,
          details: res.data.data,
          message: res.data.message
        })
        toast('Certificate verified successfully.', 'success')
      } else {
        setResult({
          success: false,
          message: res.data.message
        })
        toast('Verification failed.', 'error')
      }
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.detail || 'Certificate not found in database registry.'
      })
      toast('Verification check failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 text-sm leading-relaxed">
      
      {/* Verification Card */}
      <div className="max-w-md w-full bg-card border rounded-2xl p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Aegis Verification Registry</h2>
          <p className="text-xs text-muted-foreground">Verify student certificate authenticity instantly.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Certificate Registry Code
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                className="w-full p-2.5 bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs uppercase"
                placeholder="CERT-XXXX-XXXX"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm text-xs transition-colors"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin text-white" /> : (
              <>
                <Search className="w-4 h-4" />
                <span>Verify Registry Code</span>
              </>
            )}
          </button>
        </form>

        {/* Verification Result Sheet */}
        {result && (
          <div className={`p-4 border rounded-xl animate-fade-in text-left space-y-3 ${
            result.success
              ? 'bg-emerald-50/20 border-emerald-200 text-emerald-800 dark:bg-emerald-950/10'
              : 'bg-rose-50/20 border-rose-200 text-rose-800 dark:bg-rose-950/10'
          }`}>
            <div className="flex items-center gap-2 font-bold text-xs">
              {result.success ? (
                <>
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-emerald-700">Digital Registry Signature Verified</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500 flex-shrink-0" />
                  <span className="text-rose-700">Verification Failure</span>
                </>
              )}
            </div>

            <p className="text-xs">{result.message}</p>

            {result.success && result.details && (
              <div className="border-t border-dashed pt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                <div>
                  <span>Student Name:</span>
                  <p className="font-semibold text-foreground">{result.details.student_name}</p>
                </div>
                <div>
                  <span>Exam Details:</span>
                  <p className="font-semibold text-foreground">{result.details.exam_name}</p>
                </div>
                <div>
                  <span>Grade Awarded:</span>
                  <p className="font-semibold text-foreground">Grade {result.details.grade}</p>
                </div>
                <div>
                  <span>Date of Issue:</span>
                  <p className="font-semibold text-foreground">
                    {new Date(result.details.issue_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  )
}
