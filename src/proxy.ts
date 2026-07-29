import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/accounts", "/reports", "/invoices", "/contacts", "/journal-entries", "/items", "/payments", "/aging", "/cost-centers", "/reviews", "/services"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname.startsWith("/api/auth") || pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === "/" || pathname === "/about" || pathname === "/contact") {
    return NextResponse.next();
  }

  const isProtected = protectedPaths.some(p => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("acc_auth_token")?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
