import { ChatGPTClient } from '../src/chatgpt-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('🔄 Testing API Key with Rate Limit Handling');
    console.log('='.repeat(50));

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.log('❌ No API key found in .env file');
        return;
    }

    const client = new ChatGPTClient();

    console.log(`🔑 Key type: ${client.getKeyType(apiKey)}`);
    console.log(`🔑 Key: ${client.maskApiKeyPublic(apiKey)}`);
    console.log('\n🎯 Attempt 1: Lightweight test (less likely to hit limits)...');

    // First try lightweight test
    const lightResult = await client.testApiKeyLight(apiKey);

    if (lightResult.isValid) {
        console.log('✅ Light test successful!');
        console.log(`📊 ${lightResult.response}`);
        await testChatFunctionality(apiKey);
        return;
    }

    console.log('🔄 Light test failed, trying standard test with retries...');
    console.log('💡 This will automatically retry if rate limited...\n');

    // Then try standard test with retries
    const result = await client.testApiKey(apiKey, 3);

    if (result.isValid) {
        console.log('\n🎉 SUCCESS! Your API key is working!');
        console.log(`🤖 Response: "${result.response}"`);
        console.log(`📊 Model: ${result.model}`);

        await testChatFunctionality(apiKey);
    } else {
        console.log('\n❌ API key test failed:');
        console.log(`   Error: ${result.error}`);

        if (result.error?.includes('rate limit')) {
            console.log('\n💡 Rate Limit Solutions:');
            console.log('1. Wait 1-2 minutes and try again');
            console.log('2. Use a different API key');
            console.log('3. Check your usage limits at https://platform.openai.com/usage');
            console.log('4. Upgrade your plan if needed');

            console.log('\n⏰ Waiting 10 seconds then trying lightweight test...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            const finalAttempt = await client.testApiKeyLight(apiKey);
            if (finalAttempt.isValid) {
                console.log('✅ Lightweight test now works!');
                console.log(`📊 ${finalAttempt.response}`);
            }
        }
    }
}

async function testChatFunctionality(apiKey: string) {
    console.log('\n💬 Testing Chat Functionality...');
    console.log('='.repeat(30));

    const client = new ChatGPTClient(apiKey);

    try {
        const response = await client.sendMessage(
            'Hello! Please respond with just "Chat test successful!"',
            { max_tokens: 10, temperature: 0.1 },
            2 // retries
        );

        console.log('✅ Chat test successful!');
        console.log(`🤖 ChatGPT: ${response}`);

        console.log('\n✨ Your API key is fully functional and ready to use!');
    } catch (error: any) {
        console.log(`❌ Chat test failed: ${error.message}`);
        console.log('💡 The key works, but we hit rate limits. Try again in a minute.');
    }
}

main().catch(console.error);