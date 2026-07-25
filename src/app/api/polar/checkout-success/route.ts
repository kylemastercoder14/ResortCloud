import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getAppRedirectPath } from "@/lib/auth-redirect";
import { prisma } from "@/lib/prisma";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getFallbackPeriodEnd(billingCycle: "MONTHLY" | "YEARLY" | undefined) {
  const periodEnd = new Date();

  if (billingCycle === "YEARLY") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  return periodEnd;
}

function copyPolarReturnParams(source: URL, target: URL) {
  const checkoutId = source.searchParams.get("checkoutId");
  const customerSessionToken = source.searchParams.get("customer_session_token");

  target.searchParams.set("checkout", "success");

  if (checkoutId) {
    target.searchParams.set("checkoutId", checkoutId);
  }

  if (customerSessionToken) {
    target.searchParams.set("customer_session_token", customerSessionToken);
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    const signInUrl = new URL("/auth/sign-in", appUrl);
    copyPolarReturnParams(requestUrl, signInUrl);
    return NextResponse.redirect(signInUrl);
  }

  const appUser = await prisma.appUser.findUnique({
    where: {
      authUserId: session.user.id,
    },
    include: {
      tenantProfile: true,
    },
  });

  if (!appUser) {
    return NextResponse.redirect(new URL("/auth/sign-in", appUrl));
  }

  if (
    appUser.role === "TENANT" &&
    appUser.tenantProfile &&
    appUser.tenantProfile.subscriptionStatus === "PENDING" &&
    appUser.tenantProfile.subscriptionPlan !== "FREE_TRIAL"
  ) {
    await prisma.tenantProfile.update({
      where: {
        appUserId: session.user.id,
      },
      data: {
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd:
          appUser.tenantProfile.currentPeriodEnd ??
          getFallbackPeriodEnd(appUser.tenantProfile.billingCycle),
      },
    });

    appUser.tenantProfile.subscriptionStatus = "ACTIVE";
  }

  if (appUser.role === "TENANT" && appUser.tenantProfile?.onboardingStatus !== "COMPLETED") {
    const onboardingUrl = new URL("/auth/onboarding", appUrl);
    copyPolarReturnParams(requestUrl, onboardingUrl);
    return NextResponse.redirect(onboardingUrl);
  }

  const redirectPath = getAppRedirectPath({
    role: appUser.role,
    tenantOnboardingStatus: appUser.tenantProfile?.onboardingStatus ?? null,
  });
  const redirectUrl = new URL(redirectPath, appUrl);
  copyPolarReturnParams(requestUrl, redirectUrl);

  return NextResponse.redirect(redirectUrl);
}