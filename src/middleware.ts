import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  if (process.env.SKIP_AUTH === "1") {
    return NextResponse.next();
  }
  const path = req.nextUrl.pathname;
  const isPublic = path === "/" || path === "";
  if (isPublic) {
    return NextResponse.next();
  }
  const isLoggedIn = !!req.auth;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/register");

  if (isAuthPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return Response.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|favicon.svg).*)"],
};
