// Run this ONCE to create your sandbox API user and API key.
// After running, copy the printed API_USER and API_KEY values into backend/.env
//
// Usage:
//   MOMO_SUBSCRIPTION_KEY=your_key_here node scripts/create-momo-sandbox-user.js

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://sandbox.momodeveloper.mtn.com';
const SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY;

async function main() {
  if (!SUBSCRIPTION_KEY) {
    console.error('Set MOMO_SUBSCRIPTION_KEY as an environment variable first. Example:');
    console.error('  MOMO_SUBSCRIPTION_KEY=your_key_here node scripts/create-momo-sandbox-user.js');
    process.exit(1);
  }

  const apiUser = crypto.randomUUID();

  console.log('Creating sandbox API user...');
  await axios.post(
    `${BASE_URL}/v1_0/apiuser`,
    { providerCallbackHost: 'miraggio-restaurant.example.com' }, // placeholder, not used in sandbox testing
    {
      headers: {
        'X-Reference-Id': apiUser,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Creating API key for that user...');
  const keyResponse = await axios.post(
    `${BASE_URL}/v1_0/apiuser/${apiUser}/apikey`,
    {},
    {
      headers: {
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY
      }
    }
  );

  console.log('\nDone! Add these to backend/.env:\n');
  console.log(`MOMO_SUBSCRIPTION_KEY=${SUBSCRIPTION_KEY}`);
  console.log(`MOMO_API_USER=${apiUser}`);
  console.log(`MOMO_API_KEY=${keyResponse.data.apiKey}`);
  console.log(`MOMO_TARGET_ENVIRONMENT=sandbox`);
  console.log(`MOMO_BASE_URL=${BASE_URL}`);
}

main().catch(err => {
  console.error('Failed:', err.response?.data || err.message);
  process.exit(1);
});
