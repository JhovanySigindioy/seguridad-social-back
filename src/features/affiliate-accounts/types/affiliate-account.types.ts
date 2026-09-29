export interface AffiliateAccountListFilters {
  agencyId: number;
  userId: number;
  role: string;
  officeId?: number;
  search?: string;
  status?: 'active' | 'blocked' | 'disabled' | 'invited' | 'none';
  paidOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateAffiliateAccountInput {
  agencyId: number;
  userId: number;
  role: string;
  clientId: number;
  email?: string;
}
