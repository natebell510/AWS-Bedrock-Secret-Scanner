import { ChatGPTClient } from '../src/chatgpt-client';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    console.log('🤖 ChatGPT Chat Tester');
    console.log('='.repeat(50));

    // Get API key
    let apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'sk-your-actual-api-key-here') {
        console.log('No valid API key found in .env file.');
        apiKey = await new Promise<string>((resolve) => {
            rl.question('Please enter your OpenAI API key: ', resolve);
        });
    }

    if (!apiKey) {
        console.log('❌ No API key provided.');
        rl.close();
        return;
    }

    const client = new ChatGPTClient(apiKey);

    // Test the key first
    console.log('\n🔑 Testing API key...');
    const testResult = await client.testApiKey(apiKey);

    if (!testResult.isValid) {
        console.log(`❌ API key is invalid: ${testResult.error}`);
        rl.close();
        return;
    }

    console.log('✅ API key is valid!');
    console.log(`🤖 Model: ${testResult.model}`);
    console.log('\n💬 Starting chat session...');
    console.log('Type "quit", "exit", or press Ctrl+C to end the session.');
    console.log('='.repeat(5));

    const conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];

    while (true) {
        const userMessage = await new Promise<string>((resolve) => {
            rl.question('\nYou: ', resolve);
        });

        if (['quit', 'exit', 'bye'].includes(userMessage.toLowerCase())) {
            break;
        }

        if (!userMessage.trim()) {
            continue;
        }

        try {
            console.log('🤖 ChatGPT is thinking...');

            const messages = [
                ...conversationHistory,
                { role: 'user' as const, content: userMessage }
            ];

            const response = await client.sendConversation(messages);
            console.log(`🤖 ChatGPT: ${response}`);

            // Update conversation history (keep last 10 messages to manage token usage)
            conversationHistory.push(
                { role: 'user', content: userMessage },
                { role: 'assistant', content: response }
            );

            if (conversationHistory.length > 10) {
                conversationHistory.splice(0, 2);
            }

        } catch (error: any) {
            console.log(`❌ Error: ${error.message}`);
        }
    }

    console.log('\n👋 Chat session ended. Goodbye!');
    rl.close();
}

main().catch(console.error);