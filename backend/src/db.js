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

// An idle client losing its connection (Postgres restart, managed-DB
// failover) emits 'error' on the pool; with no listener Node treats it as
// unhandled and exits. The pool already discards that client, so log and
// carry on — the next query opens a fresh connection.
pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});

module.exports = pool;