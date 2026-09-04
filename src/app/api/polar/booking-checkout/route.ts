import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPolarClient, getPolarServer } from "@/lib/subscription/polar";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function firstParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? "";
}

function appendCheckoutContext(target: URL, source: URL) {
  for (const key of [
    "title",
    "location",
    "price",
    "guests",
    "image",
    "checkIn",
    "checkOut",
    "tenantProfileId",
    "operatorName",
    "ownerName",
  ]) {
    const value = source.searchParams.get(key);

    if (value) target.searchParams.set(key, value);
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const returnUrl = new URL("/checkout", appUrl);
  appendCheckoutContext(returnUrl, requestUrl);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session.user.email) {
    returnUrl.searchParams.set("checkout", "auth-required");
    return NextResponse.redirect(returnUrl);
  }

  const appUser = await prisma.appUser.findUnique({
    where: {
      authUserId: session.user.id,
    },
    select: {
      role: true,
    },
  });

  if (appUser?.role !== "CUSTOMER") {
    returnUrl.searchParams.set("checkout", "customer-required");
    return NextResponse.redirect(returnUrl);
  }

  const productId = process.env.POLAR_PRODUCT_RESORT_BOOKING;

  if (!process.env.POLAR_ACCESS_TOKEN || !productId) {
    returnUrl.searchParams.set("checkout", "polar-missing-config");
    return NextResponse.redirect(returnUrl);
  }

  const amountMinor = Number(firstParam(requestUrl, "amount"));

  if (!Number.isFinite(amountMinor) || amountMinor < 3500) {
    returnUrl.searchParams.set("checkout", "invalid-amount");
    return NextResponse.redirect(returnUrl);
  }

  const title = firstParam(requestUrl, "title") || "ResortCloud booking";
  const tenantProfileId = firstParam(requestUrl, "tenantProfileId");
  const operatorName = firstParam(requestUrl, "operatorName");
  const ownerName = firstParam(requestUrl, "ownerName");
  const messageToHost = firstParam(requestUrl, "messageToHost");
  const successUrl = new URL("/checkout/success", appUrl);
  appendCheckoutContext(successUrl, requestUrl);
  successUrl.searchParams.set("checkoutId", "{CHECKOUT_ID}");

  const metadata: Record<string, string | number> = {
    kind: "resort_booking",
    title: title.slice(0, 120),
    amountPhp: amountMinor / 100,
    source: "checkout",
  };

  if (tenantProfileId) metadata.tenantProfileId = tenantProfileId;
  if (operatorName) metadata.operatorName = operatorName.slice(0, 120);
  if (ownerName) metadata.ownerName = ownerName.slice(0, 120);

  if (messageToHost) {
    metadata.messageToHost = messageToHost.slice(0, 500);
  }

  try {
    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      products: [productId],
      prices: {
        [productId]: [
          {
            amountType: "fixed",
            priceCurrency: "php",
            priceAmount: amountMinor,
          },
        ],
      },
      currency: "php",
      customerEmail: session.user.email,
      customerName: session.user.name,
      externalCustomerId: session.user.id,
      metadata,
      successUrl: decodeURI(successUrl.toString()),
      returnUrl: decodeURI(returnUrl.toString()),
    });

    const redirectUrl = new URL(checkout.url);
    redirectUrl.searchParams.set("theme", "light");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error(error);
    returnUrl.searchParams.set("checkout", "polar-error");
    returnUrl.searchParams.set("polarServer", getPolarServer());
    return NextResponse.redirect(returnUrl);
  }
}
