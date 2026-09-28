// Initializes the local SQLite ledger from db/schema.sql.
// Safe to run multiple times (CREATE TABLE IF NOT EXISTS).

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(path.join(__dirname, '..', 'agent.config.json'), 'utf8'));
const dbPath = path.join(__dirname, '..', config.chain.db_path);
const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');

const db = new Database(dbPath);
const schema = readFileSync(schemaPath, 'utf8');
db.exec(schema);
db.close();

console.log(`Database initialized at ${dbPath}`);
