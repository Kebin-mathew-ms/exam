import React, { useState } from 'react'
import { Download, Award, ShieldAlert, Calendar } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'

export default function CertificatePreview({
  certId,
  certNumber,
  studentName,
  examName,
  issueDate,
  score,
  grade,
}) {
  const { toast } = useToast()
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await apiClient.get(`/api/certificates/download/${certId}`, {
        responseType: 'blob'
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `certificate_${certNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast('Certificate downloaded successfully.', 'success')
    } catch (err) {
      toast('Failed to download certificate PDF.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-card border-2 border-indigo-200 dark:border-indigo-900/30 rounded-2xl p-6 shadow-md flex flex-col justify-between gap-5 relative text-sm select-none hover:border-primary/50 transition-colors">
      <div className="space-y-4">
        {/* Certificate Badging banner */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Award className="w-5 h-5" />
            <span>Merit Certificate</span>
          </div>
          <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-900 border text-muted-foreground px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
            {certNumber}
          </span>
        </div>

        <div className="space-y-1.5 text-left">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Recipient</span>
          <h4 className="font-extrabold text-lg text-foreground leading-tight">{studentName}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            for successfully passing the online examination <b>{examName}</b> with a score of <b>{score} marks</b>, obtaining grade <b>{grade}</b>.
          </p>
        </div>
      </div>

      {/* Footer / Downloads */}
      <div className="border-t pt-4 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          {new Date(issueDate).toLocaleDateString()}
        </span>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary/95 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
        </button>
      </div>
    </div>
  )
}
