export type CredentialType = 'ACCESS_KEY' | 'SECRET_KEY' | 'BEDROCK_KEY' | 'MODEL' | 'UNKNOWN';

export interface AwsCredential {
  type: CredentialType;
  value: string;
  maskedValue: string;
}

export interface ScanResult {
  found: boolean;
  location: string;
  credentials: AwsCredential[];
  timestamp: Date;
}

export interface GitHubSearchResult {
  repo: {
    name: string;
    owner: string;
    url: string;
    private: boolean;
  };
  files: {
    path: string;
    url: string;
    credentials: AwsCredential[];
  }[];
  credentials: AwsCredential[];
}

export interface KeyValidationResult {
  valid: boolean;
  reason: string;
  accountId?: string;
  arn?: string;
}

export interface ReportEntry {
  severity: 'critical' | 'high' | 'medium';
  type: CredentialType;
  value: string;
  maskedValue: string;
  location: string;
  owner?: string;
  repo?: string;
  file?: string;
  line?: number;
  url?: string;
  keyValidation?: KeyValidationResult;
  timestamp: Date;
}
