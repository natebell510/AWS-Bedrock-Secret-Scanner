# AWS Bedrock Secret Scanner

A TypeScript tool to detect and report exposed AWS credentials and Bedrock API keys on GitHub repositories. This scanner helps developers identify accidentally committed secrets and take corrective action before they are exploited.

## Features

- **Comprehensive Detection**: Identifies AWS Access Keys (AKIA...), AWS Secret Access Keys, Bedrock API Keys, and model identifiers
- **Multiple Search Methods**: Search public GitHub repositories by keyword, scan specific users/organizations, or scan local files
- **Severity Levels**: Credentials are rated as Critical, High, or Medium severity
- **JSON & Console Reports**: Get detailed findings with recommendations for remediation
- **Rate Limiting**: Handles GitHub API rate limits gracefully with exponential backoff
- **Local Scanning**: Scan local directories with .gitignore support for quick credential detection

## Installation

1. **Clone or navigate to the repository:**
   ```bash
   cd aws-bedrock-secret-scanner
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the TypeScript:**
   ```bash
   npm run build
   ```

4. **(Optional) Create a GitHub token for higher rate limits:**
   ```bash
   # Create a .env file
   echo "GITHUB_TOKEN=ghp_your_token_here" > .env
   ```

## Quick Start

### Scan a local directory
```bash
npm run scan:local -- /path/to/directory
npm run scan:local -- .  # Current directory
```

### Search GitHub for exposed credentials
```bash
npm run scan:search -- "bedrock"
npm run scan:search -- "AKIA"
npm run scan:search -- "aws_secret"
```

### Scan all repositories of a GitHub user
```bash
npm run scan:user -- torvalds
npm run scan:user -- octocat
```

### Scan all repositories in a GitHub organization
```bash
npm run scan:org -- aws
npm run scan:org -- microsoft
```

### Scan a specific GitHub repository
```bash
npm run scan:repo -- owner/repository
npm run scan:repo -- torvalds/linux
```

## Usage Examples

### Example 1: Quick Local Scan
```bash
$ npm run scan:local -- ./src

📁 Scanning local directory: ./src

✅ No AWS credentials found!
```

### Example 2: Search for Bedrock Credentials
```bash
$ npm run scan:search -- "bedrock"

🔍 Searching GitHub for: "bedrock"
This may take a few minutes...

⚠️  AWS CREDENTIALS DETECTED

Found 3 potential security issue(s)

 CRITICAL 
  SECRET_KEY
    Location: owner/repo/src/config.ts
    Value:    wJalrXUtnF...EKEY
    URL:      https://github.com/owner/repo/blob/main/src/config.ts
    AWS Secret Access Key exposed. This is CRITICAL - revoke immediately.

...

REMEDIATION STEPS:
1. Revoke the exposed AWS credentials immediately
2. Create new credentials with the same permissions
3. Remove the credentials from git history (use BFG or git-filter-branch)
4. Force push the cleaned repository
5. Enable GitHub secret scanning for automated detection
6. Consider enabling AWS credential rotation policies

✅ Report exported to bedrock-scan-2026-05-27.json
```

## Configuration

Create a `.env` file in the project root for optional configuration:

```env
# GitHub personal access token (required for higher rate limits)
GITHUB_TOKEN=ghp_your_personal_access_token

# AWS Region (optional)
AWS_REGION=us-east-1

# Minimum severity level to report (optional)
SCAN_SEVERITY_LEVEL=high
```

### Generating a GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" (classic)
3. Add scopes: `public_repo`, `read:org`
4. Generate and copy the token
5. Add to `.env`: `GITHUB_TOKEN=ghp_xxxxxxxxxxxx`

## Detected Credentials

### AWS Access Keys
- **Pattern**: `AKIA[0-9A-Z]{16}`
- **Example**: `AKIAIOSFODNN7EXAMPLE`
- **Severity**: Critical
- **Risk**: Can be used to access AWS resources and services

### AWS Secret Access Keys
- **Pattern**: Long base64-like strings paired with `AWS_SECRET_ACCESS_KEY`
- **Example**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
- **Severity**: Critical
- **Risk**: Combined with access key, allows full AWS account compromise

### Bedrock API Keys
- **Pattern**: Keys in `bedrock_api_key`, `BEDROCK_API_KEY` environment variables
- **Severity**: High
- **Risk**: Can be used to call Bedrock APIs and incur costs

### Bedrock Model Identifiers
- **Pattern**: Model names like `anthropic.claude-3-sonnet`
- **Severity**: Medium
- **Risk**: Reveals deployment architecture; not immediately exploitable

## Output and Reports

### Console Output
Results are displayed in the console with:
- Color-coded severity levels (Critical=Red, High=Yellow, Medium=Blue)
- Masked credential values for safe display
- Direct links to GitHub for found credentials
- Remediation recommendations

### JSON Reports
Detailed reports are automatically generated in `bedrock-scan-TIMESTAMP.json`:
```json
{
  "timestamp": "2026-05-27T16:10:24.103Z",
  "totalFindings": 3,
  "bySeverity": {
    "critical": 2,
    "high": 1,
    "medium": 0
  },
  "findings": [
    {
      "severity": "critical",
      "type": "SECRET_KEY",
      "maskedValue": "wJalrXUtnF...EKEY",
      "location": "owner/repo/file.ts",
      "repo": "owner/repo",
      "file": "file.ts",
      "url": "https://github.com/owner/repo/blob/main/file.ts",
      "recommendation": "AWS Secret Access Key exposed. This is CRITICAL - revoke immediately.",
      "timestamp": "2026-05-27T16:10:24.101Z"
    }
  ]
}
```

## Remediation Guide

If credentials are found:

1. **Immediately revoke the credentials** in the AWS Console
2. **Create new credentials** with the same (or more restricted) permissions
3. **Remove credentials from git history:**
   ```bash
   # Using git-filter-branch
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   
   # Or use BFG (simpler)
   bfg --delete-files .env --force
   ```
4. **Force push the cleaned repository:**
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```
5. **Enable GitHub secret scanning** (Settings → Security → Secret scanning)
6. **Notify team members** to pull the cleaned repository
7. **Review audit logs** for any unauthorized access

## Advanced Usage

### Custom Scan Patterns
To scan for additional patterns, edit `src/aws-bedrock-detector.ts` and add regex patterns to the detector class.

### API Integration
The scanner can be imported and used programmatically:

```typescript
import { AwsBedrockDetector } from './dist/aws-bedrock-detector.js';
import { GitHubScanner } from './dist/github-scanner.js';
import { Reporter } from './dist/reporter.js';

const detector = new AwsBedrockDetector();
const results = detector.detectInDirectory('./src');

const scanner = new GitHubScanner(process.env.GITHUB_TOKEN);
const repoFindings = await scanner.scanRepository('owner', 'repo');

const reporter = new Reporter();
reporter.displayWarnings(findings);
```

## Limitations

- GitHub API has rate limits (60 requests/hour without token, 5000 with token)
- Large repositories may take time to scan completely
- Only scans common configuration files to avoid performance issues
- False positives may occur with test credentials or examples in code

## Security Considerations

- **Never commit this scanner to a public repository with real GitHub tokens**
- **Add `.env` to `.gitignore` to avoid committing credentials**
- **Clear terminal history** after using the scanner
- **Rotate any exposed credentials immediately**
- **Use this tool responsibly** - only scan your own repositories or those you have permission to scan

## Contributing

Contributions are welcome! Areas for improvement:
- Additional credential pattern detection
- Performance optimizations for large scans
- CSV export functionality
- Slack/email notifications
- Scheduled scanning automation

## License

MIT

## Disclaimer

This tool is provided as-is for security research and defensive purposes. Always obtain proper authorization before scanning repositories. The authors are not responsible for misuse or unauthorized access to systems or data.

## Support

For issues, questions, or suggestions, please create a GitHub issue or contact the maintainers.
