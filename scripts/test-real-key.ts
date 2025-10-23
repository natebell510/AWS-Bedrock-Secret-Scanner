import { ChatGPTClient } from '@/chatgpt-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('🔐 Testing Real OpenAI API Key');
    console.log('='.repeat(50));

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'sk-your-real-api-key-here') {
        console.log('❌ No API key found in .env file');
        console.log('\n💡 Please:');
        console.log('1. Go to https://platform.openai.com/api-keys');
        console.log('2. Create a new API key');
        console.log('3. Add it to your .env file as OPENAI_API_KEY=your-key-here');
        return;
    }

    const client = new ChatGPTClient();

    console.log(`🔑 Testing key: ${client.maskApiKeyPublic(apiKey)}`);
    console.log('⏳ Making API call...\n');

    const result = await client.testApiKey(apiKey);

    if (result.isValid) {
        console.log('🎉 SUCCESS! Your API key is working!');
        console.log(`🤖 Response: "${result.response}"`);
        console.log(`📊 Model: ${result.model}`);

        // Test actual chat functionality
        console.log('\n💬 Testing chat functionality...');
        try {
            const chatResponse = await client.sendMessage(
                'Hello! Please respond with "Chat test successful!"',
                { max_tokens: 10, temperature: 0.1 }
            );
            console.log(`✅ Chat response: ${chatResponse}`);
        } catch (error: any) {
            console.log(`❌ Chat test failed: ${error.message}`);
        }
    } else {
        console.log('❌ API key test failed:');
        console.log(`   Error: ${result.error}`);

        console.log('\n🔧 Troubleshooting tips:');
        console.log('• Check if your API key is correct');
        console.log('• Verify your OpenAI account has credits');
        console.log('• Check if your account is verified');
        console.log('• Ensure you have API access enabled');
    }
}

main().catch(console.error);