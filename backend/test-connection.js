require('dotenv').config();
const { Pool } = require('pg');

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO (missing!)');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const dbInfo = await pool.query('select current_database(), inet_server_addr()');
  console.log('Connected to database:', dbInfo.rows[0]);

  const insertResult = await pool.query(
    `insert into orders (order_number, customer_name, delivery_type, items)
     values ($1, $2, 'pickup', '[]'::jsonb) returning id, order_number`,
    [999, 'CONNECTION TEST']
  );
  console.log('Test row inserted:', insertResult.rows[0]);

  const check = await pool.query('select count(*) from orders');
  console.log('Total rows in orders table right now:', check.rows[0].count);

  await pool.end();
}

main().catch(err => {
  console.error('CONNECTION FAILED:', err.message);
  process.exit(1);
});
