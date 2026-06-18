import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_KEY.length > 10;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isPublicPath =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/login") ||
    // Allow all static image/media files
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff|avif)$/i) !== null ||
    pathname.match(/\.(css|js|woff|woff2|ttf|eot)$/i) !== null;

  if (isPublicPath) return NextResponse.next({ request });

  // Bypass auth jika Supabase belum dikonfigurasi
  if (!supabaseConfigured) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff|avif|css|js|woff|woff2|ttf|eot)$).*)"],
};
