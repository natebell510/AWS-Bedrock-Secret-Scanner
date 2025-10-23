import OpenAI from 'openai';
import {
    ChatMessage,
    ChatCompletionOptions,
    ApiKeyTestResult,
    ValidationResult
} from './types';

export class ChatGPTClient {
    private openai: OpenAI | null = null;
    private currentApiKey: string = '';

    constructor(apiKey?: string) {
        if (apiKey) {
            this.initializeClient(apiKey);
        }
    }

    /**
     * Initialize the OpenAI client with an API key
     */
    initializeClient(apiKey: string): void {
        this.currentApiKey = apiKey;
        this.openai = new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: false
        });
    }

    /**
     * Validate API key format - supports all OpenAI key formats
     */
    validateFormat(apiKey: string): ValidationResult {
        const issues: string[] = [];

        if (!apiKey) {
            issues.push('API key is empty');
            return { isValid: false, issues };
        }

        // Check for valid prefixes
        const validPrefixes = ['sk-', 'sk-proj-'];
        const hasValidPrefix = validPrefixes.some(prefix => apiKey.startsWith(prefix));

        if (!hasValidPrefix) {
            issues.push(`Invalid prefix (should start with ${validPrefixes.join(' or ')})`);
            return { isValid: false, issues };
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    /**
     * Test if an API key is valid with retry logic for rate limits
     */
    async testApiKey(apiKey: string, retries: number = 3): Promise<ApiKeyTestResult> {
        const formatValidation = this.validateFormat(apiKey);

        if (!formatValidation.isValid) {
            return {
                apiKey,
                maskedKey: this.maskApiKey(apiKey),
                isValid: false,
                error: `Invalid format: ${formatValidation.issues.join(', ')}`
            };
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const testClient = new OpenAI({ apiKey });

                const response = await testClient.chat.completions.create({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'Say "OK" only.' }],
                    max_tokens: 5,
                    temperature: 0.1
                });

                const content = response.choices[0]?.message?.content?.trim();

                return {
                    apiKey,
                    maskedKey: this.maskApiKey(apiKey),
                    isValid: true,
                    response: content || 'No response',
                    model: response.model
                };
            } catch (error: any) {
                const errorMessage = error.message || 'Unknown error';

                // Check if it's a rate limit error and we should retry
                if (errorMessage.includes('rate_limit_exceeded') && attempt < retries) {
                    const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
                    console.log(`⏳ Rate limit hit, waiting ${waitTime/1000}s before retry (${attempt}/${retries})...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }

                let friendlyErrorMessage = errorMessage;

                if (errorMessage.includes('rate_limit_exceeded')) {
                    friendlyErrorMessage = 'Rate limit exceeded - try again in a few minutes';
                } else if (errorMessage.includes('401') || errorMessage.includes('invalid_api_key')) {
                    friendlyErrorMessage = 'Invalid API key';
                } else if (errorMessage.includes('429')) {
                    friendlyErrorMessage = 'Too many requests - rate limited';
                } else if (errorMessage.includes('insufficient_quota')) {
                    friendlyErrorMessage = 'Insufficient quota - add billing details';
                } else if (errorMessage.includes('billing')) {
                    friendlyErrorMessage = 'Billing issue - check your OpenAI account';
                }

                return {
                    apiKey,
                    maskedKey: this.maskApiKey(apiKey),
                    isValid: false,
                    error: friendlyErrorMessage
                };
            }
        }

        return {
            apiKey,
            maskedKey: this.maskApiKey(apiKey),
            isValid: false,
            error: 'All retry attempts failed'
        };
    }

    /**
     * Simple test that avoids rate limits by using a cheaper endpoint
     */
    async testApiKeyLight(apiKey: string): Promise<ApiKeyTestResult> {
        try {
            const testClient = new OpenAI({ apiKey });

            // Use models list endpoint which is cheaper and less likely to be rate limited
            const models = await testClient.models.list();

            return {
                apiKey,
                maskedKey: this.maskApiKey(apiKey),
                isValid: true,
                response: `Can access ${models.data.length} models`,
                model: 'API Access Verified'
            };
        } catch (error: any) {
            return await this.testApiKey(apiKey, 1); // Fall back to normal test with 1 retry
        }
    }

    /**
     * Send a message to ChatGPT with rate limit handling
     */
    async sendMessage(
        message: string,
        options: ChatCompletionOptions = {},
        retries: number = 2
    ): Promise<string> {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized. Call initializeClient first.');
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const completion = await this.openai.chat.completions.create({
                    model: options.model || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: message }],
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.max_tokens ?? 500,
                });

                return completion.choices[0]?.message?.content || 'No response received';
            } catch (error: any) {
                if (error.message.includes('rate_limit_exceeded') && attempt < retries) {
                    const waitTime = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Rate limit hit, waiting ${waitTime/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                throw new Error(`API call failed: ${error.message}`);
            }
        }

        throw new Error('All retry attempts failed due to rate limiting');
    }

    /**
     * Send multiple messages in a conversation
     */
    async sendConversation(
        messages: ChatMessage[],
        options: ChatCompletionOptions = {}
    ): Promise<string> {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized. Call initializeClient first.');
        }

        try {
            const completion = await this.openai.chat.completions.create({
                model: options.model || 'gpt-3.5-turbo',
                messages: messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 500,
            });

            return completion.choices[0]?.message?.content || 'No response received';
        } catch (error: any) {
            throw new Error(`API call failed: ${error.message}`);
        }
    }

    /**
     * Mask API key for safe display
     */
    private maskApiKey(apiKey: string): string {
        if (apiKey.length <= 12) return '***';
        return `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`;
    }

    /**
     * Public method to mask API key (for use in other files)
     */
    public maskApiKeyPublic(apiKey: string): string {
        return this.maskApiKey(apiKey);
    }

    /**
     * Get key type for debugging
     */
    public getKeyType(apiKey: string): string {
        if (apiKey.startsWith('sk-proj-')) {
            return 'Project Key';
        } else if (apiKey.startsWith('sk-')) {
            return 'Personal Key';
        } else {
            return 'Unknown';
        }
    }
}