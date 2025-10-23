export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatCompletionOptions {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

export interface ApiKeyTestResult {
    apiKey: string;
    maskedKey: string;
    isValid: boolean;
    error?: string;
    response?: string;
    model?: string;
}

export interface ValidationResult {
    isValid: boolean;  // Changed from isValidFormat to match implementation
    issues: string[];
}