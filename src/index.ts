import * as dotenv from 'dotenv';
import { AwsBedrockDetector } from './aws-bedrock-detector.js';
import { GitHubScanner } from './github-scanner.js';
import { Reporter } from './reporter.js';
import { ReportEntry } from './types.js';

dotenv.config();

const detector = new AwsBedrockDetector();
const reporter = new Reporter();
const scanner = new GitHubScanner();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showUsage();
    return;
  }

  try {
    switch (command) {
      case 'search':
        await handleSearch(args.slice(1));
        break;
      case 'scan-user':
        await handleScanUser(args.slice(1));
        break;
      case 'scan-org':
        await handleScanOrg(args.slice(1));
        break;
      case 'scan-repo':
        await handleScanRepo(args.slice(1));
        break;
      case 'scan-local':
        await handleScanLocal(args.slice(1));
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        showUsage();
        process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function handleSearch(args: string[]) {
  if (args.length === 0) {
    console.error('❌ Please provide a search query');
    console.log('Usage: npm run scan:search -- "bedrock" or "AKIA"');
    process.exit(1);
  }

  const query = args.join(' ');
  console.log(`🔍 Searching GitHub for: "${query}"`);
  console.log('This may take a few minutes...\n');

  const results = await scanner.searchPublicRepos(query);
  const entries = scanner.convertToReportEntries(results);

  reporter.displayWarnings(entries);

  if (entries.length > 0) {
    const timestamp = new Date().toISOString().split('T')[0];
    reporter.exportToJSON(entries, `bedrock-scan-${timestamp}.json`);
  }
}

async function handleScanUser(args: string[]) {
  if (args.length === 0) {
    console.error('❌ Please provide a GitHub username');
    console.log('Usage: npm run scan:user -- username');
    process.exit(1);
  }

  const username = args[0];
  console.log(`👤 Scanning repositories for user: ${username}`);
  console.log('This may take a few minutes...\n');

  const results = await scanner.scanUserRepositories(username);
  const entries = scanner.convertToReportEntries(results);

  console.log(`\n📊 Scanned ${results.length} repositories`);
  reporter.displayWarnings(entries);

  if (entries.length > 0) {
    const timestamp = new Date().toISOString().split('T')[0];
    reporter.exportToJSON(entries, `bedrock-scan-${username}-${timestamp}.json`);
  }
}

async function handleScanOrg(args: string[]) {
  if (args.length === 0) {
    console.error('❌ Please provide an organization name');
    console.log('Usage: npm run scan:org -- orgname');
    process.exit(1);
  }

  const org = args[0];
  console.log(`🏢 Scanning repositories for organization: ${org}`);
  console.log('This may take a few minutes...\n');

  const results = await scanner.scanOrganizationRepositories(org);
  const entries = scanner.convertToReportEntries(results);

  console.log(`\n📊 Scanned ${results.length} repositories`);
  reporter.displayWarnings(entries);

  if (entries.length > 0) {
    const timestamp = new Date().toISOString().split('T')[0];
    reporter.exportToJSON(entries, `bedrock-scan-${org}-${timestamp}.json`);
  }
}

async function handleScanRepo(args: string[]) {
  if (args.length === 0) {
    console.error('❌ Please provide a repository (owner/repo)');
    console.log('Usage: npm run scan:repo -- owner/repo');
    process.exit(1);
  }

  const [owner, repo] = args[0].split('/');
  if (!owner || !repo) {
    console.error('❌ Invalid repository format. Use: owner/repo');
    process.exit(1);
  }

  console.log(`📦 Scanning repository: ${owner}/${repo}\n`);

  const result = await scanner.scanRepository(owner, repo);
  const entries = scanner.convertToReportEntries([result]);

  reporter.displayWarnings(entries);

  if (entries.length > 0) {
    const timestamp = new Date().toISOString().split('T')[0];
    reporter.exportToJSON(entries, `bedrock-scan-${owner}-${repo}-${timestamp}.json`);
  }
}

async function handleScanLocal(args: string[]) {
  const path = args[0] || '.';
  console.log(`📁 Scanning local directory: ${path}\n`);

  const results = detector.detectInDirectory(path);
  const entries: ReportEntry[] = results.map(result => ({
    severity: result.credentials.length > 0 ? 'critical' : 'medium',
    type: result.credentials[0]?.type || 'UNKNOWN',
    maskedValue: result.credentials[0]?.maskedValue || 'N/A',
    location: result.location,
    recommendation: 'Remove credential and commit to git history cleanup',
    timestamp: new Date()
  }));

  reporter.displayWarnings(entries);

  if (entries.length > 0) {
    const timestamp = new Date().toISOString().split('T')[0];
    reporter.exportToJSON(entries, `bedrock-scan-local-${timestamp}.json`);
  }
}

function showUsage() {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║         AWS Bedrock Secret Scanner - GitHub Credential Detector    ║
╚════════════════════════════════════════════════════════════════════╝

Usage: npm run <command> -- [options]

COMMANDS:

  scan:search <query>     Search GitHub for exposed credentials
                         Example: npm run scan:search -- "bedrock"
                         Example: npm run scan:search -- "AKIA"

  scan:user <username>    Scan all public repos of a GitHub user
                         Example: npm run scan:user -- torvalds

  scan:org <org>         Scan all public repos of a GitHub org
                         Example: npm run scan:org -- aws

  scan:repo <owner/repo> Scan a specific GitHub repository
                         Example: npm run scan:repo -- owner/repo

  scan:local [path]      Scan local directory for exposed credentials
                         Example: npm run scan:local -- ./src

SETUP:

  1. Create .env file with GitHub token (optional but recommended):
     GITHUB_TOKEN=your_github_personal_access_token
     AWS_REGION=us-east-1

  2. Install dependencies:
     npm install

  3. Build TypeScript:
     npm run build

  4. Run a scan:
     npm run scan:search -- "bedrock"

CREDENTIALS DETECTED:

  ✓ AWS Access Keys (AKIA...)
  ✓ AWS Secret Access Keys
  ✓ Bedrock API Keys
  ✓ Bedrock Model Identifiers

OUTPUT:

  - Console warnings with severity levels
  - JSON report file with all findings
  - Remediation guidance

ENVIRONMENT VARIABLES:

  GITHUB_TOKEN     GitHub personal access token (for higher rate limits)
  AWS_REGION       AWS region (default: us-east-1)
  SCAN_SEVERITY    Minimum severity to report (critical, high, medium)

For more information, visit: https://github.com/your-repo
  `);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
