import { Octokit } from '@octokit/rest';
import { AwsBedrockDetector } from './aws-bedrock-detector.js';
import { GitHubSearchResult, ReportEntry } from './types.js';

export class GitHubScanner {
  private octokit: Octokit;
  private detector: AwsBedrockDetector;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN
    });
    this.detector = new AwsBedrockDetector();
  }

  async searchPublicRepos(query: string, language?: string): Promise<GitHubSearchResult[]> {
    const results: GitHubSearchResult[] = [];
    const searchQueries = [
      `${query} filename:.env`,
      `${query} filename:.yaml`,
      `${query} filename:.yml`,
      `${query} filename:.json`,
      `${query} filename:.ts`,
      `${query} filename:.js`,
      `${query} filename:.py`
    ];

    for (const searchQuery of searchQueries) {
      try {
        console.log(`🔍 Searching: ${searchQuery}`);
        const response = await this.retryWithBackoff(async () => {
          return this.octokit.search.code({
            q: searchQuery,
            sort: 'indexed',
            order: 'desc',
            per_page: 30
          });
        });

        for (const item of response.data.items || []) {
          const fileContent = await this.getFileContent(item.repository.owner.login, item.repository.name, item.path);
          if (fileContent) {
            const credentials = this.detector.detectInText(fileContent);
            if (credentials.length > 0) {
              const existing = results.find(
                r => r.repo.owner === item.repository.owner.login && r.repo.name === item.repository.name
              );

              if (existing) {
                existing.credentials.push(...credentials);
                existing.files.push({
                  path: item.path,
                  url: item.html_url,
                  credentials
                });
              } else {
                results.push({
                  repo: {
                    name: item.repository.name,
                    owner: item.repository.owner.login,
                    url: item.repository.html_url,
                    private: item.repository.private
                  },
                  files: [{
                    path: item.path,
                    url: item.html_url,
                    credentials
                  }],
                  credentials
                });
              }
            }
          }
        }
      } catch (error: any) {
        if (error.status === 422) {
          console.log(`⚠️  Search query too broad or invalid: ${searchQuery}`);
        } else if (error.status === 403) {
          console.error('❌ GitHub API rate limit exceeded. Please add GITHUB_TOKEN to .env');
          throw error;
        }
      }
    }

    return results;
  }

  async scanUserRepositories(username: string): Promise<GitHubSearchResult[]> {
    const results: GitHubSearchResult[] = [];

    try {
      console.log(`📦 Fetching repositories for ${username}...`);
      const repos = await this.retryWithBackoff(async () => {
        return this.octokit.repos.listForUser({
          username,
          type: 'owner',
          per_page: 100
        });
      });

      for (const repo of repos.data) {
        const scanResult = await this.scanRepository(username, repo.name);
        if (scanResult.files.length > 0 && scanResult.credentials.length > 0) {
          results.push(scanResult);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error scanning user ${username}:`, error.message);
    }

    return results;
  }

  async scanOrganizationRepositories(org: string): Promise<GitHubSearchResult[]> {
    const results: GitHubSearchResult[] = [];

    try {
      console.log(`🏢 Fetching repositories for organization ${org}...`);
      const repos = await this.retryWithBackoff(async () => {
        return this.octokit.repos.listForOrg({
          org,
          type: 'public',
          per_page: 100
        });
      });

      for (const repo of repos.data) {
        const scanResult = await this.scanRepository(org, repo.name);
        if (scanResult.files.length > 0 && scanResult.credentials.length > 0) {
          results.push(scanResult);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error scanning org ${org}:`, error.message);
    }

    return results;
  }

  async scanRepository(owner: string, repo: string): Promise<GitHubSearchResult> {
    const result: GitHubSearchResult = {
      repo: {
        name: repo,
        owner,
        url: `https://github.com/${owner}/${repo}`,
        private: false
      },
      files: [],
      credentials: []
    };

    try {
      // Scan common config files
      const filesToScan = [
        '.env', '.env.example', '.env.local',
        'config.json', 'config.yml', 'config.yaml',
        'docker-compose.yml', 'docker-compose.yaml',
        'Dockerfile', 'package.json', 'setup.py',
        'requirements.txt', 'terraform.tfvars'
      ];

      for (const file of filesToScan) {
        const content = await this.getFileContent(owner, repo, file);
        if (content) {
          const credentials = this.detector.detectInText(content);
          if (credentials.length > 0) {
            result.files.push({
              path: file,
              url: `https://github.com/${owner}/${repo}/blob/main/${file}`,
              credentials
            });
            result.credentials.push(...credentials);
          }
        }
      }
    } catch (error) {
      // Repository might not exist or be inaccessible
    }

    return result;
  }

  private async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const response = await this.retryWithBackoff(async () => {
        return this.octokit.repos.getContent({
          owner,
          repo,
          path
        });
      });

      if (Array.isArray(response.data)) {
        return null;
      }

      if ('content' in response.data) {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }

      return null;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 5): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
          const resetTime = parseInt(error.response.headers['x-ratelimit-reset'] || '0') * 1000;
          const waitTime = Math.max(resetTime - Date.now(), 1000);
          console.log(`⏳ Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (attempt < maxRetries && error.status && error.status >= 500) {
          const backoffTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Server error, retrying in ${backoffTime / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }

        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  convertToReportEntries(results: GitHubSearchResult[]): ReportEntry[] {
    const entries: ReportEntry[] = [];

    for (const result of results) {
      for (const file of result.files) {
        for (const credential of file.credentials) {
          entries.push({
            severity: this.getSeverity(credential.type),
            type: credential.type,
            value: credential.value,
            maskedValue: credential.maskedValue,
            location: file.path,
            owner: result.repo.owner,
            repo: result.repo.name,
            file: file.path,
            url: file.url,
            timestamp: new Date()
          });
        }
      }
    }

    return entries;
  }

  private getSeverity(type: string): 'critical' | 'high' | 'medium' {
    if (type === 'SECRET_KEY' || type === 'ACCESS_KEY') return 'critical';
    if (type === 'BEDROCK_KEY') return 'high';
    return 'medium';
  }
}
