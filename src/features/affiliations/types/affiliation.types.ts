export const PAYMENT_STATUSES = ['Pendiente', 'En Proceso', 'Pagado', 'Sin Recibo'] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export const AFFILIATION_STATUSES = ['Activo', 'Inactivo'] as const;
export type AffiliationStatus = typeof AFFILIATION_STATUSES[number];

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
  days_worked: number | null;
  month: number;
  year: number;
  value: number;
  eps_name: string;
  arl_name: string;
  ccf_name: string;
  pension_name: string;
  risk_level: string;
  payment_status: PaymentStatus;
  payment_method: string | null;
  created_at: string;
  gov_record_at: string | null;
  is_auto_renewed: boolean;
  observation: string | null;
  withdrawal_reason: WithdrawalReason | null;
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
