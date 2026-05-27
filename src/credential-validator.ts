import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import { ReportEntry, KeyValidationResult } from './types.js';

export class CredentialValidator {
  private readonly region: string;

  constructor(region = process.env.AWS_REGION || 'us-east-1') {
    this.region = region;
  }

  async validateAccessKeyPair(accessKey: string, secretKey: string): Promise<KeyValidationResult> {
    try {
      const sts = new STSClient({
        region: this.region,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }
      });
      const response = await sts.send(new GetCallerIdentityCommand({}));
      return {
        valid: true,
        reason: 'Active key pair — STS GetCallerIdentity succeeded',
        accountId: response.Account,
        arn: response.Arn
      };
    } catch (err: any) {
      const code = err?.name || err?.Code || '';
      if (code === 'InvalidClientTokenId' || code === 'AuthFailure') {
        return { valid: false, reason: 'Invalid or revoked access key' };
      }
      if (code === 'ExpiredTokenException') {
        return { valid: false, reason: 'Token expired' };
      }
      return { valid: false, reason: `Validation error: ${code || err.message}` };
    }
  }

  async validateBedrockKey(accessKey: string, secretKey: string): Promise<KeyValidationResult> {
    try {
      const bedrock = new BedrockClient({
        region: this.region,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }
      });
      await bedrock.send(new ListFoundationModelsCommand({}));
      return { valid: true, reason: 'Active Bedrock key — ListFoundationModels succeeded' };
    } catch (err: any) {
      const code = err?.name || err?.Code || '';
      if (code === 'InvalidClientTokenId' || code === 'AuthFailure') {
        return { valid: false, reason: 'Invalid or revoked Bedrock key' };
      }
      if (code === 'AccessDeniedException') {
        // Key is valid but lacks Bedrock permissions — still a live key
        return { valid: true, reason: 'Key is active but lacks Bedrock permissions' };
      }
      return { valid: false, reason: `Validation error: ${code || err.message}` };
    }
  }

  async validateEntries(entries: ReportEntry[]): Promise<ReportEntry[]> {
    // Group ACCESS_KEY and SECRET_KEY pairs by repo+file so we can test them together
    const pairMap = new Map<string, { accessKey?: ReportEntry; secretKey?: ReportEntry }>();

    for (const entry of entries) {
      if (entry.type !== 'ACCESS_KEY' && entry.type !== 'SECRET_KEY' && entry.type !== 'BEDROCK_KEY') continue;
      const key = `${entry.repo}/${entry.file}`;
      if (!pairMap.has(key)) pairMap.set(key, {});
      const pair = pairMap.get(key)!;
      if (entry.type === 'ACCESS_KEY') pair.accessKey = entry;
      if (entry.type === 'SECRET_KEY' || entry.type === 'BEDROCK_KEY') pair.secretKey = entry;
    }

    for (const [, pair] of pairMap) {
      if (pair.accessKey && pair.secretKey) {
        console.log(`\n🔑 Validating key pair from ${pair.accessKey.repo}/${pair.accessKey.file}...`);
        const result = pair.secretKey.type === 'BEDROCK_KEY'
          ? await this.validateBedrockKey(pair.accessKey.value, pair.secretKey.value)
          : await this.validateAccessKeyPair(pair.accessKey.value, pair.secretKey.value);

        pair.accessKey.keyValidation = result;
        pair.secretKey.keyValidation = result;
      }
    }

    return entries;
  }
}
