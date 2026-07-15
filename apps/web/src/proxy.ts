import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isPublicPath = path === "/login";
  const isOnboardingPath = path === "/onboarding";

  const token = request.cookies.get("authToken")?.value || "";
  const onboardingComplete =
    request.cookies.get("onboardingComplete")?.value === "true";

  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicPath && token) {
    if (!onboardingComplete) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    token &&
    !onboardingComplete &&
    !isOnboardingPath &&
    !path.startsWith("/api")
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (token && onboardingComplete && isOnboardingPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
