import { createClient } from '@supabase/supabase-js';

/** Browser client. Used only to upload a file straight to Supabase Storage with a one-time signed token. */
export function createBrowserSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
