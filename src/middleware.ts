import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

// ─── In-memory sliding-window rate limiter ─────────────────────────────────
// Suitable for single-instance deployments. Resets on process restart.
const WINDOW_MS = 60_000;
const store = new Map<string, { count: number; resetAt: number }>();

function allow(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

function rateLimitResponse() {
  return new Response(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Middleware ────────────────────────────────────────────────────────────
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anon";

  const isApiRoute = nextUrl.pathname.startsWith("/api/");
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isSignupApiRoute = nextUrl.pathname === "/api/signup";
  const isPublicPage = ["/login", "/signup"].includes(nextUrl.pathname);

  // ── API routes ──────────────────────────────────────────────────────────
  // NextAuth handles its own routes — don't intercept
  if (isApiAuthRoute) return;

  // Signup endpoint: public but rate-limited by IP (5/min)
  if (isSignupApiRoute) {
    if (!allow(`signup:${ip}`, 5)) return rateLimitResponse();
    return;
  }

  // All other API routes: rate-limited by userId (60/min)
  // Do NOT redirect here — route handlers return their own 401s
  if (isApiRoute) {
    const identifier = req.auth?.user?.id ?? ip;
    if (!allow(`api:${identifier}`, 60)) return rateLimitResponse();
    return;
  }

  // ── Page routes ─────────────────────────────────────────────────────────
  if (isPublicPage) {
    if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
    return;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)", "/api/:path*"],
};
