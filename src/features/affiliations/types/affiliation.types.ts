export const PAYMENT_STATUSES = ['Pendiente', 'En Proceso', 'Pagado'] as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export interface AffiliationItem {
  id: number;
  client_name: string;
  client_identification: string;
  company_name: string;
  month: number;
  year: number;
  value: number;
  eps_name: string;
  arl_name: string;
  ccf_name: string;
  pension_name: string;
  risk_level: string;
  payment_status: PaymentStatus;
  created_at: string;
  gov_record_at: string | null;
  is_auto_renewed: boolean;
}

export interface AffiliationListResponse {
  items: AffiliationItem[];
  total: number;
}
