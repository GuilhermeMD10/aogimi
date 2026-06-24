const { Pool } = require("pg");

// SSL policy: any non-local DATABASE_URL goes over TLS with the
// platform-provided certificate (rejectUnauthorized: false covers the
// self-signed certs common in managed Postgres). Local Postgres on
// localhost/127.0.0.1 connects in plaintext for dev convenience.
const url = process.env.DATABASE_URL;
const isLocal = !!url && (url.includes("localhost") || url.includes("127.0.0.1"));

const pool = new Pool({
  connectionString: url,
  ssl: url && !isLocal ? { rejectUnauthorized: false } : false,
});

module.exports = pool;