import { AwsCredential, ScanResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export class AwsBedrockDetector {
  private readonly AWS_ACCESS_KEY_PATTERN = /AKIA[0-9A-Z]{16}/g;
  private readonly AWS_SECRET_KEY_PATTERN = /(aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*([A-Za-z0-9/+=]{40})/gi;
  private readonly BEDROCK_API_KEY_PATTERN = /(?:bedrock[_-]?api[_-]?key|bedrock_key|BEDROCK_API_KEY|BEDROCK_KEY)\s*[:=]\s*([a-zA-Z0-9\-_.]{20,})/gi;
  private readonly BEDROCK_MODEL_PATTERN = /(anthropic\.claude|bedrock\.claude|claude-[0-9a-z]+|bedrock[_-]?model)\s*[:=]\s*([a-z0-9\-._]+)/gi;

  detectInText(text: string): AwsCredential[] {
    const credentials: AwsCredential[] = [];
    let match;

    while ((match = this.AWS_ACCESS_KEY_PATTERN.exec(text)) !== null) {
      credentials.push({ type: 'ACCESS_KEY', value: match[0], maskedValue: this.maskKey(match[0]) });
    }
    while ((match = this.AWS_SECRET_KEY_PATTERN.exec(text)) !== null) {
      credentials.push({ type: 'SECRET_KEY', value: match[2], maskedValue: this.maskKey(match[2]) });
    }
    while ((match = this.BEDROCK_API_KEY_PATTERN.exec(text)) !== null) {
      credentials.push({ type: 'BEDROCK_KEY', value: match[1], maskedValue: this.maskKey(match[1]) });
    }
    while ((match = this.BEDROCK_MODEL_PATTERN.exec(text)) !== null) {
      credentials.push({ type: 'MODEL', value: match[2], maskedValue: match[2] });
    }

    return credentials;
  }

  detectInFile(filePath: string): ScanResult {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const credentials = this.detectInText(content);
      return { found: credentials.length > 0, location: filePath, credentials, timestamp: new Date() };
    } catch {
      return { found: false, location: filePath, credentials: [], timestamp: new Date() };
    }
  }

  detectInDirectory(dirPath: string, ignorePatterns: string[] = []): ScanResult[] {
    const results: ScanResult[] = [];
    const ignore = ['.git', 'node_modules', 'dist', 'build', '.idea', ...ignorePatterns];

    const scanDir = (dir: string) => {
      try {
        for (const file of fs.readdirSync(dir)) {
          const fullPath = path.join(dir, file);
          if (ignore.some(p => file.includes(p))) continue;
          if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
          } else if (this.isScannableFile(file)) {
            const result = this.detectInFile(fullPath);
            if (result.found) results.push(result);
          }
        }
      } catch { /* skip unreadable dirs */ }
    };

    scanDir(dirPath);
    return results;
  }

  private maskKey(key: string): string {
    if (key.length <= 12) return '*'.repeat(key.length);
    return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
  }

  private isScannableFile(filename: string): boolean {
    const extensions = [
      '.ts', '.js', '.py', '.json', '.yaml', '.yml',
      '.env', '.conf', '.config', '.cfg', '.ini',
      '.txt', '.md', '.sh', '.bash', '.zsh', '.fish',
      '.tf', '.tfvars', '.xml', '.gradle', '.properties'
    ];
    return extensions.some(ext => filename.endsWith(ext))
      || /^(\.env|Dockerfile|docker-compose|\.bashrc|\.zshrc|\.profile)/.test(filename);
  }
}
