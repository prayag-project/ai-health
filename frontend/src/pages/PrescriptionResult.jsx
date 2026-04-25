import { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { prescriptionService } from '../services/api'
import { Pill, AlertTriangle, RefreshCw, ChevronRight, Info, Clock } from 'lucide-react'

export default function PrescriptionResult() {
  const { id } = useParams()
  const location = useLocation()
  const [result, setResult] = useState(location.state?.result || null)
  const [loading, setLoading] = useState(!result)

  useEffect(() => {
    if (!result) {
      prescriptionService.getById(id)
        .then(res => setResult(res.data))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-10 h-10 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--border-card)', borderTopColor: 'var(--teal-main)' }}
      />
    </div>
  )

  if (!result) return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <p style={{ color: 'var(--text-secondary)' }}>Result not found.</p>
      <Link to="/prescription" className="btn-primary mt-4 inline-block">Try Again</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-5">

      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-3 mb-1">
          <Pill className="w-5 h-5" style={{ color: 'var(--teal-text)' }} />
          <h1
            className="font-display text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Prescription Explained
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {result.medications?.length || 0} medication(s) found — explained in plain English
        </p>
      </div>

      {/* Truncation note if model capped the list */}
      {result.note && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{ background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow-text)' }}
        >
          ⚠️ {result.note}
        </div>
      )}

      {/* One card per medication */}
      {result.medications?.map((med, i) => (
        <div
          key={i}
          className="card p-5 animate-fade-up"
          style={{ animationDelay: `${i * 0.08}s` }}
        >

          {/* Medicine name + dosage header */}
          <div
            className="flex items-start justify-between gap-3 mb-4 pb-4"
            style={{ borderBottom: '1px solid var(--border-card)' }}
          >
            <div>
              <h2
                className="font-display text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {med.name}
              </h2>
              {med.generic_name && med.generic_name !== med.name && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                  Generic: {med.generic_name}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              {med.dosage && (
                <p
                  className="text-sm font-mono font-semibold"
                  style={{ color: 'var(--teal-text)' }}
                >
                  {med.dosage}
                </p>
              )}
              {med.frequency && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                  {med.frequency}
                </p>
              )}
              {med.duration && (
                <div className="flex items-center gap-1 justify-end mt-1">
                  <Clock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{med.duration}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">

            {/* Why doctor prescribed */}
            {med.purpose && (
              <div className="rx-purpose-box">
                <p className="rx-label text-xs font-semibold uppercase tracking-wider mb-1.5">
                  💊 Why the doctor prescribed this
                </p>
                <p className="rx-body text-sm leading-relaxed">{med.purpose}</p>
              </div>
            )}

            {/* How to take */}
            {med.instructions && (
              <div className="rx-info-box">
                <p className="rx-label text-xs font-semibold uppercase tracking-wider mb-1.5">
                  📋 How to take it
                </p>
                <p className="rx-body text-sm leading-relaxed">{med.instructions}</p>
              </div>
            )}

            {/* Side effects */}
            {med.side_effects?.length > 0 && (
              <div className="rx-info-box">
                <p className="rx-label text-xs font-semibold uppercase tracking-wider mb-2">
                  ⚡ Common side effects
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {med.side_effects.map((se, j) => (
                    <span
                      key={j}
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{
                        background: 'var(--yellow-bg)',
                        color: 'var(--yellow-text)',
                        border: '1px solid var(--yellow-border)',
                      }}
                    >
                      {se}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {med.warnings?.length > 0 && (
              <div className="rx-warning-box">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 rx-warn-label" style={{ color: 'var(--red-text)' }} />
                  <p className="rx-warn-label text-xs font-semibold uppercase tracking-wider">
                    Important warnings
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {med.warnings.map((w, j) => (
                    <li key={j} className="text-sm leading-relaxed flex gap-2 rx-warn-body">
                      <span style={{ color: 'var(--red-text)', marginTop: '0.125rem', flexShrink: 0 }}>•</span>
                      <span style={{ color: 'var(--red-body)' }}>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-3 animate-fade-up">
        <Link to="/prescription" className="btn-secondary flex-1 text-center text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" />
          New Prescription
        </Link>
        <Link to="/history" className="btn-ghost text-sm flex items-center gap-1">
          View History <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Disclaimer */}
      <div
        className="p-4 rounded-xl"
        style={{ background: 'var(--bg-card-inner)', border: '1px solid var(--border-card)' }}
      >
        <p className="text-xs leading-relaxed flex gap-2" style={{ color: 'var(--text-muted)' }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          This explanation is for educational purposes only. Always follow your doctor's instructions exactly. Consult your pharmacist for drug interactions and personalised advice.
        </p>
      </div>
    </div>
  )
}
