import { ChatGPTClient } from './chatgpt-client';
import * as dotenv from 'dotenv';

dotenv.config();

// Main entry point
async function main() {
    console.log('🚀 ChatGPT API Tester - Main Application');
    console.log('Run specific scripts for different functionalities:');
    console.log('');
    console.log('npm run test-keys    - Test API keys');
    console.log('npm run test-chat    - Test chat functionality');
    console.log('npm run quick-test   - Quick API key validation');
    console.log('');
}

main().catch(console.error);