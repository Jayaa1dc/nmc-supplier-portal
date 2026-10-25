import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';

type SetAllArgs = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0];

/**
 * Refreshes the Supabase session cookie on every /admin request and redirects
 * anonymous visitors to the login page. Role checks (is_admin) happen in the
 * (admin) layout and again in the database through RLS, so this is only a gate.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: SetAllArgs) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/admin-login', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
