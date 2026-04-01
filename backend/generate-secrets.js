const crypto = require('crypto');

console.log('\n🔐 GENERATING PRODUCTION SECRETS\n');
console.log('=' .repeat(60));

// Generate JWT Secret (64 bytes = 128 hex characters)
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('\n1. JWT_SECRET (copy this):');
console.log(jwtSecret);

// Generate JWT Refresh Secret (64 bytes = 128 hex characters)
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
console.log('\n2. JWT_REFRESH_SECRET (copy this):');
console.log(jwtRefreshSecret);

// Generate Razorpay Webhook Secret (32 bytes = 64 hex characters)
const webhookSecret = crypto.randomBytes(32).toString('hex');
console.log('\n3. RAZORPAY_WEBHOOK_SECRET (copy this):');
console.log(webhookSecret);

console.log('\n' + '='.repeat(60));
console.log('\n✅ Secrets generated successfully!');
console.log('\n📋 Copy these to your Render environment variables\n');
