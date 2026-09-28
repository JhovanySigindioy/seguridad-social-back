export const PAYMENT_STATUSES = ['Pendiente', 'En Proceso', 'Pagado'] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];
export const PAYMENT_DISPLAY_STATUSES = [...PAYMENT_STATUSES, 'Por Confirmar'] as const;
export type PaymentDisplayStatus = typeof PAYMENT_DISPLAY_STATUSES[number];

export const AFFILIATION_STATUSES = ['Activo', 'Inactivo', 'Vencido'] as const;
export type AffiliationStatus = typeof AFFILIATION_STATUSES[number];
export const AFFILIATION_DECISION_STATUSES = ['Por Confirmar', 'Confirmada', 'No Continúa'] as const;
export type AffiliationDecisionStatus = typeof AFFILIATION_DECISION_STATUSES[number];
export const AFFILIATION_ORIGINS = ['PRIMERA_AFILIACION', 'CONTINUIDAD', 'REINGRESO'] as const;
export type AffiliationOrigin = typeof AFFILIATION_ORIGINS[number];

export const WITHDRAWAL_REASONS = ['Voluntario', 'FinContrato', 'Licencia', 'Otro'] as const;
export type WithdrawalReason = typeof WITHDRAWAL_REASONS[number];

export interface AffiliationPeriod {
  id: number;
  start_date: string;
  end_date: string | null;
  status: AffiliationStatus;
  month: number;
  year: number;
}

export interface AffiliationItem {
  id: number;
  client_id: number;
  client_name: string;
  client_identification: string;
  company_id: number;
  company_name: string;
  start_date: string;
  end_date: string | null;
  status: AffiliationStatus;
  decision_status: AffiliationDecisionStatus;
  affiliation_origin: AffiliationOrigin;
  days_worked: number | null;
  monthly_payment_id: number | null;
  month: number;
  year: number;
  value: number;
  eps_name: string;
  arl_name: string;
  ccf_name: string;
  pension_name: string;
  risk_level: string;
  payment_status: PaymentDisplayStatus;
  payment_method: string | null;
  created_at: string;
  gov_record_at: string | null;
  is_auto_renewed: boolean;
  observation: string | null;
  withdrawal_reason: WithdrawalReason | null;
  withdrawal_observations: string | null;
}

export interface AffiliationListResponse {
  items: AffiliationItem[];
  total: number;
}

export interface AffiliationWithdrawalDTO {
  end_date: string;
  withdrawal_reason: WithdrawalReason;
  withdrawal_observations?: string;
}

export interface AffiliationCreateDTO {
  client_id: number;
  company_id: number;
  office_id?: number;
  start_date: string;
  end_date?: string;
  value: number;
  payment_method?: 'Efectivo' | 'Transferencia' | 'Nequi' | 'Daviplata' | 'Otro';
  eps_id?: number | null;
  arl_id?: number | null;
  ccf_id?: number | null;
  pension_id?: number | null;
  risk_level?: string | null;
  is_auto_renewed?: boolean;
  observation?: string;
}
