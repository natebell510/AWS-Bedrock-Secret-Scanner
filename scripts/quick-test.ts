import { ChatGPTClient } from '../src/chatgpt-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('⚡ Quick API Key Test');
    console.log('='.repeat(40));

    const testKeys = [
        process.env.OPENAI_API_KEY,
        'sk-abcdef1234567890abcdef1234567890abcdef12',
        'sk-1234567890abcdef1234567890abcdef12345678',
    ].filter(Boolean) as string[];

    const client = new ChatGPTClient();

    for (const key of testKeys) {
        const formatResult = client.validateFormat(key);
        console.log(`\n🔑 Testing: ${client.maskApiKeyPublic(key)}`);
        console.log(`   Format: ${formatResult.isValid ? '✅ Valid' : '❌ Invalid'}`);

        if (!formatResult.isValid) {
            console.log(`   Issues: ${formatResult.issues.join(', ')}`);
            continue;
        }

        const testResult = await client.testApiKey(key);
        console.log(`   API Test: ${testResult.isValid ? '✅ Valid' : '❌ Invalid'}`);

        if (testResult.isValid) {
            console.log(`   Response: "${testResult.response}"`);
            if (testResult.model) {
                console.log(`   Model: ${testResult.model}`);
            }
        } else {
            console.log(`   Error: ${testResult.error}`);
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✨ Quick test completed!');
}

main().catch(console.error);