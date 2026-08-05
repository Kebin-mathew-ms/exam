import React, { useState, useEffect } from 'react'
import { Award, Search } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'
import CertificatePreview from '../components/CertificatePreview'

export default function CertificateCenter() {
  const { toast } = useToast()
  
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadCertificates() {
      try {
        const res = await apiClient.get('/api/certificates')
        if (res.data.success) {
          setCerts(res.data.data)
        }
      } catch (err) {
        toast('Failed to load certificates.', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadCertificates()
  }, [])

  const filtered = certs.filter(c =>
    c.exam_name.toLowerCase().includes(search.toLowerCase()) ||
    c.certificate_number.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6 text-sm">
      
      {/* Title */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Certificate Center</h2>
          <p className="text-muted-foreground text-sm">View earned merit qualifications and download PDF copies.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center max-w-xs w-full">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border rounded-lg focus:outline-none text-xs"
            placeholder="Search by exam name or certificate ID..."
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((c) => (
          <CertificatePreview
            key={c.id}
            certId={c.id}
            certNumber={c.certificate_number}
            studentName={c.student_name}
            examName={c.exam_name}
            issueDate={c.issue_date}
            score={c.score}
            grade={c.grade}
          />
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 border border-dashed rounded-xl text-center text-muted-foreground italic bg-card">
            No certificates earned yet. Pass assigned exams to generate certificates.
          </div>
        )}
      </div>

    </div>
  )
}
