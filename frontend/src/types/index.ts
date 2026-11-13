export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  date_joined: string
  last_login: string | null
  phone: string
  department: string
  can_write: boolean
  can_approve: boolean
  is_read_only: boolean
}

export type UserRole =
  | 'DIRECTEUR_FINANCIER'
  | 'COMPTABLE'
  | 'TRESORIER'
  | 'CONTROLEUR_GESTION'
  | 'AUDITEUR_INTERNE'
  | 'ADMINISTRATEUR'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  DIRECTEUR_FINANCIER: 'Directeur Financier',
  COMPTABLE: 'Comptable',
  TRESORIER: 'Trésorier',
  CONTROLEUR_GESTION: 'Contrôleur de Gestion',
  AUDITEUR_INTERNE: 'Auditeur Interne',
  ADMINISTRATEUR: 'Administrateur Système',
}

export interface Currency {
  id: number
  code: string
  name: string
  symbol: string
}

export interface Bank {
  id: number
  code: string
  name: string
  country: string
  swift_code: string
  is_active: boolean
  created_at: string
  accounts_count: number
}

export interface BankAccount {
  id: number
  bank: number
  bank_name: string
  bank_code: string
  account_number: string
  account_name: string
  currency: number
  currency_code: string
  currency_symbol: string
  account_type: string
  iban: string
  is_active: boolean
  opening_balance: string
  created_at: string
  notes: string
}

export interface BankStatement {
  id: number
  bank_account: number
  bank_account_name: string
  bank_name: string
  file_name: string
  file_format: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
  period_start: string | null
  period_end: string | null
  transaction_count: number
  total_debit: string
  total_credit: string
  imported_by: number | null
  imported_by_name: string | null
  imported_at: string
  error_message: string
}

export interface BankTransaction {
  id: number
  statement: number
  transaction_date: string
  value_date: string | null
  description: string
  reference: string
  amount: string
  transaction_type: 'DEBIT' | 'CREDIT'
  balance_after: string | null
  is_reconciled: boolean
  reconciliation_id: number | null
}

export interface AccountingJournal {
  id: number
  code: string
  name: string
  journal_type: string
  bank_account: number | null
  bank_account_name: string | null
  is_active: boolean
  entries_count: number
}

export interface AccountingEntry {
  id: number
  journal: number
  journal_code: string
  journal_name: string
  entry_date: string
  piece_number: string
  account_code: string
  account_label: string
  description: string
  reference: string
  debit: string
  credit: string
  amount: string
  transaction_type: 'DEBIT' | 'CREDIT'
  is_reconciled: boolean
  reconciliation_id: number | null
}

export interface ReconciliationSession {
  id: number
  name: string
  bank_account: number
  bank_account_name: string
  bank_name: string
  journal: number
  journal_name: string
  period_start: string
  period_end: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'VALIDATED'
  auto_match_threshold: number
  created_by: number
  created_by_name: string
  validated_by: number | null
  validated_by_name: string | null
  validated_at: string | null
  created_at: string
  match_count: number
  gap_count: number
  notes: string
}

export interface ReconciliationMatch {
  id: number
  session: number
  bank_transaction: number
  bank_transaction_data: BankTransaction
  accounting_entry: number
  accounting_entry_data: AccountingEntry
  score: number
  is_manual: boolean
  matched_by: number | null
  matched_by_name: string | null
  matched_at: string
  notes: string
}

export interface ReconciliationGap {
  id: number
  session: number
  gap_type: string
  status: 'OUVERT' | 'EXPLIQUE' | 'RESOLU'
  bank_transaction: number | null
  bank_transaction_data: BankTransaction | null
  accounting_entry: number | null
  accounting_entry_data: AccountingEntry | null
  amount_difference: string | null
  justification: string
  resolved_by: number | null
  resolved_by_name: string | null
  created_at: string
}

export interface DashboardStats {
  kpis: {
    total_accounts: number
    total_sessions: number
    validated_sessions: number
    pending_gaps: number
    reconciled_this_month: number
    validation_rate: number
  }
  monthly_data: Array<{ month: string; matches: number; gaps: number }>
  accounts: Array<{
    id: number
    name: string
    bank: string
    currency: string
    last_statement: string | null
    sessions_count: number
  }>
  recent_sessions: Array<{
    id: number
    name: string
    status: string
    bank_account: string
    bank: string
    period_start: string
    period_end: string
    match_count: number
    gap_count: number
    progress: number
    created_by: string
    created_at: string
  }>
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
