/**
 * api.ts - typed wrappers for every backend endpoint the UI uses.
 * The UI never calls `request` directly; it calls these.
 */

import { ApiError, idempotencyKey, request } from './client'
import type {
  CardHolder,
  CardOperationResult,
  CardType,
  Journey,
  MyCard,
  PriceQuote,
  TokenResponse,
  Topup,
  User,
  WalletBalance,
} from './types'

// =========================================================
// AUTH
// =========================================================
export const auth = {
  register: (body: {
    email: string
    password: string
    fullName: string
    phone: string
    acceptedTerms: boolean
  }) => request<TokenResponse>('/api/v1/users/register', { method: 'POST', body, auth: false }),

  login: (body: { email: string; password: string }) =>
    request<TokenResponse>('/api/v1/users/login', { method: 'POST', body, auth: false }),

  verifyEmail: (token: string) =>
    request<User>('/api/v1/users/verify-email', { method: 'POST', body: { token }, auth: false }),

  resendVerification: (email: string) =>
    request<{ message: string }>('/api/v1/users/resend-verification', {
      method: 'POST',
      body: { email },
      auth: false,
    }),

  me: () => request<User>('/api/v1/users/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/v1/users/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),

  /** Development helper - the backend 404s this in production. */
  devVerificationLink: (email: string) =>
    request<{ userId: string; emailVerified: boolean; verificationLink: string; token: string }>(
      `/api/v1/users/dev/verification-link?email=${encodeURIComponent(email)}`,
      { auth: false },
    ),
}

// =========================================================
// JOURNEY
// =========================================================
export const journey = {
  get: (signal?: AbortSignal) => request<Journey>('/api/v1/journey', { signal }),

  history: () =>
    request<{ records: Array<Record<string, unknown>> }>('/api/v1/journey/events/history'),
}

// =========================================================
// CARDS
// =========================================================
export const cards = {
  cardTypes: () => request<{ data: CardType[] }>('/api/v1/cards/supported-BINS/types', {
    method: 'POST',
    body: {},
  }),

  myCards: (page = 1, size = 20) =>
    request<{ total: number; records: MyCard[] }>(
      `/api/v1/cards/list-BINS?page=${page}&pageSize=${size}`,
    ),

  info: (cardNo: string) =>
    request<{ data: Record<string, unknown> }>('/api/v1/cards/info', {
      method: 'POST',
      body: { cardNo },
    }),

  balance: (cardNo: string) =>
    request<{ data: { cardNo: string; amount: number; usedAmount: number; currency: string } }>(
      '/api/v1/cards/balance',
      { method: 'POST', body: { cardNo } },
    ),

  sensitive: (cardNo: string) =>
    request<{ data: { cardNumber: string; cvv: string; expireDate: string; activateUrl?: string } }>(
      '/api/v1/cards/sensitive',
      { method: 'POST', body: { cardNo } },
    ),

  create: (body: { cardTypeId: number; holderId?: number; amount: string; designId?: string }) =>
    request<CardOperationResult & { cardNo?: string }>('/api/v1/cards/create', {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': idempotencyKey('card') },
    }),

  freeze: (cardNo: string) =>
    request<CardOperationResult>('/api/v1/cards/freeze', {
      method: 'POST',
      body: { cardNo },
      headers: { 'Idempotency-Key': idempotencyKey('freeze') },
    }),

  unfreeze: (cardNo: string) =>
    request<CardOperationResult>('/api/v1/cards/unfreeze', {
      method: 'POST',
      body: { cardNo },
      headers: { 'Idempotency-Key': idempotencyKey('unfreeze') },
    }),

  cancel: (cardNo: string) =>
    request<CardOperationResult>('/api/v1/cards/cancel', {
      method: 'POST',
      body: { cardNo },
      headers: { 'Idempotency-Key': idempotencyKey('cancel') },
    }),

  deposit: (cardNo: string, amount: string) =>
    request<CardOperationResult>('/api/v1/cards/deposit', {
      method: 'POST',
      body: { cardNo, amount },
      headers: { 'Idempotency-Key': idempotencyKey('deposit') },
    }),

  withdraw: (cardNo: string, amount: string) =>
    request<CardOperationResult>('/api/v1/cards/withdraw', {
      method: 'POST',
      body: { cardNo, amount },
      headers: { 'Idempotency-Key': idempotencyKey('withdraw') },
    }),
}

// =========================================================
// CARDHOLDER + KYC
// =========================================================
export interface KycDetails {
  cardTypeId: number
  areaCode: string
  mobile: string
  email: string
  firstName: string
  lastName: string
  birthday: string
  nationality: string
  country: string
  town: string
  address: string
  postCode: string
  gender: string
  occupation?: string
  annualSalary?: string
  accountPurpose?: string
  expectedMonthlyVolume?: string
  idType: string
  idNumber: string
  issueDate: string
  idNoExpiryDate: string
  idFrontId: string
  idBackId?: string
  idHoldId: string
}

export const kyc = {
  upload: (file: File, kind: 'front' | 'back' | 'selfie') => {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    return request<{ fileId: string; kind: string }>('/api/v1/cards/kyc/upload', {
      method: 'POST',
      body: form,
    })
  },

  uploadBulk: (files: { front: File; back?: File; selfie: File }) => {
    const form = new FormData()
    form.append('front', files.front)
    if (files.back) form.append('back', files.back)
    form.append('selfie', files.selfie)
    return request<{
      success: boolean
      data: {
        frontId: string | null
        backId: string | null
        selfieId: string | null
        details: Record<string, { fileId: string | null; fileName: string | null }>
      }
    }>('/api/v1/cards/kyc/upload-bulk', { method: 'POST', body: form })
  },

  documents: () =>
    request<{
      records: Array<{ kind: string; fileId: string; filename: string; createdAt: string }>
    }>('/api/v1/cards/kyc/documents'),

  registerHolder: (details: KycDetails) =>
    request<{ data: { holderId: number; status: string } }>('/api/v1/cards/cardholder/register', {
      method: 'POST',
      body: details,
      headers: { 'Idempotency-Key': idempotencyKey('holder') },
    }),

  updateHolder: (holderId: number, details: KycDetails) =>
    request<{ data: { holderId: number; status: string } }>(
      `/api/v1/cards/cardholder/${holderId}`,
      {
        method: 'PUT',
        body: details,
        headers: { 'Idempotency-Key': idempotencyKey('holder-upd') },
      },
    ),

  myHolders: () => request<{ records: CardHolder[] }>('/api/v1/cards/cardholders'),

  getHolder: (holderId: number, refresh = false) =>
    request<CardHolder>(`/api/v1/cards/cardholder/${holderId}?refresh=${refresh}`),

  submitWorkOrder: (body: {
    title: string
    target: string
    content?: string
    tradeType?: string
    cardNo?: string
  }) =>
    request<CardOperationResult>('/api/v1/cards/kyc/submit', {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': idempotencyKey('work') },
    }),

  cities: () => request<{ data: unknown }>('/api/v1/cards/diagnostic/kenya-cities'),

  occupations: () => request<{ data: Array<{ occupationCode: string; description: string }> }>(
    '/api/v1/cards/occupations',
  ),
}

// =========================================================
// WALLET
// =========================================================
export const wallet = {
  balance: () => request<WalletBalance>('/api/v1/wallet'),

  quote: (usd: string, kind: 'fund' | 'withdraw' | 'issue' = 'fund', cardTypeId?: number) =>
    request<PriceQuote>(
      `/api/v1/wallet/quote?usd=${encodeURIComponent(usd)}&kind=${kind}` +
        (cardTypeId ? `&cardTypeId=${cardTypeId}` : ''),
    ),

  topup: (phone: string, amountKes: number) =>
    request<Topup>('/api/v1/wallet/topup', {
      method: 'POST',
      body: { phone, amountKes },
      headers: { 'Idempotency-Key': idempotencyKey('topup') },
    }),

  topupStatus: (checkoutRequestId: string, refresh = false) =>
    request<Topup>(
      `/api/v1/wallet/topups/${encodeURIComponent(checkoutRequestId)}?refresh=${refresh}`,
    ),
}

export { ApiError }
