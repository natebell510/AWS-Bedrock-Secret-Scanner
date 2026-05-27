export type CredentialType = 'ACCESS_KEY' | 'SECRET_KEY' | 'BEDROCK_KEY' | 'MODEL' | 'UNKNOWN';

export interface AwsCredential {
  type: CredentialType;
  value: string;
  maskedValue: string;
  pattern: string;
  confidence: 'high' | 'medium' | 'low';
  lineNumber?: number;
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

export interface ReportEntry {
  severity: 'critical' | 'high' | 'medium';
  type: CredentialType;
  maskedValue: string;
  location: string;
  owner?: string;
  repo?: string;
  file?: string;
  line?: number;
  url?: string;
  recommendation: string;
  timestamp: Date;
}

export interface RepositoryInfo {
  owner: string;
  repo: string;
  url: string;
  language?: string;
  stars?: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
}
