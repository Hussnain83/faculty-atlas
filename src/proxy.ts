import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = ["/login", "/signup", "/forgot"];

/**
 * Runs before every page request:
 * 1. Refreshes the Supabase session cookie so people stay signed in.
 * 2. Sends signed-out visitors to /login (an optimistic check; pages and actions re-check on the server).
 * 3. Sends signed-in people away from /login. /signup and /forgot stay open because
 *    activation and reset continue after the email code signs the person in.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, String(v)));
      },
    },
  });

  // getUser() asks Supabase whether the session is still valid. A local token check alone can
  // disagree with the server (e.g. after a password change revokes the session), which would
  // bounce the browser between /login and the app forever.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);
  const path = request.nextUrl.pathname;
  const onAuthPage = AUTH_PAGES.some((p) => path === p || path.startsWith(`${p}/`));

  const redirectTo = (target: URL) => {
    const res = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!signedIn && !onAuthPage) {
    const target = new URL("/login", request.url);
    if (path !== "/") target.searchParams.set("next", path + request.nextUrl.search);
    return redirectTo(target);
  }
  if (signedIn && path === "/login") {
    return redirectTo(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
