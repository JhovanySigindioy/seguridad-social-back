import type { Request } from 'express';

export interface AffiliateAuthRequest extends Request {
  affiliate: {
    account_id: number;
    client_id: number;
    agency_id: number;
    email: string;
    name: string;
    role: 'affiliate';
    scope: 'affiliate';
  };
}
