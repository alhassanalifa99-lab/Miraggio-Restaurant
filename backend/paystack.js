// Minimal client for the Paystack Transactions API.
// Docs: https://paystack.com/docs/api/transaction/
//
// Required environment variable (see .env.example):
//   PAYSTACK_SECRET_KEY - from your Paystack dashboard (Settings → API Keys & Webhooks)
//   Use the "sk_test_..." key while testing, "sk_live_..." once your client's
//   account is fully verified and live.

const axios = require('axios');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const BASE_URL = 'https://api.paystack.co';

function assertConfigured() {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack is not configured yet. Set PAYSTACK_SECRET_KEY in backend/.env');
  }
}

function client() {
  assertConfigured();
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  });
}

// Starts a payment. amountGHS is a normal decimal amount (e.g. 45.00) —
// Paystack requires the smallest currency unit (pesewas), so this
// multiplies by 100 internally. metadata can hold arbitrary JSON that
// Paystack hands back unchanged when the transaction is verified — this is
// how we reconstruct the order without a database row existing yet.
async function initializeTransaction({ email, amountGHS, metadata, callbackUrl }) {
  const response = await client().post('/transaction/initialize', {
    email,
    amount: Math.round(amountGHS * 100),
    currency: 'GHS',
    callback_url: callbackUrl,
    metadata
  });

  return response.data.data; // { authorization_url, access_code, reference }
}

// Call this after the customer is redirected back, to confirm the payment
// actually succeeded before creating the order.
async function verifyTransaction(reference) {
  const response = await client().get(`/transaction/verify/${encodeURIComponent(reference)}`);
  return response.data.data; // { status: 'success' | 'failed' | 'abandoned', amount, metadata, ... }
}

module.exports = { initializeTransaction, verifyTransaction };
