const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY must be set in .env");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("⚠️ Using SUPABASE_KEY instead of SUPABASE_SERVICE_ROLE_KEY. Row-level security may block inserts.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;