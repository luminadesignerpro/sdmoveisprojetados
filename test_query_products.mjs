import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nglwscakhhdhelhbqkyb.supabase.co";
const supabaseKey = "sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2";

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing products table...");
    const { data: pData, error: pErr } = await supabase.from('products').select('*').limit(1);
    console.log("Products result:", pErr ? `Error: ${pErr.message}` : `Success! Rows: ${pData.length}`);

    console.log("Testing inventory_items table...");
    const { data: iData, error: iErr } = await supabase.from('inventory_items').select('*').limit(1);
    console.log("Inventory_items result:", iErr ? `Error: ${iErr.message}` : `Success! Rows: ${iData.length}`);

    console.log("Testing itens_projeto table...");
    const { data: itData, error: itErr } = await supabase.from('itens_projeto').select('*').limit(1);
    console.log("Itens_projeto result:", itErr ? `Error: ${itErr.message}` : `Success! Rows: ${itData.length}`);
}

test().catch(console.error);
