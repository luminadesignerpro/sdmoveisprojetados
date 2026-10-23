const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkData() {
    const { data, count, error } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error('Error fetching service_orders:', error.message);
    } else {
        console.log('Total service orders:', count);
    }
}

checkData();
