export interface Member {
  id: string
  mutan_id: string
  staff_id: string
  full_name: string
  phone_number: string
  email?: string
  date_joined: string
  membership_status: 'active' | 'suspended' | 'dormant' | 'exited'
  role: UserRole
  sms_opt_in: boolean
  onboarded_at?: string
  created_at: string
}

export type UserRole =
  | 'member'
  | 'secretary'
  | 'financial_secretary'
  | 'board_director'
  | 'chairman'

export interface Scheme {
  id: string
  name: string
  description?: string
  is_compulsory: boolean
  is_active: boolean
  waterfall_priority: number
  monthly_target?: number
  target_amount?: number
  lock_until?: string
  next_payout_date?: string
  subscriber_count?: number
  total_balance?: number
}

export interface Loan {
  id: string
  member: { id: string; full_name: string; mutan_id: string }
  guarantors?: { id: string; full_name: string; mutan_id: string }[]
  principal_amount: number
  outstanding_balance: number
  monthly_repayment: number
  status: 'pending_approval' | 'active' | 'fully_paid' | 'defaulted' | 'rejected'
  due_date: string
  purpose?: string
  disbursed_at?: string
  fully_paid_at?: string | null
  created_by?: { id: string; full_name: string } | null
  approved_by?: { id: string; full_name: string } | null
  approved_at?: string | null
  rejected_by?: { id: string; full_name: string } | null
  rejected_at?: string | null
  rejected_reason?: string | null
  loan_document_url?: string
  document_purged_at?: string | null
  created_at: string
}

export interface UploadBatch {
  id: string
  filename: string
  month_label: string
  status: 'pending' | 'staging' | 'published' | 'discarded'
  total_rows: number
  green_rows: number
  yellow_rows: number
  red_rows: number
  can_publish?: boolean
  published_at?: string
  created_at: string
}

export interface UploadRow {
  id: string
  raw_staff_id: string
  raw_mutan_id: string
  amount_paid: number
  status: 'green' | 'yellow' | 'red'
  variance_note?: string
  resolved_member?: { id: string; full_name: string; mutan_id: string } | null
  edited_by_admin?: string
  edited_at?: string
}

export interface ManualPayment {
  id: string
  member: { id: string; full_name: string; mutan_id: string }
  payment_type: 'loan_repayment' | 'wallet_topup' | 'subscription_payment'
  target_loan?: { id: string; outstanding_balance: number } | null
  target_scheme?: { id: string; name: string } | null
  declared_amount: number
  verified_amount?: number
  bank_reference: string
  receipt_url?: string
  month_label?: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
}

export interface InvestmentRound {
  id: string
  name: string
  description?: string
  target_amount: number
  amount_raised: number
  profit_ratio?: number
  actual_profit?: number
  status: 'open' | 'active' | 'matured' | 'closed'
  min_months_active?: number
  min_savings_balance?: number
  requires_good_standing: boolean
  min_shares_held?: number
  max_investment_amount?: number
  open_date: string
  maturity_date: string
  investor_count?: number
  created_at: string
}

export interface ShareSettings {
  face_value_per_unit: number
  min_units_per_member: number
  max_units_per_member?: number
  max_percent_of_total: number
  allow_new_purchases: boolean
  dividend_declared?: number
  dividend_declared_at?: string
}

export interface FixedAsset {
  id: string
  name: string
  category: 'land' | 'building' | 'vehicle' | 'equipment'
  acquisition_cost: number
  current_book_value: number
  acquisition_date: string
  funded_from?: string
  depreciation_rate: number
  income_generated_ytd: number
  distribution_method: 'equal' | 'by_savings' | 'by_shares' | 'retained'
  status: 'active' | 'disposed'
  notes?: string
}

export interface LevyType {
  id: string
  name: string
  amount: number
  is_active: boolean
  cooperative_account_type: string
  deduction_order: number
}

export interface DashboardSummary {
  membership: {
    total_members: number
    active_members: number
    suspended_members: number
  }
  financials: {
    total_savings_balance: number
    total_contributions_ever: number
    total_outstanding_loans: number
    total_asset_book_value: number
    total_share_capital: number
    total_cooperative_funds: number
  }
  scheme_breakdown: { scheme_name: string; is_compulsory: boolean; total_balance: number }[]
  cooperative_accounts: { name: string; type: string; balance: number }[]
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface AuditLog {
  id: string
  admin: string
  action: string
  table: string
  record_id?: string
  created_at: string
}
