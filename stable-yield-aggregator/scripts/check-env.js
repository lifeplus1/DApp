require('dotenv').config();

console.log('🔍 Environment Configuration Check');
console.log('================================');
console.log('PRIVATE_KEY configured:', !!process.env.PRIVATE_KEY);
console.log('MAINNET_RPC_URL configured:', !!process.env.MAINNET_RPC_URL);
console.log('ETHERSCAN_API_KEY configured:', !!process.env.ETHERSCAN_API_KEY);

if (process.env.MAINNET_RPC_URL) {
    console.log('Mainnet RPC URL:', process.env.MAINNET_RPC_URL.substring(0, 30) + '...');
}

const ready = process.env.PRIVATE_KEY && process.env.MAINNET_RPC_URL;
console.log('\n🚀 Deployment Ready:', ready ? '✅ YES' : '❌ NO');

if (!ready) {
    console.log('\n⚠️  Missing required environment variables:');
    if (!process.env.PRIVATE_KEY) console.log('- PRIVATE_KEY');
    if (!process.env.MAINNET_RPC_URL) console.log('- MAINNET_RPC_URL');
    console.log('\nPlease configure these in your .env file before deployment.');
}
