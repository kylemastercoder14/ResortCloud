import { Checkout } from "@polar-sh/nextjs";
import { getPolarServer } from "@/lib/subscription/polar";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  successUrl:
    process.env.POLAR_SUCCESS_URL ??
    `${appUrl}/api/polar/checkout-success`,
  returnUrl: process.env.POLAR_RETURN_URL ?? `${appUrl}/pricing`,
  server: getPolarServer(),
  theme: "light",
});