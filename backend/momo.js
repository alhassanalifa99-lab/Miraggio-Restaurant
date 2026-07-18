// Minimal client for the MTN MoMo Collections API (Request to Pay).
// Docs: https://momodeveloper.mtn.com
//
// Required environment variables (see .env.example):
//   MOMO_SUBSCRIPTION_KEY  - your Collections product's Primary Key from the portal
//   MOMO_API_USER          - a UUID you generate once (see scripts/create-momo-sandbox-user.js)
//   MOMO_API_KEY           - generated for that API user (also from that script)
//   MOMO_TARGET_ENVIRONMENT - "sandbox" while testing, "mtnghana" (or your country code) in production
//   MOMO_BASE_URL           - https://sandbox.momodeveloper.mtn.com while testing
//
// IMPORTANT: the MTN sandbox only accepts currency "EUR", regardless of your
// real currency. In production, switch MOMO_TARGET_ENVIRONMENT and use "GHS".

const axios = require('axios');

const BASE_URL = process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
const SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY;
const API_USER = process.env.MOMO_API_USER;
const API_KEY = process.env.MOMO_API_KEY;
const TARGET_ENVIRONMENT = process.env.MOMO_TARGET_ENVIRONMENT || 'sandbox';
const CURRENCY = TARGET_ENVIRONMENT === 'sandbox' ? 'EUR' : (process.env.MOMO_CURRENCY || 'GHS');

function assertConfigured() {
  if (!SUBSCRIPTION_KEY || !API_USER || !API_KEY) {
    throw new Error(
      'MoMo is not configured yet. Set MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, and MOMO_API_KEY in backend/.env'
    );
  }
}

// Step 3 of MTN's flow: exchange API user + API key for a short-lived access token.
async function getAccessToken() {
  assertConfigured();
  const credentials = Buffer.from(`${API_USER}:${API_KEY}`).toString('base64');

  const response = await axios.post(
    `${BASE_URL}/collection/token/`,
    {},
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY
      }
    }
  );

  return response.data.access_token;
}

// Kicks off a "Request to Pay" — this prompts the customer's phone for a MoMo PIN.
// Returns the referenceId you'll use to poll for status.
async function requestToPay({ amount, phoneNumber, externalId, payerMessage, payeeNote }) {
  assertConfigured();
  const accessToken = await getAccessToken();
  const referenceId = require('crypto').randomUUID();

  await axios.post(
    `${BASE_URL}/collection/v1_0/requesttopay`,
    {
      amount: String(amount),
      currency: CURRENCY,
      externalId: String(externalId),
      payer: {
        partyIdType: 'MSISDN',
        partyId: phoneNumber.replace(/^\+/, '') // MTN expects no leading +
      },
      payerMessage: payerMessage || 'Miraggio Restaurant order',
      payeeNote: payeeNote || 'Order payment'
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': TARGET_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  return referenceId;
}

// Poll this until status is no longer PENDING.
async function getTransactionStatus(referenceId) {
  assertConfigured();
  const accessToken = await getAccessToken();

  const response = await axios.get(
    `${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Target-Environment': TARGET_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY
      }
    }
  );

  return response.data; // { status: 'PENDING' | 'SUCCESSFUL' | 'FAILED', ... }
}

module.exports = { requestToPay, getTransactionStatus };
