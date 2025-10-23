import { ChatGPTClient } from '@/chatgpt-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function waitAndTest(apiKey: string, waitMinutes: number = 2) {
    console.log(`⏰ Waiting ${waitMinutes} minutes for rate limits to reset...`);

    for (let i = waitMinutes; i > 0; i--) {
        console.log(`   ${i} minute(s) remaining...`);
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
    }

    console.log('🔄 Now testing API key...');
    const client = new ChatGPTClient();
    const result = await client.testApiKey(apiKey);

    return result;
}

async function main() {
    console.log('⏰ Rate Limit Recovery Test');
    console.log('='.repeat(40));

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.log('❌ No API key in .env');
        return;
    }

    const client = new ChatGPTClient();

    // Immediate test
    console.log('🔑 Quick test...');
    const quickResult = await client.testApiKeyLight(apiKey);

    if (quickResult.isValid) {
        console.log('✅ Immediate test successful!');
        console.log(`📊 ${quickResult.response}`);
        return;
    }

    console.log('⏳ Rate limits detected, starting recovery process...\n');

    // Wait and retry
    const result = await waitAndTest(apiKey, 2);

    if (result.isValid) {
        console.log('\n🎉 SUCCESS! Rate limits have reset.');
        console.log(`🤖 Response: "${result.response}"`);
    } else {
        console.log('\n❌ Still hitting limits:');
        console.log(`   Error: ${result.error}`);
        console.log('\n💡 Try:');
        console.log('• Waiting longer (5-10 minutes)');
        console.log('• Checking your usage at https://platform.openai.com/usage');
        console.log('• Using a different API key');
    }
}

main().catch(console.error);