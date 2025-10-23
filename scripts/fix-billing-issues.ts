import { ChatGPTClient } from '../src/chatgpt-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('💰 OpenAI Billing & Quota Issues Fixer');
    console.log('='.repeat(50));

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.log('❌ No API key found in .env file');
        return;
    }

    const client = new ChatGPTClient();

    console.log('🔍 Diagnosing the issue...\n');

    // Test what works
    console.log('1. Testing API key validity...');
    const lightResult = await client.testApiKeyLight(apiKey);

    if (lightResult.isValid) {
        console.log('   ✅ API key is valid and can access OpenAI');
        console.log(`   📊 ${lightResult.response}`);
    } else {
        console.log('   ❌ API key issues detected');
        console.log(`   Error: ${lightResult.error}`);
        return;
    }

    console.log('\n2. Testing chat functionality...');
    try {
        const chatResult = await client.sendMessage('Test', { max_tokens: 5 }, 1);
        console.log('   ✅ Chat functionality works!');
        console.log(`   Response: ${chatResult}`);
    } catch (error: any) {
        console.log('   ❌ Chat functionality blocked');
        const errorMsg = error.message;
        console.log(`   Error: ${errorMsg}`);

        // Diagnose the specific issue
        if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
            await diagnoseBillingIssue(apiKey);
        } else if (errorMsg.includes('rate_limit')) {
            console.log('\n💡 This is a rate limit issue, not billing.');
            console.log('   Wait a few minutes and try again.');
        }
    }
}

async function diagnoseBillingIssue(apiKey: string) {
    console.log('\n🔧 DIAGNOSIS: Billing/Quota Issue Detected');
    console.log('='.repeat(40));

    console.log('\n📋 Possible Causes:');
    console.log('1. ❌ No billing method added');
    console.log('2. ❌ Free trial credits expired');
    console.log('3. ❌ Usage exceeded current limits');
    console.log('4. ❌ Organization spending limit reached');

    console.log('\n🚀 Solutions:');
    console.log('1. 💳 Add billing method:');
    console.log('   • Go to: https://platform.openai.com/account/billing/overview');
    console.log('   • Click "Set up paid account" or "Add billing"');
    console.log('   • Enter credit card details');

    console.log('\n2. 🔄 Check usage limits:');
    console.log('   • Visit: https://platform.openai.com/usage');
    console.log('   • Check if you have remaining credits');

    console.log('\n3. 🆕 Get free credits (if available):');
    console.log('   • New accounts often get $5-18 free credits');
    console.log('   • Check your usage page for available credits');

    console.log('\n4. 📞 Contact support:');
    console.log('   • If issues persist, contact OpenAI support');

    console.log('\n🎯 Recommended Action:');
    console.log('   1. Visit https://platform.openai.com/account/billing/overview');
    console.log('   2. Add a credit card to enable paid usage');
    console.log('   3. Set usage limits if desired');
    console.log('   4. Return here and test again');

    console.log('\n💡 After fixing billing, run: npm run test-chat');
}

main().catch(console.error);