export type Language = 'en' | 'ar';

export interface UserAccount {
  name: string;
  email: string;
  normalizedEmail: string;
  salt: string; // base64
  hash: string; // base64
  iter: number;
  createdAt: number;
  lastLoginAt: number;
}

export interface ActiveSession {
  email: string;
  normalizedEmail: string;
  name: string;
  signedInAt: number;
  lastSeen: number;
}

export interface StoredAccounts {
  [normalizedEmail: string]: UserAccount;
}

export interface PasswordAnalysis {
  bits: number;
  poolSize: number;
  quality: 'q1' | 'q2' | 'q3' | 'q4' | 'q5';
  qualityColor: string;
  percent: number;
  crackTimeStr: string;
  warnings: string[];
}

export type RiskSeverity = 'ok' | 'info' | 'warn' | 'danger';

export interface UrlFinding {
  severity: RiskSeverity;
  key: string;
  param?: string;
}

export interface UrlInspectionResult {
  protocol: string;
  host: string;
  port: string;
  transport: 'tls' | 'plain' | null;
  path: string;
  paramsCount: number;
  risk: 'low' | 'med' | 'high';
  findings: UrlFinding[];
}

export interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'err' | 'success';
}
