import { CustomerPortal } from "@polar-sh/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getPolarServer } from "@/lib/subscription/polar";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const portalHandler = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  getExternalCustomerId: async (request) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    return session?.user?.id ?? "";
  },
  returnUrl: process.env.POLAR_RETURN_URL ?? `${appUrl}/tenant/foundation/billing`,
  server: getPolarServer(),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/sign-in", appUrl));
  }

  return portalHandler(request);
}