import { ReportEntry, AwsCredential } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export class Reporter {
  displayWarnings(findings: ReportEntry[]): void {
    if (findings.length === 0) {
      console.log(chalk.green('✅ No AWS credentials found!'));
      return;
    }

    console.log(chalk.red.bold('\n⚠️  AWS CREDENTIALS DETECTED\n'));
    console.log(chalk.yellow(`Found ${findings.length} potential security issue(s)\n`));

    const byCritical = findings.filter(f => f.severity === 'critical');
    const byHigh = findings.filter(f => f.severity === 'high');
    const byMedium = findings.filter(f => f.severity === 'medium');

    if (byCritical.length > 0) {
      console.log(chalk.bgRed.white.bold(' CRITICAL '));
      byCritical.forEach(entry => this.displayEntry(entry));
    }

    if (byHigh.length > 0) {
      console.log(chalk.bgYellow.black.bold(' HIGH '));
      byHigh.forEach(entry => this.displayEntry(entry));
    }

    if (byMedium.length > 0) {
      console.log(chalk.bgBlue.white.bold(' MEDIUM '));
      byMedium.forEach(entry => this.displayEntry(entry));
    }

    console.log(chalk.gray('\n' + '='.repeat(80) + '\n'));
    console.log(chalk.cyan.bold('REMEDIATION STEPS:'));
    console.log(chalk.cyan('1. Revoke the exposed AWS credentials immediately'));
    console.log(chalk.cyan('2. Create new credentials with the same permissions'));
    console.log(chalk.cyan('3. Remove the credentials from git history (use BFG or git-filter-branch)'));
    console.log(chalk.cyan('4. Force push the cleaned repository'));
    console.log(chalk.cyan('5. Enable GitHub secret scanning for automated detection'));
    console.log(chalk.cyan('6. Consider enabling AWS credential rotation policies\n'));
  }

  private displayEntry(entry: ReportEntry): void {
    const location = entry.repo ? `${entry.repo}/${entry.file}` : entry.location;
    const line = entry.line ? `:${entry.line}` : '';

    console.log(chalk.white(`  ${entry.type}`));
    console.log(chalk.gray(`    Location: ${location}${line}`));
    console.log(chalk.gray(`    Value:    ${entry.maskedValue}`));
    console.log(chalk.gray(`    URL:      ${entry.url || 'N/A'}`));
    console.log(chalk.gray(`    ${entry.recommendation}\n`));
  }

  exportToJSON(findings: ReportEntry[], filePath: string): void {
    const data = {
      timestamp: new Date().toISOString(),
      totalFindings: findings.length,
      bySeverity: {
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length
      },
      findings: findings.map(f => ({
        ...f,
        // Redact sensitive info from export
        maskedValue: f.maskedValue,
        timestamp: f.timestamp.toISOString()
      }))
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(chalk.green(`✅ Report exported to ${filePath}`));
  }

  exportToCSV(findings: ReportEntry[], filePath: string): void {
    const headers = ['Severity', 'Type', 'Masked Value', 'Location', 'Repo', 'File', 'Line', 'URL', 'Timestamp'];
    const rows = [headers.join(',')];

    for (const finding of findings) {
      const row = [
        finding.severity,
        finding.type,
        `"${finding.maskedValue}"`,
        finding.location,
        finding.repo || '',
        finding.file || '',
        finding.line || '',
        finding.url || '',
        finding.timestamp.toISOString()
      ];
      rows.push(row.join(','));
    }

    fs.writeFileSync(filePath, rows.join('\n'));
    console.log(chalk.green(`✅ CSV report exported to ${filePath}`));
  }

  generateConsoleReport(results: ReportEntry[]): string {
    let report = '\n' + '='.repeat(80) + '\n';
    report += 'AWS BEDROCK SECURITY SCAN REPORT\n';
    report += '='.repeat(80) + '\n\n';

    report += `Total Findings: ${results.length}\n`;
    report += `Critical: ${results.filter(r => r.severity === 'critical').length}\n`;
    report += `High: ${results.filter(r => r.severity === 'high').length}\n`;
    report += `Medium: ${results.filter(r => r.severity === 'medium').length}\n\n`;

    if (results.length > 0) {
      report += 'DETAILS:\n';
      report += '-'.repeat(80) + '\n';

      for (const entry of results) {
        report += `\n[${entry.severity.toUpperCase()}] ${entry.type}\n`;
        report += `  Location: ${entry.location}\n`;
        report += `  Masked: ${entry.maskedValue}\n`;
        report += `  Recommendation: ${entry.recommendation}\n`;
      }
    }

    report += '\n' + '='.repeat(80) + '\n';
    return report;
  }

  getSummary(findings: ReportEntry[]): string {
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const medium = findings.filter(f => f.severity === 'medium').length;

    return `Found ${findings.length} issues: ${critical} critical, ${high} high, ${medium} medium`;
  }
}
