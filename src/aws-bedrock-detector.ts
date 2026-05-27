import { AwsCredential, CredentialType, ScanResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export class AwsBedrockDetector {
  private readonly AWS_ACCESS_KEY_PATTERN = /AKIA[0-9A-Z]{16}/g;
  private readonly AWS_SECRET_KEY_PATTERN = /(aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*([A-Za-z0-9/+=]{40})/gi;
  private readonly BEDROCK_API_KEY_PATTERN = /(?:bedrock[_-]?api[_-]?key|bedrock_key|BEDROCK_API_KEY|BEDROCK_KEY)\s*[:=]\s*([a-zA-Z0-9\-_.]{20,})/gi;
  private readonly BEDROCK_MODEL_PATTERN = /(anthropic\.claude|bedrock\.claude|claude-[0-9a-z]+|bedrock[_-]?model)\s*[:=]\s*([a-z0-9\-._]+)/gi;
  private readonly AWS_PROFILE_PATTERN = /\[([^\]]+)\]\s*\naws_access_key_id\s*=\s*(AKIA[0-9A-Z]{16})/g;

  detectInText(text: string): AwsCredential[] {
    const credentials: AwsCredential[] = [];

    // AWS Access Keys
    let match;
    while ((match = this.AWS_ACCESS_KEY_PATTERN.exec(text)) !== null) {
      credentials.push({
        type: 'ACCESS_KEY',
        value: match[0],
        maskedValue: this.maskKey(match[0]),
        pattern: 'AKIA[0-9A-Z]{16}',
        confidence: 'high'
      });
    }

    // AWS Secret Keys
    while ((match = this.AWS_SECRET_KEY_PATTERN.exec(text)) !== null) {
      const secretKey = match[2];
      credentials.push({
        type: 'SECRET_KEY',
        value: secretKey,
        maskedValue: this.maskKey(secretKey),
        pattern: 'AWS_SECRET_ACCESS_KEY',
        confidence: 'high'
      });
    }

    // Bedrock API Keys
    while ((match = this.BEDROCK_API_KEY_PATTERN.exec(text)) !== null) {
      credentials.push({
        type: 'BEDROCK_KEY',
        value: match[1],
        maskedValue: this.maskKey(match[1]),
        pattern: 'bedrock_api_key',
        confidence: 'medium'
      });
    }

    // Bedrock Models
    while ((match = this.BEDROCK_MODEL_PATTERN.exec(text)) !== null) {
      credentials.push({
        type: 'MODEL',
        value: match[2],
        maskedValue: match[2],
        pattern: 'bedrock_model',
        confidence: 'low'
      });
    }

    return credentials;
  }

  detectInFile(filePath: string): ScanResult {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const credentials = this.detectInText(content);

      return {
        found: credentials.length > 0,
        location: filePath,
        credentials,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        found: false,
        location: filePath,
        credentials: [],
        timestamp: new Date()
      };
    }
  }

  detectInDirectory(dirPath: string, ignorePatterns: string[] = []): ScanResult[] {
    const results: ScanResult[] = [];
    const defaultIgnore = ['.git', 'node_modules', 'dist', 'build', '.idea'];
    const ignore = [...defaultIgnore, ...ignorePatterns];

    const scanDir = (dir: string) => {
      try {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);

          if (ignore.some(pattern => file.includes(pattern))) {
            continue;
          }

          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (this.isScannableFile(file)) {
            const result = this.detectInFile(fullPath);
            if (result.found) {
              results.push(result);
            }
          }
        }
      } catch (error) {
        // Silently skip directories we can't read
      }
    };

    scanDir(dirPath);
    return results;
  }

  validateAWSKeyFormat(key: string): boolean {
    if (!key) return false;

    if (key.match(/^AKIA[0-9A-Z]{16}$/)) {
      return true;
    }

    if (key.match(/^[A-Za-z0-9/+=]{40}$/)) {
      return true;
    }

    return false;
  }

  classifyCredential(value: string): CredentialType {
    if (value.match(/^AKIA[0-9A-Z]{16}$/)) {
      return 'ACCESS_KEY';
    }
    if (value.match(/^[A-Za-z0-9/+=]{40}$/)) {
      return 'SECRET_KEY';
    }
    if (value.match(/^[a-zA-Z0-9\-_.]{20,}$/) && !value.match(/^claude-|bedrock-/)) {
      return 'BEDROCK_KEY';
    }
    if (value.match(/^(?:claude|bedrock|anthropic\.)/) || value.includes('claude')) {
      return 'MODEL';
    }
    return 'UNKNOWN';
  }

  private maskKey(key: string): string {
    if (key.length <= 12) {
      return '*'.repeat(key.length);
    }
    return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
  }

  private isScannableFile(filename: string): boolean {
    const extensions = [
      '.ts', '.js', '.py', '.json', '.yaml', '.yml',
      '.env', '.conf', '.config', '.cfg', '.ini',
      '.txt', '.md', '.sh', '.bash', '.zsh', '.fish',
      '.tf', '.tfvars', '.xml', '.gradle', '.properties'
    ];

    const extMatch = extensions.some(ext => filename.endsWith(ext));
    const fileMatch = /^(\.env|Dockerfile|docker-compose|\.bashrc|\.zshrc|\.profile)/.test(filename);

    return extMatch || fileMatch;
  }
}
