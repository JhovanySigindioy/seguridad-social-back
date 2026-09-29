export interface AffiliateAuthUser {
  account_id: number;
  client_id: number;
  name: string;
  email: string;
  role: 'affiliate';
  agency_id: number;
  office_name: string;
  identification: string;
  must_change_password: boolean;
}

export interface AffiliateLoginResponse {
  token: string;
  user: AffiliateAuthUser;
}
