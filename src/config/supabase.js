const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;

// Accept the service/secret key under either env var name
const serviceKey =
  process.env.SUPABASE_JWT_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

// Accept the anon/publishable key under either env var name
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    'Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_JWT_SECRET (or SUPABASE_SERVICE_ROLE_KEY).'
  );
}

// Admin client — uses service/secret key, bypasses RLS
// Never expose this to the frontend
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client — used for user-facing auth operations (signUp, signIn)
const supabaseAnon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabase, supabaseAnon };
