import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Common connection strings for Supabase
const stringsToTry = [
    "postgresql://postgres.ducfogpyomhrmhyfzdxf:nglwscakhhdhelhbqkyb@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
    "postgresql://postgres.ducfogpyomhrmhyfzdxf:nglwscakhhdhelhbqkyb@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
    "postgresql://postgres:nglwscakhhdhelhbqkyb@db.ducfogpyomhrmhyfzdxf.supabase.co:5432/postgres",
    "postgresql://postgres:nglwscakhhdhelhbqkyb@db.ducfogpyomhrmhyfzdxf.supabase.co:6543/postgres"
];

async function runMigration() {
    const sqlPath = path.join(__dirname, 'create_app_users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    for (const connectionString of stringsToTry) {
        console.log("Trying connection string:", connectionString.replace(/([:]).*?([@])/, "$1***$2"));
        let client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });

        try {
            await client.connect();
            console.log("Connected successfully!");
            console.log("Executing migration script...");
            await client.query(sql);
            console.log("Migration executed successfully! The app_users table is ready.");
            await client.end();
            return;
        } catch (err) {
            console.error("Connection attempt failed:", err.message);
            try { await client.end(); } catch (e) { }
        }
    }
}

runMigration().catch(console.error);
