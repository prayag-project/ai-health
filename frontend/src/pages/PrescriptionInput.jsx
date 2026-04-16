import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { prescriptionService } from '../services/api'
import api from '../services/api'   // 🔥 ADD THIS
import { Pill, Send, AlertTriangle } from 'lucide-react'

const EXAMPLE = `Amoxicillin 500mg - Take 1 capsule 3 times daily for 7 days
Ibuprofen 400mg - Take 1 tablet every 8 hours with food as needed for pain
Cetirizine 10mg - Take 1 tablet once daily at bedtime`

export default function PrescriptionInput() {

  // ✅ ALL hooks inside component
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // ✅ helper function
  const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }


const handleImageUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    setError("Image too large. Please upload under 5MB.")
    return
  }

  setError('Scanning prescription...')
  setImageFile(file)

  try {
    // ✅ THIS LINE WAS MISSING — convert file to base64 first
    const base64 = await toBase64(file)

    const res = await api.post('/prescriptions/ocr', {
      image_base64: base64.split(',')[1]   // remove the "data:image/jpeg;base64," prefix
    })

    setText(res.data.transcribed_text)   // fills the textarea automatically
    setError('')   // clear the "Scanning..." message
  } catch (err) {
    console.error(err)
    setError("OCR failed — try a clearer image or type manually")
  }
}

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!text.trim() || text.trim().length < 5) {
      setError('Please enter your prescription details')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await prescriptionService.explain(text)
      navigate(`/prescription/result/${res.data.id}`, { state: { result: res.data } })
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

      {/* 🔥 ADD IMAGE UPLOAD HERE */}
      <input type="file" accept="image/*" onChange={handleImageUpload} className="mb-4" />

      <div className="card p-6 mb-5">
        <form onSubmit={handleSubmit}>
          <label className="label text-base mb-3">Enter your prescription</label>

          <textarea
            className="input-field resize-none text-sm leading-relaxed font-mono mb-2"
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button type="submit" className="btn-primary w-full">
            {loading ? "Analyzing..." : "Explain Prescription"}
          </button>
        </form>
      </div>
    </div>
  )
}
