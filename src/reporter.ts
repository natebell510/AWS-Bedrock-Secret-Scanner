import { ReportEntry } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export class Reporter {
  displayFindings(findings: ReportEntry[]): void {
    if (findings.length === 0) {
      console.log(chalk.green('\n✅ No credentials found.'));
      return;
    }

    console.log(chalk.yellow(`\n📋 Found ${findings.length} credential(s)\n`));

    const groups: Record<string, ReportEntry[]> = { critical: [], high: [], medium: [] };
    findings.forEach(f => groups[f.severity].push(f));

    if (groups.critical.length > 0) {
      console.log(chalk.bgRed.white.bold(' CRITICAL '));
      groups.critical.forEach(e => this.displayEntry(e));
    }
    if (groups.high.length > 0) {
      console.log(chalk.bgYellow.black.bold(' HIGH '));
      groups.high.forEach(e => this.displayEntry(e));
    }
    if (groups.medium.length > 0) {
      console.log(chalk.bgBlue.white.bold(' MEDIUM '));
      groups.medium.forEach(e => this.displayEntry(e));
    }
  }

  private displayEntry(entry: ReportEntry): void {
    const location = entry.repo ? `${entry.repo}/${entry.file}` : entry.location;
    const line = entry.line ? `:${entry.line}` : '';
    console.log(chalk.white(`  ${entry.type}`));
    console.log(chalk.gray(`    Location: ${location}${line}`));
    console.log(chalk.gray(`    Value:    ${entry.maskedValue}`));
    console.log(chalk.gray(`    URL:      ${entry.url || 'N/A'}\n`));
  }

  exportToJSON(findings: ReportEntry[], filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const data = {
      timestamp: new Date().toISOString(),
      totalFindings: findings.length,
      byType: {
        ACCESS_KEY: findings.filter(f => f.type === 'ACCESS_KEY').length,
        SECRET_KEY: findings.filter(f => f.type === 'SECRET_KEY').length,
        BEDROCK_KEY: findings.filter(f => f.type === 'BEDROCK_KEY').length,
        MODEL: findings.filter(f => f.type === 'MODEL').length
      },
      findings: findings.map(f => ({
        type: f.type,
        severity: f.severity,
        value: f.value,
        maskedValue: f.maskedValue,
        location: f.location,
        repo: f.repo,
        file: f.file,
        line: f.line,
        url: f.url,
        timestamp: f.timestamp.toISOString()
      }))
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(chalk.green(`\n✅ Report saved to ${filePath}`));
  }
}
