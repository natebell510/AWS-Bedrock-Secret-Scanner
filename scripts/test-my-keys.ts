import { ChatGPTClient } from '../src/chatgpt-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('🔑 Testing Your API Keys');
    console.log('='.repeat(5));

    // Your specific API keys from the original list
    const yourApiKeys = [
        'sk-abcdef1234567890abcdef1234567890abcdef12',
        'sk-1234567890abcdef1234567890abcdef12345678',
        'sk-abcdefabcdefabcdefabcdefabcdefabcdef12',
        'sk-7890abcdef7890abcdef7890abcdef7890abcd',
        'sk-1234abcd1234abcd1234abcd1234abcd1234abcd',
        'sk-abcd1234abcd1234abcd1234abcd1234abcd1234',
        'sk-5678efgh5678efgh5678efgh5678efgh5678efgh',
        'sk-efgh5678efgh5678efgh5678efgh5678efgh5678',
        // Add more of your keys as needed
    ];

    const client = new ChatGPTClient();

    console.log(`🧪 Testing ${yourApiKeys.length} API keys...\n`);

    const results = await client.testMultipleApiKeys(yourApiKeys);

    console.log('\n📊 === RESULTS ===');
    console.log('='.repeat(50));

    let validCount = 0;
    results.forEach((result, index) => {
        const status = result.isValid ? '✅ VALID' : '❌ INVALID';
        console.log(`${index + 1}. ${result.maskedKey} - ${status}`);

        if (result.isValid) {
            validCount++;
            console.log(`   Response: "${result.response}"`);
            if (result.model) {
                console.log(`   Model: ${result.model}`);
            }
        } else {
            console.log(`   Error: ${result.error}`);
        }
        console.log('');
    });

    console.log('='.repeat(50));
    console.log(`🎯 Summary: ${validCount} valid out of ${yourApiKeys.length} keys`);

    if (validCount > 0) {
        console.log('\n💡 Tip: Copy a valid key to your .env file as OPENAI_API_KEY');
    } else {
        console.log('\n💡 All keys appear to be test patterns. You need real OpenAI API keys.');
        console.log('   Get one from: https://platform.openai.com/api-keys');
    }
}

main().catch(console.error);