export interface UploadAffiliateDocumentDTO {
  client_id: number;
  affiliation_id?: number | undefined;
  monthly_payment_id?: number | undefined;
  document_type: string;
  display_name?: string | undefined;
  is_visible_to_affiliate: boolean;
}

export interface AffiliateDocumentListFilters {
  client_id?: number | undefined;
  affiliation_id?: number | undefined;
  monthly_payment_id?: number | undefined;
}

export interface AffiliateDocumentListItem {
  id: number;
  client_id: number;
  affiliation_id: number | null;
  monthly_payment_id: number | null;
  document_type: string;
  display_name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  source: string;
  is_visible_to_affiliate: boolean;
  created_at: string;
  client_name: string;
  client_identification: string;
  office_name: string;
  payment_month: number | null;
  payment_year: number | null;
  download_url: string;
}
