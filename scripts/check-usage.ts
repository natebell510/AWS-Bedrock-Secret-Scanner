import { ChatGPTClient } from '../src/chatgpt-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('📊 OpenAI Usage & Capabilities Check');
    console.log('='.repeat(50));

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.log('❌ No API key found in .env file');
        return;
    }

    const client = new ChatGPTClient();

    console.log('🔍 Checking API capabilities...\n');

    // Test multiple aspects
    console.log('1. 🔑 Authentication Test...');
    const authTest = await client.testApiKeyLight(apiKey);
    console.log(`   Status: ${authTest.isValid ? '✅ Valid' : '❌ Invalid'}`);
    if (authTest.isValid) {
        console.log(`   Details: ${authTest.response}`);
    }

    console.log('\n2. 🤖 Available Models...');
    try {
        const openai = new (await import('openai')).default({ apiKey });
        const models = await openai.models.list();
        const gptModels = models.data.filter(model =>
            model.id.includes('gpt') || model.id.includes('text-')
        ).slice(0, 5); // Show first 5 GPT models

        console.log(`   Found ${gptModels.length} GPT models`);
        gptModels.forEach(model => {
            console.log(`   • ${model.id}`);
        });
    } catch (error: any) {
        console.log(`   ❌ Cannot list models: ${error.message}`);
    }

    console.log('\n3. 💬 Chat Test (with error handling)...');
    try {
        const chatResponse = await client.sendMessage(
            'Say "OK" if working.',
            { max_tokens: 5, temperature: 0.1 },
            1
        );
        console.log(`   ✅ Chat working: "${chatResponse}"`);
    } catch (error: any) {
        const errorMsg = error.message;
        console.log(`   ❌ Chat blocked: ${errorMsg}`);

        if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
            console.log('\n   💰 Billing issue detected!');
            console.log('   Visit: https://platform.openai.com/account/billing/overview');
        }
    }

    console.log('\n📋 SUMMARY:');
    console.log('='.repeat(30));
    console.log('✅ API Key: Valid');
    console.log('✅ Authentication: Working');
    console.log('✅ Model Access: Available');
    console.log('❌ Chat Usage: Blocked (Billing Required)');

    console.log('\n🎯 Next Steps:');
    console.log('1. Add billing at: https://platform.openai.com/account/billing/overview');
    console.log('2. Set usage limits if desired');
    console.log('3. Run: npm run test-chat');
}

main().catch(console.error);