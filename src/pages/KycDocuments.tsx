/**
 * KycDocuments.tsx - upload the three KYC documents in a single bulk request.
 *
 * The user selects all three files, then clicks "Submit all documents" which
 * calls POST /api/v1/cards/kyc/upload-bulk and gets all three file IDs back
 * in a single payload dictionary.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { kyc } from '@/api/api'
import { Alert, Badge, Button } from '@/components/ui'
import { useJourney } from '@/hooks/useJourney'

type Kind = 'front' | 'back' | 'selfie'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'application/pdf']

const SLOTS = [
  {
    kind: 'front' as Kind,
    title: 'Front of your ID',
    description: 'A clear photo of the front of your national ID or driving licence.',
    hint: 'All four corners visible, no glare, text clearly readable.',
  },
  {
    kind: 'back' as Kind,
    title: 'Back of your ID',
    description: 'The reverse side of your ID. Not needed if you are using a passport.',
    hint: 'Include the signature and any printed details.',
  },
  {
    kind: 'selfie' as Kind,
    title: 'A photo of your face',
    description: 'A clear, front-facing photo of you holding your ID.',
    hint: 'Good lighting, no sunglasses, your face fully visible.',
  },
]

export function KycDocuments() {
  const navigate = useNavigate()
  const { journey, refresh } = useJourney(true)

  // State for the three files the user picks
  const [files, setFiles] = useState<Partial<Record<Kind, File>>>({})
  const [previews, setPreviews] = useState<Partial<Record<Kind, string>>>({})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Seed from the server so a page reload does not lose track of what is uploaded.
  const [uploadedFromServer, setUploadedFromServer] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!journey) return
    const seeded: Record<string, string> = {}
    for (const kind of journey.kycDocuments) seeded[kind] = 'uploaded'
    setUploadedFromServer(seeded)
  }, [journey])

  const allUploadedFromServer = SLOTS.every((s) => Boolean(uploadedFromServer[s.kind]))
  const readyToSubmit = allUploadedFromServer || (Boolean(files.front) && Boolean(files.selfie))

  const handleFileChange = useCallback(
    (kind: Kind, file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        setError('Only JPG, PNG and PDF files are accepted.')
        return
      }
      if (file.size > MAX_BYTES) {
        setError('That file is larger than 2 MB. Please compress it and try again.')
        return
      }
      setError(null)
      setFiles((prev) => ({ ...prev, [kind]: file }))
      setPreviews((prev) => ({ ...prev, [kind]: URL.createObjectURL(file) }))
    },
    []
  )

  const removeFile = useCallback((kind: Kind) => {
    if (previews[kind]) URL.revokeObjectURL(previews[kind])
    setFiles((prev) => { const n = { ...prev }; delete n[kind]; return n })
    setPreviews((prev) => { const n = { ...prev }; delete n[kind]; return n })
  }, [previews])

  const handleSubmit = async () => {
    setError(null)
    setSuccess(false)
    if (!files.front || !files.selfie) {
      setError('Front and selfie are required. Back is optional for passport.')
      return
    }
    setUploading(true)
    try {
      const result = await kyc.uploadBulk({
        front: files.front,
        back: files.back,
        selfie: files.selfie,
      })

      // Persist in local state so the UI updates immediately
      if (result.data.frontId) setFiles((p) => ({ ...p, front: new File([], 'uploaded', { type: 'application/pdf' }) }))
      if (result.data.backId) setFiles((p) => ({ ...p, back: new File([], 'uploaded', { type: 'application/pdf' }) }))
      if (result.data.selfieId) setFiles((p) => ({ ...p, selfie: new File([], 'uploaded', { type: 'application/pdf' }) }))
      setSuccess(true)
      void refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'The upload failed. Check your connection and try again.',
      )
    } finally {
      setUploading(false)
    }
  }

  const uploadedCount = SLOTS.filter((s) => uploadedFromServer[s.kind] || files[s.kind]).length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Upload your documents</h1>
        <p className="mt-1 text-sm text-slate-500">
          We need three documents to complete your identity check. Your files are encrypted in
          transit and shared only with our compliance team.
        </p>
      </div>

      <div className="card-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                {uploadedCount} of {SLOTS.length} uploaded
              </span>
              <span className="text-slate-500">{readyToSubmit ? 'Ready to submit' : 'In progress'}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-500"
                style={{ width: `${(uploadedCount / SLOTS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {SLOTS.map((slot) => {
          const hasFile = Boolean(uploadedFromServer[slot.kind] || files[slot.kind])
          return (
            <div
              key={slot.kind}
              className={`rounded-xl border-2 p-5 transition-colors ${
                hasFile
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{slot.title}</h3>
                    {hasFile && <Badge tone="success">Uploaded</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{slot.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{slot.hint}</p>
                </div>
              </div>

              {hasFile ? (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm font-medium text-emerald-700">Ready</span>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(slot.kind)}>
                    Replace
                  </Button>
                </div>
              ) : (
                <div className="mt-4">
                  <input
                    type="file"
                    accept={ACCEPTED.join(',')}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileChange(slot.kind, file)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = ACCEPTED.join(',')
                      input.onchange = () => { const file = input.files?.[0]; if (file) handleFileChange(slot.kind, file) }
                      input.click()
                    }}
                  >
                    Choose file
                  </Button>
                  <span className="ml-3 text-xs text-slate-500">JPG, PNG or PDF, up to 2 MB</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <Alert tone="error">{error}</Alert>
      )}

      <div className="card-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {readyToSubmit ? 'Required documents are ready' : 'Front and selfie required'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {readyToSubmit
              ? 'The back of your ID is optional when using a passport.'
              : 'You can come back and finish this later.'}
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!readyToSubmit || uploading}
          size="lg"
          loading={uploading}
        >
          {uploading ? 'Submitting…' : 'Submit documents'}
        </Button>
      </div>

      {success && (
        <Alert tone="success" title="Documents submitted">
          Your documents have been sent to Wasabi. The journey tracker will update automatically.
          <Button variant="secondary" className="mt-2" onClick={() => navigate('/kyc/details')}>
            Go to my details
          </Button>
        </Alert>
      )}

      {allUploadedFromServer && !readyToSubmit && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Back to my application
          </Button>
        </div>
      )}
    </div>
  )
}