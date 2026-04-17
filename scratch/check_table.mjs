import pg from 'pg';

const connectionString = "postgresql://postgres:nglwscakhhdhelhbqkyb@db.ducfogpyomhrmhyfzdxf.supabase.co:5432/postgres";

async function checkTable() {
    const client = new pg.Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'itens_projeto');");
        console.log("Table 'itens_projeto' exists:", res.rows[0].exists);
    } catch (err) {
        console.error("Error checking table:", err.message);
    } finally {
        await client.end();
    }
}

checkTable();
