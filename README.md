# AWS Bedrock Secret Scanner

A TypeScript tool that scans public GitHub repositories for exposed AWS credentials and Bedrock-related secrets, validates discovered key pairs against live AWS APIs, and generates structured JSON reports.

## What It Detects

| Type | Pattern | Severity |
|---|---|---|
| `ACCESS_KEY` | `AKIA[0-9A-Z]{16}` | Critical |
| `SECRET_KEY` | `AWS_SECRET_ACCESS_KEY = ...` | Critical |
| `BEDROCK_KEY` | `BEDROCK_API_KEY = ...` | High |
| `MODEL` | `anthropic.claude-*`, `bedrock_model = ...` | Medium |

## Key Validation

When an `ACCESS_KEY` + `SECRET_KEY` pair is found in the same file, the scanner automatically validates it:

- **ACCESS_KEY / SECRET_KEY** — calls AWS STS `GetCallerIdentity` (requires zero permissions). Returns account ID and ARN if the key pair is live.
- **BEDROCK_KEY** — calls Bedrock `ListFoundationModels`. An `AccessDeniedException` still means the key is active.

Validation result is included in both console output and the JSON report.

## Installation

```bash
npm install
npm run build
```

Create a `.env` file in the project root:

```env
GITHUB_TOKEN=ghp_your_personal_access_token
AWS_REGION=us-east-1
```

`GITHUB_TOKEN` is required for meaningful scan coverage (60 req/hr without it, 5000 with).

## Usage

### Scan all repos of a GitHub user
```bash
npm run scan:user -- username
```

### Scan all repos of a GitHub organization
```bash
npm run scan:org -- orgname
```

### Scan a specific repository
```bash
npm run scan:repo -- owner/repo
```

### Search GitHub by keyword
```bash
npm run scan:search -- "bedrock"
npm run scan:search -- "AKIA"
```

### Scan a local directory
```bash
npm run scan:local -- /path/to/dir
npm run scan:local -- .
```

## Output

### Console
Findings are grouped by severity with masked values and key validation status:

```
📋 Found 2 credential(s)

 CRITICAL
  ACCESS_KEY
    Location: usa-immigration/.env.example
    Value:    AKIAIOSFOD...MPLE
    URL:      https://github.com/owner/repo/blob/main/.env.example
    Key Status: ✗ ACTIVE
    Reason:   Active key pair — STS GetCallerIdentity succeeded
    Account:  123456789012
    ARN:      arn:aws:iam::123456789012:user/example
```

### JSON Report
Saved automatically to `reports/bedrock-scan-<target>-<date>.json`:

```json
{
  "timestamp": "2026-05-27T16:50:08.654Z",
  "totalFindings": 2,
  "byType": {
    "ACCESS_KEY": 1,
    "SECRET_KEY": 1,
    "BEDROCK_KEY": 0,
    "MODEL": 0
  },
  "findings": [
    {
      "type": "ACCESS_KEY",
      "severity": "critical",
      "value": "AKIAIOSFODNN7EXAMPLE",
      "maskedValue": "AKIAIOSFOD...MPLE",
      "location": ".env.example",
      "repo": "usa-immigration",
      "file": ".env.example",
      "url": "https://github.com/owner/repo/blob/main/.env.example",
      "keyValidation": {
        "valid": false,
        "reason": "Invalid or revoked access key"
      },
      "timestamp": "2026-05-27T16:50:08.653Z"
    }
  ]
}
```

## Project Structure

```
src/
├── index.ts                 — CLI entry point and command handlers
├── github-scanner.ts        — GitHub API scanning and repo traversal
├── aws-bedrock-detector.ts  — Regex-based credential detection
├── credential-validator.ts  — Live key validation via STS and Bedrock APIs
├── reporter.ts              — Console output and JSON report export
└── types.ts                 — Shared interfaces
reports/                     — Generated JSON reports (auto-created)
```

## Scanned Files Per Repository

`.env`, `.env.example`, `.env.local`, `config.json`, `config.yml`, `config.yaml`, `docker-compose.yml`, `docker-compose.yaml`, `Dockerfile`, `package.json`, `setup.py`, `requirements.txt`, `terraform.tfvars`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Recommended | GitHub personal access token (`public_repo`, `read:org` scopes) |
| `AWS_REGION` | Optional | AWS region for key validation (default: `us-east-1`) |

## Generating a GitHub Token

1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Add scopes: `public_repo`, `read:org`
4. Add to `.env`: `GITHUB_TOKEN=ghp_xxxxxxxxxxxx`

## License

MIT
