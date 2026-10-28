/**
 * types.ts - the shapes returned by the FastAPI backend.
 * Kept in one place so a backend change shows up as a TypeScript error here.
 */

export type StepStatus = 'completed' | 'in_progress' | 'pending' | 'blocked'

export interface JourneyStep {
  key: string
  title: string
  description: string
  status: StepStatus
  action: string
}

export interface JourneyHolder {
  holderId: number | null
  status: string | null
  statusFlowLocation: string | null
  description: string | null
}

export interface JourneyCard {
  cardNo: string | null
  status: string | null
  blocked: boolean
}

export interface Journey {
  userId: string
  steps: JourneyStep[]
  currentStep: string | null
  currentTitle: string
  nextAction: string | null
  progress: number
  completedSteps: number
  totalSteps: number
  summary: string
  emailVerified: boolean
  kycDocuments: string[]
  holder: JourneyHolder | null
  card: JourneyCard | null
  funded: boolean
  updatedAt: string
}

export interface User {
  userId: string
  email: string
  fullName: string
  phone: string
  emailVerified: boolean
  status: string
  createdAt: string | null
  lastLoginAt: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface WalletBalance {
  currency: string
  available: string
  held: string
}

export interface PriceQuote {
  usd: string
  rate: string
  spread_pct: string
  kes: string
  fixed_fee_kes?: string
  provider_fee_usd?: string
}

export interface MyCard {
  card_no: string
  status: string
  card_type_id: number
  holder_id: number | null
  blocked?: boolean
  created_at?: string
  updated_at?: string
}

export interface CardHolder {
  holder_id: number
  status: string
  card_type_id: number
  description?: string
  status_flow_location?: string
  review?: {
    status: string
    status_label: string
    approved: boolean
    reviewer: string
    review_location: string | null
    description: string | null
    next_step: string
  }
}

export interface CardType {
  cardTypeId: number
  organization: string
  country: string
  bankCardBin: string
  type: string
  category: string
  cardName: string
  cardDesc: string
  cardPrice: string
  cardPriceCurrency: string
  needCardHolder: boolean
  needDepositForActiveCard: boolean
  depositAmountMinQuotaForActiveCard: string
  depositAmountMaxQuotaForActiveCard: string
  fiatCurrency: string
  balanceRetentionQuota: number
  status: string
  rechargeMinQuota: string
  rechargeMaxQuota: string
  rechargeFeeRate: number
  rechargeFixedFee: number
  rechargeDigital: number
  enableActiveCard: boolean
  enableDeposit: boolean
  enableFreeze: boolean
  enableUnFreeze: boolean
  support: string[]
  risk: string[]
  supportHolderNationality: string[]
  supportHolderAreaCode: string[]
  metadata?: {
    cardHolderMaxCardLimit?: number
    cardHolderModel?: string
  }
}

export interface Topup {
  checkout_request_id: string
  amount_kes: number
  status: string
  phone_masked: string
  mpesa_receipt: string | null
  result_desc: string | null
  created_at: string | null
}

export interface CardOperationResult {
  merchantOrderNo: string
  status: string
  duplicate?: boolean
  data?: Record<string, unknown>
}
