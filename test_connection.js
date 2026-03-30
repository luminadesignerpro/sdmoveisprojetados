import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nglwscakhhdhelhbqkyb.supabase.co";
const supabaseKey = "sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2";

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing connection to nglwscakhhdhelhbqkyb...");
    const { data, error } = await supabase.from('employees').select('count');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Data:", data);
    }
}

test();
