const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

function getEnvOrDefault(value, fallback) {
  const trimmed = value && value.trim();
  if (!trimmed) return fallback;

  const placeholders = ['USER', 'PASSWORD', 'HOST', 'PORT', 'DBNAME'];
  if (placeholders.some((token) => trimmed.includes(token))) return fallback;

  return trimmed;
}

(async () => {
  const sql = fs.readFileSync('db/schema.sql', 'utf8');
  const connectionString = getEnvOrDefault(
    process.env.DATABASE_URL,
    'postgres://stock:stock@localhost:5432/stocktrackr'
  );
  const client = new Client({ connectionString });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('DB schema applied.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
