const { Pool, types } = require('pg');

// By default, node-postgres returns NUMERIC/DECIMAL columns (price, fee,
// total_amount, etc.) as STRINGS to avoid floating-point precision loss on
// huge numbers. For this app's simple GHS amounts, that's not a concern,
// and the frontend calls .toFixed(2) on these values — which only exists
// on numbers, not strings. This line makes numeric columns come back as
// real JS numbers everywhere in the app, avoiding that crash.
types.setTypeParser(1700, (val) => parseFloat(val)); // 1700 = OID for "numeric"

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL. Set it in backend/.env to your Neon connection string.');
}

// Neon requires SSL. The pg driver needs this flag set explicitly outside
// of local development, where NODE_ENV usually isn't "development".
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
