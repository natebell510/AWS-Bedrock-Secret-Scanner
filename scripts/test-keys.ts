import { ChatGPTClient } from '../src/chatgpt-client';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Sample API keys for testing (these are example patterns)
const SAMPLE_KEYS = [
    'sk-abcdef1234567890abcdef1234567890abcdef12',
    'sk-1234567890abcdef1234567890abcdef12345678',
    'sk-abcdefabcdefabcdefabcdefabcdefabcdef12',
    'sk-7890abcdef7890abcdef7890abcdef7890abcd',
    'sk-1234abcd1234abcd1234abcd1234abcd1234abcd',
    'sk-abcd1234abcd1234abcd1234abcd1234abcd1234',
    'sk-5678efgh5678efgh5678efgh5678efgh5678efgh',
    'sk-efgh5678efgh5678efgh5678efgh5678efgh5678',
    'sk-ijkl1234ijkl1234ijkl1234ijkl1234ijkl1234',
    'sk-mnop5678mnop5678mnop5678mnop5678mnop5678',
    'sk-qrst1234qrst1234qrst1234qrst1234qrst1234',
    'sk-uvwx5678uvwx5678uvwx5678uvwx5678uvwx5678',
    'sk-1234ijkl1234ijkl1234ijkl1234ijkl1234ijkl',
    'sk-5678mnop5678mnop5678mnop5678mnop5678mnop',
    'sk-qrst5678qrst5678qrst5678qrst5678qrst5678',
    'sk-uvwx1234uvwx1234uvwx1234uvwx1234uvwx1234',
    'sk-1234abcd5678efgh1234abcd5678efgh1234abcd',
    'sk-5678ijkl1234mnop5678ijkl1234mnop5678ijkl',
    'sk-abcdqrstefghuvwxabcdqrstefghuvwxabcdqrst',
    'sk-ijklmnop1234qrstijklmnop1234qrstijklmnop',
    'sk-1234uvwx5678abcd1234uvwx5678abcd1234uvwx',
    'sk-efghijkl5678mnopabcd1234efghijkl5678mnop',
    'sk-mnopqrstuvwxabcdmnopqrstuvwxabcdmnopqrst',
    'sk-ijklmnopqrstuvwxijklmnopqrstuvwxijklmnop',
    'sk-abcd1234efgh5678abcd1234efgh5678abcd1234',
    'sk-1234ijklmnop5678ijklmnop1234ijklmnop5678',
    'sk-qrstefghuvwxabcdqrstefghuvwxabcdqrstefgh',
    'sk-uvwxijklmnop1234uvwxijklmnop1234uvwxijkl',
    'sk-abcd5678efgh1234abcd5678efgh1234abcd5678',
    'sk-1234qrstuvwxabcd1234qrstuvwxabcd1234qrst',
    'sk-efghijklmnop5678efghijklmnop5678efghijkl',
    'sk-mnopabcd1234efghmnopabcd1234efghmnopabcd',
    'sk-ijklqrst5678uvwxijklqrst5678uvwxijklqrst',
    'sk-1234ijkl5678mnop1234ijkl5678mnop1234ijkl',
    'sk-abcdqrstefgh5678abcdqrstefgh5678abcdqrst',
    'sk-ijklmnopuvwx1234ijklmnopuvwx1234ijklmnop',
    'sk-efgh5678abcd1234efgh5678abcd1234efgh5678',
    'sk-mnopqrstijkl5678mnopqrstijkl5678mnopqrst',
    'sk-1234uvwxabcd5678uvwxabcd1234uvwxabcd5678',
    'sk-ijklmnop5678efghijklmnop5678efghijklmnop',
    'sk-abcd1234qrstuvwxabcd1234qrstuvwxabcd1234',
    'sk-1234efgh5678ijkl1234efgh5678ijkl1234efgh',
    'sk-5678mnopqrstuvwx5678mnopqrstuvwx5678mnop',
    'sk-abcdijkl1234uvwxabcdijkl1234uvwxabcdijkl',
    'sk-ijklmnopabcd5678ijklmnopabcd5678ijklmnop',
    'sk-1234efghqrstuvwx1234efghqrstuvwx1234efgh',
    'sk-5678ijklmnopabcd5678ijklmnopabcd5678ijkl',
    'sk-abcd1234efgh5678abcd1234efgh5678abcd1234',
    'sk-ijklmnopqrstuvwxijklmnopqrstuvwxijklmnop'
];

function getUserKeys(): string[] {
    const envKey = process.env.OPENAI_API_KEY;
    const keys: string[] = [];

    // Add key from .env if exists
    if (envKey && envKey !== 'sk-your-actual-api-key-here') {
        keys.push(envKey);
    }

    // Add other environment keys
    for (let i = 1; i <= 5; i++) {
        const key = process.env[`API_KEY_${i}`];
        if (key) keys.push(key);
    }

    return keys;
}

async function main() {
    console.log('🔍 ChatGPT API Key Tester');
    console.log('='.repeat(50));

    const client = new ChatGPTClient();
    let keysToTest: string[] = [];

    // Ask user what keys to test
    console.log('\nChoose keys to test:');
    console.log('1. Test keys from .env file');
    console.log('2. Test sample keys (example patterns)');
    console.log('3. Enter keys manually');
    console.log('4. Test all (env + samples)');

    const choice = await new Promise<string>((resolve) => {
        rl.question('\nEnter your choice (1-4): ', resolve);
    });

    switch (choice) {
        case '1':
            keysToTest = getUserKeys();
            break;
        case '2':
            keysToTest = SAMPLE_KEYS;
            break;
        case '3':
            const manualKeys = await new Promise<string>((resolve) => {
                rl.question('Enter API keys (comma-separated): ', resolve);
            });
            keysToTest = manualKeys.split(',').map(k => k.trim()).filter(k => k);
            break;
        case '4':
            keysToTest = [...getUserKeys(), ...SAMPLE_KEYS];
            break;
        default:
            console.log('Invalid choice. Testing keys from .env file.');
            keysToTest = getUserKeys();
    }

    if (keysToTest.length === 0) {
        console.log('\n❌ No keys to test. Please add keys to your .env file.');
        rl.close();
        return;
    }

    console.log(`\n🧪 Testing ${keysToTest.length} API keys...`);
    console.log('='.repeat(50));

    let validCount = 0;

    const results = await client.testMultipleApiKeys(keysToTest, (current, total, result) => {
        const status = result.isValid ? '✅' : '❌';
        console.log(`[${current}/${total}] ${status} ${result.maskedKey}`);

        if (result.isValid) {
            validCount++;
            if (result.response) {
                console.log(`     Response: "${result.response}"`);
            }
        } else {
            console.log(`     Error: ${result.error}`);
        }
    });

    // Summary
    console.log('\n📊 === TEST SUMMARY ===');
    console.log('='.repeat(50));
    console.log(`Total keys tested: ${results.length}`);
    console.log(`✅ Valid keys: ${validCount}`);
    console.log(`❌ Invalid keys: ${results.length - validCount}`);

    // Show valid keys
    const validKeys = results.filter(r => r.isValid);
    if (validKeys.length > 0) {
        console.log('\n🎉 VALID API KEYS:');
        validKeys.forEach((result, index) => {
            console.log(`${index + 1}. ${result.maskedKey}`);
            if (result.model) {
                console.log(`   Model: ${result.model}`);
            }
        });

        // Ask if user wants to test chat functionality
        console.log('\n');
        const testChat = await new Promise<string>((resolve) => {
            rl.question('Would you like to test chat functionality with a valid key? (y/n): ', resolve);
        });

        if (testChat.toLowerCase() === 'y') {
            const firstValidKey = validKeys[0];
            const originalKey = keysToTest.find(k =>
                k.startsWith(firstValidKey.maskedKey.substring(0, 7))
            );

            if (originalKey) {
                await testChatFunctionality(originalKey);
            }
        }
    } else {
        console.log('\n😞 No valid API keys found.');
        console.log('Please check:');
        console.log('• API key format (should start with "sk-" and be 51 characters)');
        console.log('• API key validity in OpenAI dashboard');
        console.log('• Account quota and billing status');
    }

    rl.close();
}

async function testChatFunctionality(apiKey: string) {
    console.log('\n🤖 Testing Chat Functionality...');
    console.log('='.repeat(50));

    const client = new ChatGPTClient(apiKey);

    try {
        const response = await client.sendMessage(
            'Hello! Please respond with "Chat test successful!" if you can read this.',
            { max_tokens: 10, temperature: 0.1 }
        );

        console.log('✅ Chat test successful!');
        console.log(`Response: ${response}`);
    } catch (error: any) {
        console.log('❌ Chat test failed:');
        console.log(`Error: ${error.message}`);
    }
}

// Run the application
main().catch(console.error);