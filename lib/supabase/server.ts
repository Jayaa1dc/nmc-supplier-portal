import 'server-only';
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';

type SetAllArgs = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0];
import { cookies } from 'next/headers';

/** Supabase client bound to the signed-in user's cookie session (respects RLS). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet: SetAllArgs) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component; the middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
