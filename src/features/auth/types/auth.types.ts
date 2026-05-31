export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    agency_id: number;
    agency_logo_url?: string | null;
  };
  offices: number[];
}
