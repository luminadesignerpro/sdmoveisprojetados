import pg from 'pg';

const stringsToTry = [
    "postgresql://postgres.nglwscakhhdhelhbqkyb:nglwscakhhdhelhbqkyb@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
    "postgresql://postgres.nglwscakhhdhelhbqkyb:nglwscakhhdhelhbqkyb@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
    "postgresql://postgres:nglwscakhhdhelhbqkyb@db.nglwscakhhdhelhbqkyb.supabase.co:5432/postgres",
    "postgresql://postgres:nglwscakhhdhelhbqkyb@db.nglwscakhhdhelhbqkyb.supabase.co:6543/postgres"
];

async function runAlter() {
    const sql = `ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS lunch_minutes INTEGER DEFAULT NULL;`;

    for (const connectionString of stringsToTry) {
        console.log("Trying connection string:", connectionString.replace(/([:]).*?([@])/, "$1***$2"));
        let client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });

        try {
            await client.connect();
            console.log("Connected successfully!");
            console.log("Adding lunch_minutes column...");
            await client.query(sql);
            console.log("Column added successfully!");
            await client.end();
            return;
        } catch (err) {
            console.error("Connection attempt failed:", err.message);
            try { await client.end(); } catch (e) { }
        }
    }
}

runAlter().catch(console.error);
