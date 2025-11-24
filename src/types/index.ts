// Account interface for bank accounts
export type Account = {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit';
  cleared_balance: number;
  email_domain?: string | null;
}

export type Category = {
  id: string;
  name: string;
  group: string;
  assigned: number;
  activity: number;
  available: number;
}

export type Transaction = {
  id: string;
  date: string;
  payee: string;
  amount: number;
  category_id: string | null;
  original_email_id?: string;
  status: 'cleared' | 'uncleared' | 'reconciled';
  account_id?: string;
  notes?: string;
}

export type UserConfig = {
  allowed_email: string;
  last_sync_time: string;
  gmail_refresh_token?: string;
  gmail_access_token?: string;
  gmail_token_expiry?: number;
}
