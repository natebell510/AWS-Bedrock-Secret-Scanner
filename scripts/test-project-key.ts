import { ChatGPTClient } from '@/chatgpt-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('🚀 Testing OpenAI Project API Key');
    console.log('='.repeat(50));

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.log('❌ No API key found in .env file');
        console.log('\n💡 Please add your project key to .env:');
        console.log('OPENAI_API_KEY=sk-proj-...');
        return;
    }

    const client = new ChatGPTClient();

    console.log(`🔑 Key type: ${client.getKeyType(apiKey)}`);
    console.log(`🔑 Key: ${client.maskApiKeyPublic(apiKey)}`);
    console.log(`📏 Length: ${apiKey.length} characters`);
    console.log('\n⏳ Testing with OpenAI API...');

    try {
        const result = await client.testApiKey(apiKey);

        if (result.isValid) {
            console.log('\n🎉 SUCCESS! Your project API key is working!');
            console.log(`🤖 Response: "${result.response}"`);
            console.log(`📊 Model: ${result.model}`);

            // Test actual chat functionality
            console.log('\n💬 Testing advanced chat functionality...');
            const chatResponse = await client.sendMessage(
                'Hello! Please introduce yourself and tell me what you can help with.',
                { max_tokens: 100, temperature: 0.7 }
            );
            console.log(`✅ Chat response: ${chatResponse}`);

            console.log('\n✨ Your project key is fully functional!');
        } else {
            console.log('\n❌ API key test failed:');
            console.log(`   Error: ${result.error}`);

            console.log('\n🔧 Troubleshooting project keys:');
            console.log('• Ensure the project is active in OpenAI dashboard');
            console.log('• Check if you have usage credits');
            console.log('• Verify the key has not been revoked');
            console.log('• Check project permissions and limits');
        }
    } catch (error: any) {
        console.log('\n💥 Unexpected error:');
        console.log(`   ${error.message}`);
    }
}

main().catch(console.error);