export interface AffiliateAuthUser {
  account_id: number;
  client_id: number;
  name: string;
  email: string;
  role: 'affiliate';
  agency_id: number;
  office_name: string;
  identification: string;
}

export interface AffiliateLoginResponse {
  token: string;
  user: AffiliateAuthUser;
}
