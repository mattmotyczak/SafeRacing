// db/apply.js
// Dependency-free migration runner for SafeRacing.
// Reads db/migrations/*.sql in filename order and executes each file
// sequentially against the live Neon database. Reuses the existing pg and
// dotenv dependencies — no new npm packages.
//
// Usage: node db/apply.js
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const migrationsDir = path.resolve('db', 'migrations');

// Pinned SSL strategy: the pool ssl option below is the single source of
// truth. Any sslmode parameter in DATABASE_URL is stripped first to avoid
// dual-source SSL configuration ambiguity.
const connectionString = (process.env.DATABASE_URL || '')
  .replace(/([?&])sslmode=[^&#]*(?=&|#|$)/gi, '$1')
  .replace(/[?&]$/, '');

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  let applied = 0;
  try {
    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`[APPLIED] ${file}`);
      applied += 1;
    }

    console.log(`[DONE] ${applied} migrations applied`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[ERROR] Migration failed:', err);
  process.exit(1);
});