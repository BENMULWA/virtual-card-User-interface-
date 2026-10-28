/**
 * KycDetails.tsx - the identity details form.
 *
 * Submits to Wasabi's cardholder create (or update, when correcting a rejection).
 * The card type comes from Wasabi's live catalog, so only the products Mamlaka
 * actually offers are selectable.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { cards, kyc, type KycDetails as KycDetailsPayload } from '@/api/api'
import { Alert, Badge, Button, Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useJourney } from '@/hooks/useJourney'
import type { CardType } from '@/api/types'

const ID_TYPES = [
  { value: 'GOVERNMENT_ISSUED_ID_CARD', label: 'National ID card' },
  { value: 'DLN', label: "Driving licence" },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'HK_HKID', label: 'Hong Kong ID' },
]

const GENDERS = [
  { value: 'F', label: 'Female' },
  { value: 'M', label: 'Male' },
]

const COUNTRIES = [
  { value: 'KE', label: 'Kenya' },
  { value: 'UG', label: 'Uganda' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'SS', label: 'South Sudan' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'AE', label: 'United Arab Emirates' },
]

interface FormState {
  cardTypeId: string
  firstName: string
  middleName: string
  lastName: string
  birthday: string
  gender: string
  nationality: string
  country: string
  town: string
  address: string
  postCode: string
  mobile: string
  areaCode: string
  email: string
  idType: string
  idNumber: string
  issueDate: string
  idNoExpiryDate: string
  occupation: string
  annualSalary: string
  accountPurpose: string
  expectedMonthlyVolume: string
}

const EMPTY: FormState = {
  cardTypeId: '',
  firstName: '',
  middleName: '',
  lastName: '',
  birthday: '',
  gender: 'F',
  nationality: 'KE',
  country: 'KE',
  town: '',
  address: '',
  postCode: '',
  mobile: '',
  areaCode: '+254',
  email: '',
  idType: 'GOVERNMENT_ISSUED_ID_CARD',
  idNumber: '',
  issueDate: '',
  idNoExpiryDate: '',
  occupation: '',
  annualSalary: '',
  accountPurpose: '',
  expectedMonthlyVolume: '',
}

export function KycDetails() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { journey, refresh } = useJourney(true)

  const [cardTypes, setCardTypes] = useState<CardType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [occupations, setOccupations] = useState<Array<{ occupationCode: string; description: string }>>([])
  const [fileIds, setFileIds] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [issueMode, setIssueMode] = useState(params.get('issue') === '1')
  const [fixMode, setFixMode] = useState(params.get('fix') === '1')
  const [issueAmount, setIssueAmount] = useState('10')

  const holderId = journey?.holder?.holderId ?? null
  const isRejected = journey?.holder?.status === 'reject'

  // Load the catalog, the occupations and the uploaded file ids.
  useEffect(() => {
    const load = async () => {
      try {
        const [types, occ, docs] = await Promise.all([
          cards.cardTypes(),
          kyc.occupations().catch(() => ({ data: [] })),
          kyc.documents().catch(() => ({ records: [] })),
        ])
        setCardTypes(types.data ?? [])
        setOccupations(occ.data ?? [])
        const ids: Record<string, string> = {}
        for (const doc of docs.records ?? []) {
          if (doc.kind) ids[doc.kind] = doc.fileId
        }
        setFileIds(ids)
      } catch {
        // The page still works without the catalog; the submit will report the real error.
      } finally {
        setLoadingTypes(false)
      }
    }
    void load()
  }, [])

  // Pre-fill from the signed-in user.
  useEffect(() => {
    if (!user) return
    const nameParts = user.fullName.trim().split(' ')
    setForm((prev) => ({
      ...prev,
      email: prev.email || user.email,
      mobile: prev.mobile || user.phone,
      firstName: prev.firstName || nameParts[0] || '',
      lastName: prev.lastName || nameParts.slice(1).join(' '),
    }))
  }, [user])

  // The card type drives which limits apply.
  const selectedType = useMemo(
    () => cardTypes.find((t) => t.cardTypeId === Number(form.cardTypeId)) ?? null,
    [cardTypes, form.cardTypeId],
  )

  useEffect(() => {
    if (cardTypes.length > 0 && !form.cardTypeId) {
      setForm((prev) => ({ ...prev, cardTypeId: String(cardTypes[0]?.cardTypeId ?? '') }))
    }
  }, [cardTypes, form.cardTypeId])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const needsBack = form.idType !== 'PASSPORT'
  const documentsReady = Boolean(fileIds.front && fileIds.selfie && (!needsBack || fileIds.back))

  const canSubmit =
    form.firstName.trim().length >= 2 &&
    form.lastName.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.birthday) &&
    form.town.trim().length >= 2 &&
    form.address.trim().length >= 2 &&
    form.postCode.trim().length >= 4 &&
    form.mobile.trim().length >= 5 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.idNumber.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.issueDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.idNoExpiryDate) &&
    Boolean(form.cardTypeId) &&
    documentsReady

  const buildPayload = (): KycDetailsPayload => {
    const payload: KycDetailsPayload = {
      cardTypeId: Number(form.cardTypeId),
      areaCode: form.areaCode.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      // Wasabi has no middle-name field: it is carried in firstName (full name = firstName + lastName).
      firstName: [form.firstName, form.middleName].map((n) => n.trim()).filter(Boolean).join(' '),
      lastName: form.lastName.trim(),
      birthday: form.birthday,
      nationality: form.nationality.toUpperCase(),
      country: form.country.toUpperCase(),
      town: form.town.trim(),
      address: form.address.trim(),
      postCode: form.postCode.trim(),
      gender: form.gender,
      idType: form.idType,
      idNumber: form.idNumber.trim(),
      issueDate: form.issueDate,
      idNoExpiryDate: form.idNoExpiryDate,
      idFrontId: fileIds.front ?? '',
      idHoldId: fileIds.selfie ?? '',
    }
    if (needsBack && fileIds.back) payload.idBackId = fileIds.back
    if (form.occupation) payload.occupation = form.occupation
    if (form.annualSalary) payload.annualSalary = form.annualSalary
    if (form.accountPurpose) payload.accountPurpose = form.accountPurpose
    if (form.expectedMonthlyVolume) payload.expectedMonthlyVolume = form.expectedMonthlyVolume
    return payload
  }

  const submitKyc = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return
    setSubmitting(true)
    try {
      if (fixMode && holderId) {
        await kyc.updateHolder(holderId, buildPayload())
      } else {
        await kyc.registerHolder(buildPayload())
      }
      await refresh()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'We could not submit your details. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const issueCard = async () => {
    setError(null)
    if (!holderId) {
      setError('Your KYC has not been submitted yet.')
      return
    }
    const min = Number(selectedType?.depositAmountMinQuotaForActiveCard ?? 10)
    const max = Number(selectedType?.depositAmountMaxQuotaForActiveCard ?? 100000)
    const amount = Number(issueAmount)

    if (!Number.isFinite(amount) || amount < min || amount > max) {
      setError(`Choose an amount between ${min} and ${max} USD.`)
      return
    }

    setSubmitting(true)
    try {
      await cards.create({
        cardTypeId: Number(form.cardTypeId),
        holderId,
        amount: amount.toFixed(2),
      })
      await refresh()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'We could not issue your card. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingTypes) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    )
  }

  // Card issuance screen (after approval).
  if (issueMode && journey?.holder?.status === 'pass_audit') {
    const min = Number(selectedType?.depositAmountMinQuotaForActiveCard ?? 10)
    const max = Number(selectedType?.depositAmountMaxQuotaForActiveCard ?? 100000)
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Request your virtual card
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            You are approved. Choose how much to load onto your card to get started.
          </p>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="card-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your card product
          </h2>
          {selectedType ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Card</dt>
                <dd className="font-medium text-slate-900">
                  {selectedType.organization} {selectedType.bankCardBin}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Type</dt>
                <dd className="text-slate-900">{selectedType.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Initial deposit range</dt>
                <dd className="text-slate-900">
                  {selectedType.fiatCurrency} {min} - {max}
                </dd>
              </div>
              {selectedType.cardPrice !== '0' && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Card fee</dt>
                  <dd className="text-slate-900">
                    {selectedType.cardPrice} {selectedType.cardPriceCurrency}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Loading product details...</p>
          )}
        </div>

        <div className="card-surface p-5">
          <h3 className="text-sm font-semibold text-slate-900">How much would you like to load?</h3>
          <p className="mt-1 text-sm text-slate-500">
            This is the opening balance on your card. You can top it up any time from your wallet.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[10, 20, 50, 100].map((amount) => (
              <Button
                key={amount}
                variant={issueAmount === String(amount) ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setIssueAmount(String(amount))}
              >
                ${amount}
              </Button>
            ))}
          </div>
          <div className="mt-4">
            <label htmlFor="issueAmount" className="field-label">
              Amount in USD
            </label>
            <input
              id="issueAmount"
              type="number"
              min={min}
              max={max}
              step="1"
              className="field-input"
              value={issueAmount}
              onChange={(e) => setIssueAmount(e.target.value)}
            />
            <p className="field-hint">
              Between {min} and {max} USD. This is loaded onto your card as its opening balance.
            </p>
          </div>
        </div>

        <Button size="lg" fullWidth loading={submitting} onClick={issueCard}>
          Issue my card
        </Button>
        <Button variant="ghost" className="mt-2" onClick={() => setIssueMode(false)}>
          Back to my details
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {fixMode ? 'Correct your details' : 'Tell us who you are'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {fixMode
            ? 'Update the details that were wrong and we will submit them for review again.'
            : 'These details are checked by our compliance team. They must match your ID document exactly.'}
        </p>
      </div>

      {isRejected && !fixMode && (
        <Alert
          tone="warning"
          title="Your previous submission was rejected"
          action={
            <Button size="sm" onClick={() => setFixMode(true)}>
              Correct and resubmit
            </Button>
          }
        >
          {journey?.holder?.description ?? 'Please review the details below before resubmitting.'}
        </Alert>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      {/* Documents checklist */}
      <div className="card-surface p-4">
        <h2 className="text-sm font-semibold text-slate-900">Documents</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={fileIds.front ? 'success' : 'error'}>
            {fileIds.front ? 'ID front uploaded' : 'ID front missing'}
          </Badge>
          <Badge tone={needsBack ? (fileIds.back ? 'success' : 'error') : 'neutral'}>
            {needsBack
              ? fileIds.back
                ? 'ID back uploaded'
                : 'ID back missing'
              : 'ID back not needed'}
          </Badge>
          <Badge tone={fileIds.selfie ? 'success' : 'error'}>
            {fileIds.selfie ? 'Photo uploaded' : 'Photo missing'}
          </Badge>
        </div>
        {!documentsReady && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => navigate('/kyc/documents')}
          >
            Upload documents
          </Button>
        )}
      </div>

      <form onSubmit={submitKyc} className="card-surface space-y-6 p-5 sm:p-6" noValidate>
        {/* Card product */}
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Card product
          </legend>
          <div className="mt-3">
            <label htmlFor="cardTypeId" className="field-label">
              Which card do you want?
            </label>
            <select
              id="cardTypeId"
              className="field-input"
              value={form.cardTypeId}
              onChange={(e) => update('cardTypeId', e.target.value)}
            >
              {cardTypes.map((t) => (
                <option key={t.cardTypeId} value={t.cardTypeId}>
                  {t.organization} {t.bankCardBin} - {t.type} ({t.fiatCurrency})
                </option>
              ))}
            </select>
            {selectedType?.cardDesc && (
              <p className="field-hint">{selectedType.cardDesc}</p>
            )}
          </div>
        </fieldset>

        {/* Personal */}
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Personal details
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="field-label">
                First name
              </label>
              <input
                id="firstName"
                className="field-input"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="middleName" className="field-label">
                Middle name <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="middleName"
                className="field-input"
                value={form.middleName}
                onChange={(e) => update('middleName', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="field-label">
                Last name
              </label>
              <input
                id="lastName"
                className="field-input"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="birthday" className="field-label">
                Date of birth
              </label>
              <input
                id="birthday"
                type="date"
                className="field-input"
                value={form.birthday}
                onChange={(e) => update('birthday', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="gender" className="field-label">
                Gender
              </label>
              <select
                id="gender"
                className="field-input"
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
              >
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nationality" className="field-label">
                Nationality
              </label>
              <input
                id="nationality"
                className="field-input"
                value={form.nationality}
                onChange={(e) => update('nationality', e.target.value.toUpperCase())}
                maxLength={2}
                required
              />
            </div>
            <div>
              <label htmlFor="country" className="field-label">
                Country of residence
              </label>
              <select
                id="country"
                className="field-input"
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Address */}
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Address
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="town" className="field-label">
                Town / city
              </label>
              <input
                id="town"
                className="field-input"
                value={form.town}
                onChange={(e) => update('town', e.target.value)}
                placeholder="Nairobi"
                required
              />
            </div>
            <div>
              <label htmlFor="postCode" className="field-label">
                Postal code
              </label>
              <input
                id="postCode"
                className="field-input"
                value={form.postCode}
                onChange={(e) => update('postCode', e.target.value)}
                placeholder="00100"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="field-label">
                Street address
              </label>
              <input
                id="address"
                className="field-input"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="1 Main Street"
                required
              />
              <p className="field-hint">
                Letters, numbers, hyphens and spaces only.
              </p>
            </div>
          </div>
        </fieldset>

        {/* Contact */}
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contact
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="areaCode" className="field-label">
                Area code
              </label>
              <input
                id="areaCode"
                className="field-input"
                value={form.areaCode}
                onChange={(e) => update('areaCode', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="mobile" className="field-label">
                Mobile number
              </label>
              <input
                id="mobile"
                className="field-input"
                value={form.mobile}
                onChange={(e) => update('mobile', e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-1">
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="field-input"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>
          </div>
        </fieldset>

        {/* Identity document */}
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Identity document
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="idType" className="field-label">
                Document type
              </label>
              <select
                id="idType"
                className="field-input"
                value={form.idType}
                onChange={(e) => update('idType', e.target.value)}
              >
                {ID_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="idNumber" className="field-label">
                Document number
              </label>
              <input
                id="idNumber"
                className="field-input"
                value={form.idNumber}
                onChange={(e) => update('idNumber', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="issueDate" className="field-label">
                Date of issue
              </label>
              <input
                id="issueDate"
                type="date"
                className="field-input"
                value={form.issueDate}
                onChange={(e) => update('issueDate', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="idNoExpiryDate" className="field-label">
                Expiry date
              </label>
              <input
                id="idNoExpiryDate"
                type="date"
                className="field-input"
                value={form.idNoExpiryDate}
                onChange={(e) => update('idNoExpiryDate', e.target.value)}
                required
              />
            </div>
          </div>
        </fieldset>

        {/* Optional financial profile */}
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Financial profile <span className="font-normal normal-case">(optional)</span>
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="occupation" className="field-label">
                Occupation
              </label>
              <select
                id="occupation"
                className="field-input"
                value={form.occupation}
                onChange={(e) => update('occupation', e.target.value)}
              >
                <option value="">Not specified</option>
                {occupations.map((o) => (
                  <option key={o.occupationCode} value={o.occupationCode}>
                    {o.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="annualSalary" className="field-label">
                Annual salary
              </label>
              <input
                id="annualSalary"
                className="field-input"
                value={form.annualSalary}
                onChange={(e) => update('annualSalary', e.target.value)}
                placeholder="100000 USD"
              />
            </div>
            <div>
              <label htmlFor="accountPurpose" className="field-label">
                Account purpose
              </label>
              <input
                id="accountPurpose"
                className="field-input"
                value={form.accountPurpose}
                onChange={(e) => update('accountPurpose', e.target.value)}
                placeholder="Living Expense"
              />
            </div>
            <div>
              <label htmlFor="expectedMonthlyVolume" className="field-label">
                Expected monthly volume
              </label>
              <input
                id="expectedMonthlyVolume"
                className="field-input"
                value={form.expectedMonthlyVolume}
                onChange={(e) => update('expectedMonthlyVolume', e.target.value)}
                placeholder="10000 USD"
              />
            </div>
          </div>
        </fieldset>

        <div className="border-t border-slate-100 pt-5">
          <Button type="submit" size="lg" fullWidth loading={submitting} disabled={!canSubmit}>
            {fixMode ? 'Resubmit my details' : 'Submit for compliance review'}
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500">
            Your details are sent to our compliance partner for verification. You will be
            notified as soon as there is a decision.
          </p>
        </div>
      </form>
    </div>
  )
}
