import { ChatGPTClient } from '@/chatgpt-client';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function validateAndTestKey(apiKey: string) {
    const client = new ChatGPTClient();

    console.log('\n🔍 Validating key format...');
    const formatResult = client.validateFormat(apiKey);

    if (!formatResult.isValid) {
        console.log('❌ Format validation failed:');
        formatResult.issues.forEach(issue => console.log(`   - ${issue}`));
        return false;
    }

    console.log('✅ Key format is valid');
    console.log('⏳ Testing with OpenAI API...');

    const testResult = await client.testApiKey(apiKey);

    if (testResult.isValid) {
        console.log('🎉 API key is working!');
        console.log(`🤖 Response: "${testResult.response}"`);
        console.log(`📊 Model: ${testResult.model}`);
        return true;
    } else {
        console.log('❌ API test failed:');
        console.log(`   Error: ${testResult.error}`);
        return false;
    }
}

async function main() {
    console.log('🔐 OpenAI API Key Validator');
    console.log('='.repeat(50));

    let apiKey = process.env.OPENAI_API_KEY;

    // If no key in .env or it's the placeholder, ask for one
    if (!apiKey || apiKey === 'sk-your-real-api-key-here') {
        console.log('\nNo API key found in .env file.');
        apiKey = await new Promise<string>((resolve) => {
            rl.question('🔑 Please enter your OpenAI API key: ', resolve);
        });
    } else {
        console.log(`\nUsing key from .env: ${apiKey.substring(0, 10)}...`);
    }

    if (!apiKey.trim()) {
        console.log('❌ No API key provided.');
        rl.close();
        return;
    }

    const isValid = await validateAndTestKey(apiKey.trim());

    if (isValid) {
        console.log('\n💡 You can now add this key to your .env file:');
        console.log(`OPENAI_API_KEY=${apiKey.trim()}`);

        // Ask if user wants to test chat
        const testChat = await new Promise<string>((resolve) => {
            rl.question('\n🤖 Would you like to test chat functionality? (y/n): ', resolve);
        });

        if (testChat.toLowerCase() === 'y') {
            await testChatFunctionality(apiKey.trim());
        }
    }

    rl.close();
}

async function testChatFunctionality(apiKey: string) {
    console.log('\n💬 Testing Chat Functionality...');
    console.log('='.repeat(30));

    const client = new ChatGPTClient(apiKey);

    try {
        const response = await client.sendMessage(
            'Hello! Please introduce yourself briefly.',
            { max_tokens: 100 }
        );

        console.log('✅ Chat test successful!');
        console.log(`\n🤖 ChatGPT: ${response}`);
    } catch (error: any) {
        console.log(`❌ Chat test failed: ${error.message}`);
    }
}

main().catch(console.error);